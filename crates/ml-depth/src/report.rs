//! Terminal report formatting for ML depth results.

use crate::pipeline::CompanyProfile;

/// Format a single company profile as a detailed report.
pub fn format_company_report(profile: &CompanyProfile) -> String {
    let mut out = String::new();
    let s = &profile.depth_score;

    out.push_str(&format!(
        "\n╔══════════════════════════════════════════════════╗\n"
    ));
    out.push_str(&format!(
        "║  {}  →  {}\n",
        profile.company_name, s.verdict
    ));
    out.push_str(&format!(
        "║  Overall score: {:.2}\n",
        s.overall_score
    ));
    out.push_str(&format!(
        "╚══════════════════════════════════════════════════╝\n\n"
    ));

    // Dimensions
    out.push_str("  Dimensions:\n");
    out.push_str(&format!(
        "    paper_count:      {:.2}\n",
        s.dimensions.paper_count
    ));
    out.push_str(&format!(
        "    venue_quality:    {:.2}\n",
        s.dimensions.venue_quality
    ));
    out.push_str(&format!(
        "    citation_impact:  {:.2}\n",
        s.dimensions.citation_impact
    ));
    out.push_str(&format!(
        "    research_breadth: {:.2}\n",
        s.dimensions.research_breadth
    ));
    out.push_str(&format!(
        "    novelty:          {:.2}\n",
        s.dimensions.novelty
    ));
    out.push_str(&format!(
        "    team_pedigree:    {:.2}\n",
        s.dimensions.team_pedigree
    ));
    out.push_str(&format!(
        "    hf_signals:       {:.2}\n",
        s.dimensions.hf_signals
    ));

    // Evidence
    if !s.evidence.is_empty() {
        out.push_str("\n  Evidence:\n");
        for e in &s.evidence {
            out.push_str(&format!("    [{}] {}\n", e.dimension, e.detail));
        }
    }

    // HF profile summary
    if let Some(ref hf) = profile.hf_profile {
        out.push_str(&format!(
            "\n  HF presence: {} models, {} datasets, {} spaces ({} total downloads)\n",
            hf.models.len(),
            hf.datasets.len(),
            hf.spaces.len(),
            hf.total_downloads,
        ));
        if !hf.arxiv_links.is_empty() {
            out.push_str(&format!(
                "  ArXiv links: {}\n",
                hf.arxiv_links.len()
            ));
        }
        if !hf.training_signals.is_empty() {
            out.push_str(&format!(
                "  Training signals: {}\n",
                hf.training_signals.len()
            ));
        }
    }

    // Papers
    out.push_str(&format!("\n  Papers found: {}\n", profile.papers.len()));
    for (i, p) in profile.papers.iter().take(10).enumerate() {
        let citations = p.citation_count.map(|c| format!(" [{c} cites]")).unwrap_or_default();
        let year = p.year.map(|y| format!(" ({y})")).unwrap_or_default();
        out.push_str(&format!(
            "    {}. {}{}{}\n",
            i + 1,
            p.title,
            year,
            citations,
        ));
    }
    if profile.papers.len() > 10 {
        out.push_str(&format!(
            "    ... and {} more\n",
            profile.papers.len() - 10
        ));
    }

    out
}

/// Format a batch of profiles as a ranked table.
pub fn format_batch_table(profiles: &[CompanyProfile]) -> String {
    let mut out = String::new();

    // Header
    out.push_str(&format!(
        "\n  ┌──────┬─────────────────────────┬──────────────────┬───────┬────────┬────────┬────────┐\n"
    ));
    out.push_str(&format!(
        "  │ Rank │ Company                 │ Verdict          │ Score │ Papers │ Venues │ Pedigr │\n"
    ));
    out.push_str(&format!(
        "  ├──────┼─────────────────────────┼──────────────────┼───────┼────────┼────────┼────────┤\n"
    ));

    for (i, p) in profiles.iter().enumerate() {
        let s = &p.depth_score;
        let name = if p.company_name.len() > 23 {
            format!("{}…", &p.company_name[..22])
        } else {
            format!("{:<23}", p.company_name)
        };

        out.push_str(&format!(
            "  │ {:<4} │ {} │ {:<16} │ {:.2}  │ {:<6} │ {:.2}   │ {:.2}   │\n",
            i + 1,
            name,
            format!("{}", s.verdict),
            s.overall_score,
            p.papers.len(),
            s.dimensions.venue_quality,
            s.dimensions.team_pedigree,
        ));
    }

    out.push_str(&format!(
        "  └──────┴─────────────────────────┴──────────────────┴───────┴────────┴────────┴────────┘\n"
    ));

    out
}

/// Format profiles as CSV.
pub fn format_csv(profiles: &[CompanyProfile]) -> String {
    let mut out = String::from(
        "company,verdict,overall_score,paper_count,venue_quality,citation_impact,research_breadth,novelty,team_pedigree,hf_signals\n",
    );

    for p in profiles {
        let s = &p.depth_score;
        out.push_str(&format!(
            "{},{},{:.4},{:.4},{:.4},{:.4},{:.4},{:.4},{:.4},{:.4}\n",
            p.company_name,
            s.verdict,
            s.overall_score,
            s.dimensions.paper_count,
            s.dimensions.venue_quality,
            s.dimensions.citation_impact,
            s.dimensions.research_breadth,
            s.dimensions.novelty,
            s.dimensions.team_pedigree,
            s.dimensions.hf_signals,
        ));
    }

    out
}
