use futures::future::{join, join_all};
use serde_json::{json, Value};

use crate::agent::build_request;
use crate::error::{Result, SddError};
use crate::hooks::HookRegistry;
use crate::integrations::WorkflowDocs;
use crate::traits::LlmClient;
use crate::types::*;

// ── Helpers ───────────────────────────────────────────────────────────────

/// Record a completed phase run into the change, check the token budget,
/// version the artifact, and mark the phase completed (idempotent).
fn commit_phase(
    change: &mut SddChange,
    phase: SddPhase,
    result: serde_json::Value,
) -> Result<()> {
    let total = result["usage"]["total_tokens"].as_u64().unwrap_or(0) as u32;
    let prompt = result["usage"]["prompt_tokens"].as_u64().unwrap_or(0) as u32;
    let completion = result["usage"]["completion_tokens"].as_u64().unwrap_or(0) as u32;

    // Budget check before committing
    if let Some(budget) = change.token_budget {
        let used = change.tokens_used() + total;
        if used > budget {
            return Err(SddError::BudgetExceeded { budget, used });
        }
    }

    // Append usage record
    change.usage_history.push(PhaseUsage {
        phase: phase.as_str().into(),
        prompt_tokens: prompt,
        completion_tokens: completion,
        total_tokens: total,
    });

    // Append versioned artifact
    let versions = change.artifact_history.entry(phase.as_str().into()).or_default();
    let version = versions.len() as u32 + 1;
    versions.push(ArtifactVersion { version, content: result.clone(), tokens_used: total });

    // Latest artifact (overwrite)
    change.artifacts.insert(phase.as_str().into(), result);

    // Mark completed (idempotent)
    if !change.phases_completed.contains(&phase) {
        change.phases_completed.push(phase);
    }

    Ok(())
}

/// Parse verify outcome using structured DoD parsing with legacy fallback.
fn parse_verify_outcome(result: &Value, dod: &DefinitionOfDone) -> (bool, DodReport) {
    let text = result["result"].as_str().unwrap_or("");
    let report = DodReport::parse(text, dod);
    let passed = report.passed();
    (passed, report)
}

/// Extract a short failure summary from a Verify result for retry context.
fn verify_failure_summary(result: &Value) -> String {
    result["result"]
        .as_str()
        .map(|s| s.chars().take(600).collect::<String>())
        .unwrap_or_else(|| "Verify failed with no details".into())
}

// ── SDD Pipeline ──────────────────────────────────────────────────────────

/// The SDD pipeline orchestrator — drives changes through all phases.
/// Generic over `LlmClient` so any runtime can provide its own implementation.
pub struct SddPipeline<C: LlmClient> {
    client: C,
    hooks: Option<HookRegistry>,
    workflow_docs: Option<WorkflowDocs>,
    /// How many times to retry Apply+Verify when Verify returns FAIL.
    /// Set to 0 to disable retries. Defaults to 2.
    verify_retries: u32,
    /// Optional spec validation rules. When set, the pipeline validates the
    /// spec artifact after the Spec phase completes, before Tasks begins.
    spec_validation_rules: Option<Vec<crate::validate::ValidationRule>>,
}

impl<C: LlmClient> SddPipeline<C> {
    pub fn new(client: C) -> Self {
        Self { client, hooks: None, workflow_docs: None, verify_retries: 0, spec_validation_rules: None }
    }

    pub fn with_hooks(mut self, hooks: HookRegistry) -> Self {
        self.hooks = Some(hooks);
        self
    }

    pub fn with_workflow_docs(mut self, docs: WorkflowDocs) -> Self {
        self.workflow_docs = Some(docs);
        self
    }

    /// Enable spec validation gate: after Spec phase completes, run
    /// these rules against the spec artifact. Fails with `ValidationFailed`
    /// if any rule fails.
    pub fn with_spec_validation(mut self, rules: Vec<crate::validate::ValidationRule>) -> Self {
        self.spec_validation_rules = Some(rules);
        self
    }

    /// Override the maximum Apply+Verify retry count (default: 2).
    pub fn max_verify_retries(mut self, n: u32) -> Self {
        self.verify_retries = n;
        self
    }

