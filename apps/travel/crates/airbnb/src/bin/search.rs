//! CLI: print all pre-built Spain June 2026 Airbnb search URLs.

fn main() {
    let regions = airbnb::all_regions();

    println!("═══════════════════════════════════════════════════════════");
    println!("  Airbnb Spain — Iunie 2026, piscină, max 50€/noapte");
    println!("  (Prețul afișat NU include taxa de curățenie)");
    println!("═══════════════════════════════════════════════════════════\n");

    for zone in &regions {
        println!("── {} ──", zone.region.label());
        for city in &zone.cities {
            let url = city.url();
            if let Some(note) = &city.note {
                println!("  {} — {}", city.city, note);
            } else {
                println!("  {}", city.city);
            }
            println!("  {}\n", url);
        }
    }

    println!("───────────────────────────────────────────────────────────");
    println!("SFATURI:\n");
    for tip in airbnb::regions::TIPS {
        println!("  • {tip}");
    }
    println!();

    // JSON export
    let searches = airbnb::spain_june_2026();
    let json = serde_json::to_string_pretty(&searches).unwrap();
    let out = "data/airbnb-spain-june-2026.json";
    if let Err(e) = std::fs::create_dir_all("data") {
        eprintln!("Could not create data/: {e}");
    } else if let Err(e) = std::fs::write(out, &json) {
        eprintln!("Could not write {out}: {e}");
    } else {
        println!("  JSON exportat → {out}");
    }
}
