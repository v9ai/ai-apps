use std::collections::HashMap;

use crate::types::*;

// ── Hook Callback Type ────────────────────────────────────────────────────

/// A hook callback — sync closure that inspects and optionally modifies behavior.
/// Returns HookOutput with allow/deny/context injection.
pub type HookCallback = Box<dyn Fn(&HookInput) -> HookOutput + Send + Sync>;

/// A hook matcher — pairs a pattern (for tool name matching) with callbacks.
pub struct HookMatcher {
    /// Pipe-delimited pattern to match against tool names (for Pre/PostToolUse hooks)
    pub matcher: Option<String>,
    /// Callbacks to run when matcher matches (or always if matcher is None)
    pub hooks: Vec<HookCallback>,
}

// ── Hook Registry ─────────────────────────────────────────────────────────

/// Registry of hooks keyed by event type.
/// Mirrors the Anthropic SDK's `options.hooks` configuration.
pub struct HookRegistry {
    hooks: HashMap<HookEvent, Vec<HookMatcher>>,
}

impl Default for HookRegistry {
    fn default() -> Self {
        Self::new()
    }
}

impl HookRegistry {
    pub fn new() -> Self {
        Self { hooks: HashMap::new() }
    }

    /// Register a hook matcher for a specific event.
    pub fn on(&mut self, event: HookEvent, matcher: HookMatcher) {
        self.hooks.entry(event).or_default().push(matcher);
    }

    /// Fire all hooks for an event. Returns combined output.
    /// If any hook denies, the combined result denies.
    /// Additional context is concatenated.
    pub fn fire(&self, input: &HookInput) -> HookOutput {
        let matchers = match self.hooks.get(&input.event) {
            Some(m) => m,
            None => return HookOutput::default(),
        };

        let mut combined = HookOutput::default();
        let mut contexts: Vec<String> = Vec::new();

        for matcher in matchers {
            if let Some(ref pattern) = matcher.matcher {
                if let Some(ref tool_name) = input.tool_name {
                    let tool_name_str: &str = tool_name.as_str();
                    if !pattern.split('|').any(|p: &str| p == tool_name_str) {
                        continue;
                    }
                } else {
                    continue;
                }
            }

            for hook in &matcher.hooks {
                let output = hook(input);

                if !output.allow {
                    combined.allow = false;
                    if let Some(reason) = output.deny_reason {
                        combined.deny_reason = Some(reason);
                    }
                }

                if let Some(ctx_str) = output.additional_context {
                    contexts.push(ctx_str);
                }

                if let Some(modified) = output.modified_input {
                    combined.modified_input = Some(modified);
                }
            }
        }

        if !contexts.is_empty() {
            combined.additional_context = Some(contexts.join("\n"));
        }

        combined
    }

    /// Check if any hooks are registered for an event
    pub fn has_hooks(&self, event: &HookEvent) -> bool {
        self.hooks.get(event).is_some_and(|m| !m.is_empty())
    }
}

// ── Pre-built Hook Factories (portable only) ──────────────────────────────

/// Create a hook that blocks specific tool names.
pub fn block_tools_hook(blocked: Vec<String>) -> HookCallback {
    Box::new(move |input: &HookInput| {
        if let Some(ref tool_name) = input.tool_name {
            if blocked.contains(tool_name) {
                return HookOutput {
                    allow: false,
                    deny_reason: Some(format!("Tool `{tool_name}` is blocked by policy")),
                    ..Default::default()
                };
            }
        }
        HookOutput::default()
    })
}

/// Create a hook that injects additional context after tool use.
pub fn context_injection_hook(context: String) -> HookCallback {
    Box::new(move |_input: &HookInput| {
        HookOutput {
            additional_context: Some(context.clone()),
            ..Default::default()
        }
    })
}

/// Create a hook that validates SDD phase transitions.
/// Ensures phases respect the dependency DAG.
pub fn sdd_phase_guard_hook(completed_phases: Vec<SddPhase>) -> HookCallback {
    Box::new(move |input: &HookInput| {
        if let Some(ref phase_name) = input.phase_name {
            if let Some(phase) = SddPhase::from_str(phase_name) {
                for dep in phase.dependencies() {
                    if !completed_phases.contains(dep) {
                        return HookOutput {
                            allow: false,
                            deny_reason: Some(format!(
                                "Phase `{phase_name}` requires `{}` to complete first",
                                dep.as_str()
                            )),
                            ..Default::default()
                        };
                    }
                }
            }
        }
        HookOutput::default()
    })
}

// ── Hook Builder (ergonomic API) ──────────────────────────────────────────

/// Builder for constructing a HookRegistry with a fluent API.
pub struct HookBuilder {
    registry: HookRegistry,
}

impl Default for HookBuilder {
    fn default() -> Self {
        Self::new()
    }
}

impl HookBuilder {
    pub fn new() -> Self {
        Self { registry: HookRegistry::new() }
    }

    pub fn pre_tool_use(mut self, matcher: &str, hook: HookCallback) -> Self {
        self.registry.on(HookEvent::PreToolUse, HookMatcher {
            matcher: Some(matcher.into()),
            hooks: vec![hook],
        });
        self
    }

    pub fn post_tool_use(mut self, matcher: &str, hook: HookCallback) -> Self {
        self.registry.on(HookEvent::PostToolUse, HookMatcher {
            matcher: Some(matcher.into()),
            hooks: vec![hook],
        });
        self
    }

    pub fn on_session_start(mut self, hook: HookCallback) -> Self {
        self.registry.on(HookEvent::SessionStart, HookMatcher {
            matcher: None,
            hooks: vec![hook],
        });
        self
    }

    pub fn on_session_end(mut self, hook: HookCallback) -> Self {
        self.registry.on(HookEvent::SessionEnd, HookMatcher {
            matcher: None,
            hooks: vec![hook],
        });
        self
    }

    pub fn on_subagent_start(mut self, hook: HookCallback) -> Self {
        self.registry.on(HookEvent::SubagentStart, HookMatcher {
            matcher: None,
            hooks: vec![hook],
        });
        self
    }

    pub fn on_phase_start(mut self, hook: HookCallback) -> Self {
        self.registry.on(HookEvent::PrePhase, HookMatcher {
            matcher: None,
            hooks: vec![hook],
        });
        self
    }

    pub fn on_phase_end(mut self, hook: HookCallback) -> Self {
        self.registry.on(HookEvent::PostPhase, HookMatcher {
            matcher: None,
            hooks: vec![hook],
        });
        self
    }

    pub fn build(self) -> HookRegistry {
        self.registry
    }
}