    /// Run a single SDD phase.
    async fn run_phase(
        &self,
        phase: SddPhase,
        change: &SddChange,
        additional_context: &str,
    ) -> Result<Value> {
        // Fire pre-phase hook
        if let Some(ref hooks) = self.hooks {
            let input = HookInput {
                event: HookEvent::PrePhase,
                phase_name: Some(phase.as_str().into()),
                tool_name: None,
                tool_input: None,
                tool_output: None,
                session_id: None,
                agent_name: Some(format!("sdd-{}", phase.as_str())),
                error: None,
            };
            let output = hooks.fire(&input);
            if !output.allow {
                return Err(SddError::PhaseBlocked {
                    phase: phase.as_str().into(),
                    reason: output.deny_reason.unwrap_or_default(),
                });
            }
        }

        // Select model based on phase
        let model = match phase {
            SddPhase::Explore | SddPhase::Spec | SddPhase::Design | SddPhase::Verify => {
                DeepSeekModel::Reasoner
            }
            _ => DeepSeekModel::Chat,
        };

        let system_prompt = self.phase_system_prompt(phase);

        let dod_section = if phase == SddPhase::Verify {
            change.dod().to_prompt_section()
        } else {
            String::new()
        };

        let user_prompt = format!(
            "## Change: {}\n\n{}\n\n## Completed Phases\n{}\n\n## Existing Artifacts\n{}\n\n## Additional Context\n{}{}",
            change.name,
            change.description,
            change.phases_completed.iter().map(|p| p.as_str()).collect::<Vec<_>>().join(", "),
            serde_json::to_string_pretty(&change.artifacts).unwrap_or_default(),
            additional_context,
            dod_section,
        );

        let effort = match phase {
            SddPhase::Explore | SddPhase::Spec | SddPhase::Design => EffortLevel::Max,
            SddPhase::Verify => EffortLevel::High,
            _ => EffortLevel::Medium,
        };

        let request = build_request(
            &model,
            vec![system_msg(&system_prompt), user_msg(&user_prompt)],
            None,
            &effort,
        );

        let response = self.client.chat(&request).await?;

        let result = response.choices.first()
            .map(|c| c.message.content.as_str().to_string())
            .unwrap_or_default();

        // Fire post-phase hook
        if let Some(ref hooks) = self.hooks {
            let input = HookInput {
                event: HookEvent::PostPhase,
                phase_name: Some(phase.as_str().into()),
                tool_name: None,
                tool_input: None,
                tool_output: Some(json!({ "result": &result })),
                session_id: None,
                agent_name: Some(format!("sdd-{}", phase.as_str())),
                error: None,
            };
            hooks.fire(&input);
        }

        Ok(json!({
            "phase": phase.as_str(),
            "model": model.as_str(),
            "result": result,
            "usage": response.usage,
        }))
    }

    fn phase_system_prompt(&self, phase: SddPhase) -> String {
        let base = match phase {
            SddPhase::Explore => "You are the SDD Explorer. Investigate the idea thoroughly. Analyze the codebase, consider trade-offs, and recommend an approach. Output a structured exploration report.",
            SddPhase::Propose => "You are the SDD Proposer. Create a change proposal with: Intent, Scope (in/out), Approach, Affected Areas, Risks, Rollback Plan, Success Criteria.",
            SddPhase::Spec => "You are the SDD Spec Writer. Write delta specifications with ADDED/MODIFIED/REMOVED requirements using RFC 2119 keywords. Every requirement needs Given/When/Then scenarios.",
            SddPhase::Design => "You are the SDD Designer. Create technical design with: Architecture Decisions (choice + alternatives + rationale), Data Flow, File Changes, Interfaces, Testing Strategy.",
            SddPhase::Tasks => "You are the SDD Tasker. Break the change into phased implementation tasks. Each task must be specific (file path), actionable, verifiable, and small.",
            SddPhase::Apply => "You are the SDD Applier. Implement the assigned tasks following specs and design. Match project coding conventions. Mark tasks [x] as complete.",
            SddPhase::Verify => "You are the SDD Verifier. Check Completeness (all tasks done?), Correctness (specs matched?), Coherence (design followed?), Testing (coverage?). Output PASS/FAIL verdict.",
            SddPhase::Archive => "You are the SDD Archiver. Merge delta specs into main specs (ADDED→append, MODIFIED→replace, REMOVED→delete). Archive the change folder.",
        };

        match &self.workflow_docs {
            Some(docs) => docs.enrich(base, phase.as_str()),
            None => base.into(),
        }
    }

    /// If spec validation rules are configured, validate the spec artifact.
    /// Called right after Spec phase commits, before Tasks can begin.
    fn run_spec_validation_gate(&self, change: &SddChange) -> Result<()> {
        if let Some(ref rules) = self.spec_validation_rules {
            let spec_text = change.artifacts.get("spec")
                .and_then(|v| v["result"].as_str())
                .unwrap_or("");
            let result = crate::validate::validate_spec(spec_text, rules);
            if !result.passed {
                let failed: Vec<String> = result.results.iter()
                    .filter(|r| !r.passed)
                    .map(|r| r.rule.clone())
                    .collect();
                let details = result.warnings.join("; ");
                return Err(SddError::ValidationFailed { rules_failed: failed, details });
            }
        }
        Ok(())
    }

    // ── Pipeline Execution Modes ──────────────────────────────────────────

