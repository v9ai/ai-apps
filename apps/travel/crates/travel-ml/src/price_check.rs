use serde::{Deserialize, Serialize};

// Report date constant — no chrono dependency needed
const REPORT_DATE: &str = "2026-03-28";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PriceItem {
    pub name: String,
    pub eur: f32,
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum PriceStatus {
    Ok,      // actual <= budgeted
    Warning, // actual within 10% over budgeted
    Over,    // actual > 10% over budgeted
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PriceCategory {
    pub name: String,
    pub budgeted_eur: f32,
    pub actual_eur: f32,
    pub status: PriceStatus,
    pub items: Vec<PriceItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PriceReport {
    pub categories: Vec<PriceCategory>,
    pub total_budgeted: f32,
    pub total_actual: f32,
    pub total_status: PriceStatus,
    pub within_budget: bool,
    pub generated_at: String,
}

// ── Core logic ───────────────────────────────────────────────────────────────

pub fn price_status(actual: f32, budgeted: f32) -> PriceStatus {
    if actual <= budgeted {
        PriceStatus::Ok
    } else if actual <= budgeted * 1.10 {
        PriceStatus::Warning
    } else {
        PriceStatus::Over
    }
}

// ── Category builders ────────────────────────────────────────────────────────

pub fn flights_category() -> PriceCategory {
    let items = vec![
        PriceItem {
            name: "Adult 1 flight (Dublin–Naples return)".into(),
            eur: 110.0,
            note: None,
        },
        PriceItem {
            name: "Adult 2 flight (Dublin–Naples return)".into(),
            eur: 110.0,
            note: None,
        },
        PriceItem {
            name: "Child flight (Dublin–Naples return)".into(),
            eur: 80.0,
            note: Some("Shoulder season child fare".into()),
        },
    ];
    let actual: f32 = items.iter().map(|i| i.eur).sum();
    let budgeted = 300.0_f32;
    let status = price_status(actual, budgeted);
    PriceCategory {
        name: "Flights".into(),
        budgeted_eur: budgeted,
        actual_eur: actual,
        status,
        items,
    }
}

pub fn accommodation_category() -> PriceCategory {
    // Family room B&B: €60/night × 5 nights = €300
    // City tax: €2/adult × 2 adults × 5 nights = €20
    // actual = €320, budgeted = €300 → 6.7% over → Warning
    let items = vec![
        PriceItem {
            name: "Family room B&B (€60/night × 5 nights)".into(),
            eur: 300.0,
            note: Some("3-star B&B Centro Storico, family room".into()),
        },
        PriceItem {
            name: "City tax (€2/adult × 2 adults × 5 nights)".into(),
            eur: 20.0,
            note: Some("Naples tourism tax".into()),
        },
    ];
    let actual: f32 = items.iter().map(|i| i.eur).sum();
    let budgeted = 300.0_f32;
    let status = price_status(actual, budgeted);
    PriceCategory {
        name: "Accommodation".into(),
        budgeted_eur: budgeted,
        actual_eur: actual,
        status,
        items,
    }
}

pub fn activities_category() -> PriceCategory {
    // €30 + €12 + €18 + €8 = €68 → 13.3% over budget (€60) → Over
    let items = vec![
        PriceItem {
            name: "MANN Museum (2 adults)".into(),
            eur: 30.0,
            note: Some("Children free".into()),
        },
        PriceItem {
            name: "Certosa di San Martino (2 adults)".into(),
            eur: 12.0,
            note: None,
        },
        PriceItem {
            name: "Napoli Sotterranea (2 adults)".into(),
            eur: 18.0,
            note: Some("€9/person, child skipped".into()),
        },
        PriceItem {
            name: "Audio guide Pompeii (family)".into(),
            eur: 8.0,
            note: None,
        },
    ];
    let actual: f32 = items.iter().map(|i| i.eur).sum();
    let budgeted = 60.0_f32;
    let status = price_status(actual, budgeted);
    PriceCategory {
        name: "Activities".into(),
        budgeted_eur: budgeted,
        actual_eur: actual,
        status,
        items,
    }
}

pub fn transport_category() -> PriceCategory {
    // €24 + €4.40 + €8.70 = €37.10 → Ok (under budget €50)
    let items = vec![
        PriceItem {
            name: "ANM 3-day pass × 2 adults".into(),
            eur: 24.0,
            note: Some("€12/adult".into()),
        },
        PriceItem {
            name: "Funicular rides (extra)".into(),
            eur: 4.40,
            note: Some("2 adults × €2.20".into()),
        },
        PriceItem {
            name: "Circumvesuviana to Pompeii (3 persons)".into(),
            eur: 8.70,
            note: Some("3 × €2.90".into()),
        },
    ];
    let actual: f32 = items.iter().map(|i| i.eur).sum();
    let budgeted = 50.0_f32;
    let status = price_status(actual, budgeted);
    PriceCategory {
        name: "Transport".into(),
        budgeted_eur: budgeted,
        actual_eur: actual,
        status,
        items,
    }
}

pub fn capri_category() -> PriceCategory {
    // €28 + €14 + €9 + €15 = €66 → Ok (under budget €90)
    let items = vec![
        PriceItem {
            name: "Traditional ferry return (2 adults)".into(),
            eur: 28.0,
            note: None,
        },
        PriceItem {
            name: "Traditional ferry return (child)".into(),
            eur: 14.0,
            note: None,
        },
        PriceItem {
            name: "Bus to Anacapri (3 persons)".into(),
            eur: 9.0,
            note: Some("3 × €3".into()),
        },
        PriceItem {
            name: "Beach snacks / gelato".into(),
            eur: 15.0,
            note: None,
        },
    ];
    let actual: f32 = items.iter().map(|i| i.eur).sum();
    let budgeted = 90.0_f32;
    let status = price_status(actual, budgeted);
    PriceCategory {
        name: "Capri Day Trip".into(),
        budgeted_eur: budgeted,
        actual_eur: actual,
        status,
        items,
    }
}

// ── Main entry points ────────────────────────────────────────────────────────

pub fn run_price_check() -> PriceReport {
    let categories = vec![
        flights_category(),
        accommodation_category(),
        activities_category(),
        transport_category(),
        capri_category(),
    ];

    let total_budgeted: f32 = categories.iter().map(|c| c.budgeted_eur).sum();
    let total_actual: f32 = categories.iter().map(|c| c.actual_eur).sum();
    let total_status = price_status(total_actual, total_budgeted);
    let within_budget = total_actual <= total_budgeted;

    PriceReport {
        categories,
        total_budgeted,
        total_actual,
        total_status,
        within_budget,
        generated_at: REPORT_DATE.to_string(),
    }
}

pub fn print_price_report(report: &PriceReport) {
    println!("=== Price Check Report — Naples Family Trip ===");
    println!();
    for cat in &report.categories {
        let symbol = match cat.status {
            PriceStatus::Ok => "✓",
            PriceStatus::Warning => "⚠",
            PriceStatus::Over => "✗",
        };
        println!(
            "  {symbol} {:<20} budgeted: €{:.2}  actual: €{:.2}",
            cat.name, cat.budgeted_eur, cat.actual_eur
        );
        for item in &cat.items {
            let note = item
                .note
                .as_deref()
                .map(|n| format!(" ({n})"))
                .unwrap_or_default();
            println!("      • {}  €{:.2}{note}", item.name, item.eur);
        }
    }
    println!();
    let total_symbol = match report.total_status {
        PriceStatus::Ok => "✓",
        PriceStatus::Warning => "⚠",
        PriceStatus::Over => "✗",
    };
    println!(
        "  {total_symbol} TOTAL                budgeted: €{:.2}  actual: €{:.2}",
        report.total_budgeted, report.total_actual
    );
    println!(
        "  Within budget: {}",
        if report.within_budget { "YES" } else { "NO" }
    );
    println!("  Generated: {}", report.generated_at);
}

// ── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // ── price_status ─────────────────────────────────────────────────────────

    #[test]
    fn price_status_ok_when_actual_eq_budgeted() {
        assert_eq!(price_status(100.0, 100.0), PriceStatus::Ok);
    }

    #[test]
    fn price_status_ok_when_actual_below_budgeted() {
        assert_eq!(price_status(80.0, 100.0), PriceStatus::Ok);
    }

    #[test]
    fn price_status_warning_at_boundary() {
        // Exactly 10% over: 110.0 / 100.0 = 1.10 → Warning
        assert_eq!(price_status(110.0, 100.0), PriceStatus::Warning);
    }

    #[test]
    fn price_status_over_when_above_10_percent() {
        // 111 / 100 = 11.1% over → Over
        assert_eq!(price_status(111.0, 100.0), PriceStatus::Over);
    }

    #[test]
    fn price_status_zero_budgeted_with_actual_zero_is_ok() {
        assert_eq!(price_status(0.0, 0.0), PriceStatus::Ok);
    }

    #[test]
    fn price_status_warning_below_boundary() {
        // 9.9% over → still Warning
        assert_eq!(price_status(109.9, 100.0), PriceStatus::Warning);
    }

    #[test]
    fn price_status_large_over_is_over() {
        assert_eq!(price_status(500.0, 100.0), PriceStatus::Over);
    }

    // ── flights_category ─────────────────────────────────────────────────────

    #[test]
    fn flights_category_actual_matches_sum_of_items() {
        let cat = flights_category();
        let sum: f32 = cat.items.iter().map(|i| i.eur).sum();
        assert!(
            (cat.actual_eur - sum).abs() < 0.01,
            "actual_eur {} != sum of items {}",
            cat.actual_eur,
            sum
        );
    }

    #[test]
    fn flights_category_has_three_items() {
        assert_eq!(flights_category().items.len(), 3);
    }

    #[test]
    fn flights_category_all_items_positive() {
        for item in flights_category().items {
            assert!(item.eur > 0.0, "item '{}' has non-positive eur {}", item.name, item.eur);
        }
    }

    // ── accommodation_category ───────────────────────────────────────────────

    #[test]
    fn accommodation_category_actual_matches_sum_of_items() {
        let cat = accommodation_category();
        let sum: f32 = cat.items.iter().map(|i| i.eur).sum();
        assert!(
            (cat.actual_eur - sum).abs() < 0.01,
            "actual_eur {} != sum of items {}",
            cat.actual_eur,
            sum
        );
    }

    #[test]
    fn accommodation_category_budgeted_is_300() {
        assert!((accommodation_category().budgeted_eur - 300.0).abs() < 0.01);
    }

    #[test]
    fn accommodation_category_status_is_warning() {
        // 320 / 300 = 6.7% over → Warning
        assert_eq!(accommodation_category().status, PriceStatus::Warning);
    }

    // ── activities_category ──────────────────────────────────────────────────

    #[test]
    fn activities_category_actual_matches_sum_of_items() {
        let cat = activities_category();
        let sum: f32 = cat.items.iter().map(|i| i.eur).sum();
        assert!(
            (cat.actual_eur - sum).abs() < 0.01,
            "actual_eur {} != sum of items {}",
            cat.actual_eur,
            sum
        );
    }

    #[test]
    fn activities_category_all_items_nonnegative() {
        for item in activities_category().items {
            assert!(item.eur >= 0.0, "item '{}' has negative eur {}", item.name, item.eur);
        }
    }

    #[test]
    fn activities_category_status_is_over() {
        // 68 / 60 = 13.3% over → Over
        assert_eq!(activities_category().status, PriceStatus::Over);
    }

    // ── transport_category ───────────────────────────────────────────────────

    #[test]
    fn transport_category_actual_matches_sum_of_items() {
        let cat = transport_category();
        let sum: f32 = cat.items.iter().map(|i| i.eur).sum();
        assert!(
            (cat.actual_eur - sum).abs() < 0.01,
            "actual_eur {} != sum of items {}",
            cat.actual_eur,
            sum
        );
    }

    #[test]
    fn transport_category_budgeted_is_50() {
        assert!((transport_category().budgeted_eur - 50.0).abs() < 0.01);
    }

    #[test]
    fn transport_category_status_is_ok() {
        assert_eq!(transport_category().status, PriceStatus::Ok);
    }

    // ── capri_category ───────────────────────────────────────────────────────

    #[test]
    fn capri_category_actual_matches_sum_of_items() {
        let cat = capri_category();
        let sum: f32 = cat.items.iter().map(|i| i.eur).sum();
        assert!(
            (cat.actual_eur - sum).abs() < 0.01,
            "actual_eur {} != sum of items {}",
            cat.actual_eur,
            sum
        );
    }

    #[test]
    fn capri_category_all_items_positive() {
        for item in capri_category().items {
            assert!(item.eur > 0.0, "item '{}' has non-positive eur {}", item.name, item.eur);
        }
    }

    #[test]
    fn capri_category_status_is_ok() {
        assert_eq!(capri_category().status, PriceStatus::Ok);
    }

    // ── run_price_check ──────────────────────────────────────────────────────

    #[test]
    fn run_price_check_has_five_categories() {
        assert_eq!(run_price_check().categories.len(), 5);
    }

    #[test]
    fn run_price_check_total_budgeted_is_sum_of_categories() {
        let report = run_price_check();
        let sum: f32 = report.categories.iter().map(|c| c.budgeted_eur).sum();
        assert!(
            (report.total_budgeted - sum).abs() < 0.01,
            "total_budgeted {} != sum {}",
            report.total_budgeted,
            sum
        );
    }

    #[test]
    fn run_price_check_total_actual_is_sum_of_categories() {
        let report = run_price_check();
        let sum: f32 = report.categories.iter().map(|c| c.actual_eur).sum();
        assert!(
            (report.total_actual - sum).abs() < 0.01,
            "total_actual {} != sum {}",
            report.total_actual,
            sum
        );
    }

    #[test]
    fn run_price_check_within_budget_reflects_total_status() {
        let report = run_price_check();
        assert_eq!(report.within_budget, report.total_actual <= report.total_budgeted);
    }

    #[test]
    fn run_price_check_category_names_unique() {
        let report = run_price_check();
        let mut names: Vec<&str> = report.categories.iter().map(|c| c.name.as_str()).collect();
        let original_len = names.len();
        names.dedup();
        // After sort+dedup uniqueness check
        let mut sorted = report
            .categories
            .iter()
            .map(|c| c.name.as_str())
            .collect::<Vec<_>>();
        sorted.sort_unstable();
        sorted.dedup();
        assert_eq!(sorted.len(), original_len, "category names must be unique");
    }

    #[test]
    fn run_price_check_generated_at_is_set() {
        let report = run_price_check();
        assert!(!report.generated_at.is_empty());
        assert_eq!(report.generated_at, "2026-03-28");
    }

    #[test]
    fn run_price_check_total_status_consistent_with_totals() {
        let report = run_price_check();
        let expected = price_status(report.total_actual, report.total_budgeted);
        assert_eq!(report.total_status, expected);
    }
}