    /// Execute a single phase with dependency validation.
    /// Commits usage, artifact history, and phase completion into `change`.
    pub async fn execute_phase(
        &self,
        phase: SddPhase,
        change: &mut SddChange,
        context: &str,
    ) -> Result<Value> {
        for dep in phase.dependencies() {
            if !change.phases_completed.contains(dep) {
                return Err(SddError::DependencyNotMet {
                    phase: phase.as_str().into(),
                    dependency: dep.as_str().into(),
                });
            }
        }

        let result = self.run_phase(phase, change, context).await?;
        commit_phase(change, phase, result.clone())?;

        // Validation gate: after Spec completes, validate before Tasks can proceed
        if phase == SddPhase::Spec {
            self.run_spec_validation_gate(change)?;
        }

        Ok(result)
    }

    /// Execute spec + design in parallel (the key SDD optimization).
    pub async fn execute_parallel_spec_design(
        &self,
        change: &SddChange,
        context: &str,
    ) -> Result<(Value, Value)> {
        if !change.phases_completed.contains(&SddPhase::Propose) {
            return Err(SddError::DependencyNotMet {
                phase: "spec+design".into(),
                dependency: "propose".into(),
            });
        }

        let spec_future = self.run_phase(SddPhase::Spec, change, context);
        let design_future = self.run_phase(SddPhase::Design, change, context);

        let (spec_result, design_result) = join(spec_future, design_future).await;

        Ok((spec_result?, design_result?))
    }

    /// Fast-forward: run all planning phases (propose → spec ⟂ design → tasks).
    pub async fn fast_forward(
        &self,
        change: &mut SddChange,
        context: &str,
    ) -> Result<Value> {
        let mut results: Vec<Value> = Vec::new();

        // Phase 1: Propose (if not done)
        if !change.phases_completed.contains(&SddPhase::Propose) {
            let r = self.run_phase(SddPhase::Propose, change, context).await?;
            results.push(r.clone());
            commit_phase(change, SddPhase::Propose, r)?;
        }

        // Phase 2: Spec + Design in parallel
        if !change.phases_completed.contains(&SddPhase::Spec)
            || !change.phases_completed.contains(&SddPhase::Design)
        {
            let (spec, design) = self.execute_parallel_spec_design(change, context).await?;
            results.push(spec.clone());
            results.push(design.clone());
            commit_phase(change, SddPhase::Spec, spec)?;
            commit_phase(change, SddPhase::Design, design)?;

            // Validation gate after Spec
            self.run_spec_validation_gate(change)?;
        }

        // Phase 3: Tasks
        if !change.phases_completed.contains(&SddPhase::Tasks) {
            let r = self.run_phase(SddPhase::Tasks, change, context).await?;
            results.push(r.clone());
            commit_phase(change, SddPhase::Tasks, r)?;
        }

        Ok(json!({
            "mode": "fast-forward",
            "phases_completed": change.phases_completed.iter().map(|p| p.as_str()).collect::<Vec<_>>(),
            "tokens_used": change.tokens_used(),
            "results": results,
        }))
    }

    /// Continue: detect all ready phases in DAG and execute them (parallel when possible).
    pub async fn continue_change(
        &self,
        change: &mut SddChange,
        context: &str,
    ) -> Result<Value> {
        let ready = detect_all_ready_phases(change);

        if ready.is_empty() {
            return Ok(json!({
                "mode": "continue",
                "message": "All phases complete. Change is ready for archive.",
                "phases_completed": change.phases_completed.iter().map(|p| p.as_str()).collect::<Vec<_>>(),
                "tokens_used": change.tokens_used(),
            }));
        }

        if ready.len() == 1 {
            let phase = ready[0];
            // execute_phase already commits usage/artifacts/phases_completed
            let result = self.execute_phase(phase, change, context).await?;
            let executed = [phase.as_str()];

            return Ok(json!({
                "mode": "continue",
                "phases_executed": executed,
                "phases_completed": change.phases_completed.iter().map(|p| p.as_str()).collect::<Vec<_>>(),
                "tokens_used": change.tokens_used(),
                "results": [result],
            }));
        }

        // Multiple phases ready — run them all in parallel
        let futures: Vec<_> = ready.iter()
            .map(|&phase| self.run_phase(phase, change, context))
            .collect();

        let outcomes = join_all(futures).await;
        let mut results = Vec::new();
        let mut executed = Vec::new();

        for (phase, outcome) in ready.iter().zip(outcomes) {
            let result = outcome?;
            executed.push(phase.as_str());
            results.push(result.clone());
            commit_phase(change, *phase, result)?;
        }

        Ok(json!({
            "mode": "continue",
            "phases_executed": executed,
            "phases_completed": change.phases_completed.iter().map(|p| p.as_str()).collect::<Vec<_>>(),
            "tokens_used": change.tokens_used(),
            "results": results,
        }))
    }

    /// Execute the full pipeline end-to-end (autonomous mode).
    ///
    /// When Verify returns FAIL the pipeline automatically re-runs Apply (with the
    /// failure summary injected as context) and Verify again, up to
    /// `max_verify_retries` times. Returns `Err(SddError::VerifyFailed)` if all
    /// attempts fail.
    pub async fn full_pipeline(
        &self,
        change: &mut SddChange,
        context: &str,
    ) -> Result<Value> {
        let mut results: Vec<Value> = Vec::new();

        // Propose
        if !change.phases_completed.contains(&SddPhase::Propose) {
            let r = self.run_phase(SddPhase::Propose, change, context).await?;
            results.push(r.clone());
            commit_phase(change, SddPhase::Propose, r)?;
        }

        // Spec + Design (parallel)
        if !change.phases_completed.contains(&SddPhase::Spec)
            || !change.phases_completed.contains(&SddPhase::Design)
        {
            let (spec, design) = self.execute_parallel_spec_design(change, context).await?;
            results.push(spec.clone());
            results.push(design.clone());
            commit_phase(change, SddPhase::Spec, spec)?;
            commit_phase(change, SddPhase::Design, design)?;

            // Validation gate after Spec
            self.run_spec_validation_gate(change)?;
        }

        // Tasks
        if !change.phases_completed.contains(&SddPhase::Tasks) {
            let r = self.run_phase(SddPhase::Tasks, change, context).await?;
            results.push(r.clone());
            commit_phase(change, SddPhase::Tasks, r)?;
        }

        // Apply + Verify (with retry on FAIL)
        let total_attempts = self.verify_retries + 1;
        let mut verify_passed = false;

        for attempt in 1..=total_attempts {
            // Apply — run every attempt; first time only if not done
            if attempt == 1 && change.phases_completed.contains(&SddPhase::Apply) {
                // Already applied (resuming partial pipeline) — skip
            } else {
                let apply_ctx = if attempt > 1 {
                    // Inject previous failure into context
                    let failure = change.artifacts.get("verify")
                        .map(verify_failure_summary)
                        .unwrap_or_default();
                    format!(
                        "{context}\n\n## Previous Verify Failure (attempt {prev})\n\
                         Fix the issues below before re-applying:\n{failure}",
                        prev = attempt - 1
                    )
                } else {
                    context.to_string()
                };

                let r = self.run_phase(SddPhase::Apply, change, &apply_ctx).await?;
                results.push(r.clone());
                commit_phase(change, SddPhase::Apply, r)?;
            }

            // Verify
            let r = self.run_phase(SddPhase::Verify, change, context).await?;
            let dod = change.dod();
            let (passed, dod_report) = parse_verify_outcome(&r, &dod);
            verify_passed = passed;
            results.push(r.clone());
            commit_phase(change, SddPhase::Verify, r)?;

            // Store DoD report as artifact
            if let Ok(report_json) = serde_json::to_value(&dod_report) {
                change.artifacts.insert("dod_report".into(), report_json);
            }

            if verify_passed {
                break;
            }
        }

        if !verify_passed {
            let reason = change.artifacts.get("verify")
                .map(verify_failure_summary)
                .unwrap_or_else(|| "No verify artifact".into());
            return Err(SddError::VerifyFailed { attempts: total_attempts, reason });
        }

        // Archive
        if !change.phases_completed.contains(&SddPhase::Archive) {
            let r = self.run_phase(SddPhase::Archive, change, context).await?;
            results.push(r.clone());
            commit_phase(change, SddPhase::Archive, r)?;
        }

        Ok(json!({
            "mode": "full-pipeline",
            "change": change.name,
            "phases_completed": change.phases_completed.iter().map(|p| p.as_str()).collect::<Vec<_>>(),
            "total_phases": results.len(),
            "tokens_used": change.tokens_used(),
            "usage_by_phase": change.usage_history,
            "results": results,
        }))
    }
}

/// Detect the next phase to execute based on the dependency DAG.
pub fn detect_next_phase(change: &SddChange) -> Option<SddPhase> {
    detect_all_ready_phases(change).into_iter().next()
}

/// Detect ALL phases whose dependencies are met and can run concurrently.
/// Returns e.g. `[Spec, Design]` when only Propose is completed.
pub fn detect_all_ready_phases(change: &SddChange) -> Vec<SddPhase> {
    let all_phases = [
        SddPhase::Propose,
        SddPhase::Spec,
        SddPhase::Design,
        SddPhase::Tasks,
        SddPhase::Apply,
        SddPhase::Verify,
        SddPhase::Archive,
    ];

    all_phases.iter()
        .filter(|phase| {
            !change.phases_completed.contains(phase)
                && phase.dependencies().iter().all(|dep| change.phases_completed.contains(dep))
        })
        .copied()
        .collect()
}
