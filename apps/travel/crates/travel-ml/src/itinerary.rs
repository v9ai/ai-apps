use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PlaceNode {
    pub name: String,
    pub lat: f64,
    pub lng: f64,
    pub duration_min: u32,
    pub energy_cost: f32,
    pub kid_friendly: bool,
}

#[derive(Debug, Serialize)]
pub struct DayPlan {
    pub sequence: Vec<String>,
    pub total_min: u32,
    pub energy_used: f32,
    pub kid_max_hit: bool,
}

// ── Kid Fatigue Model ─────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KidFatigueModel {
    pub energy_cap: f32,      // default 3.0 for school-age
    pub decay_rate: f32,      // energy decay per hour of activity: 0.15
    pub recovery_meal: f32,   // energy recovered at meal break: 0.5
    pub recovery_rest: f32,   // energy recovered at rest stop: 0.25
}

impl Default for KidFatigueModel {
    fn default() -> Self {
        Self {
            energy_cap: 3.0,
            decay_rate: 0.15,
            recovery_meal: 0.5,
            recovery_rest: 0.25,
        }
    }
}

// ── Time Block ────────────────────────────────────────────────────────────────

/// Minutes-from-09:00 boundaries: Morning 0–210, Lunch 210–270, Afternoon 270–480, Evening 480–660
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum TimeBlock {
    Morning,   // 09:00 – 12:30
    Lunch,     // 12:30 – 13:30
    Afternoon, // 13:30 – 17:00
    Evening,   // 17:00 – 20:00
}

impl TimeBlock {
    pub fn from_minutes(min: u32) -> Self {
        match min {
            0..=209 => TimeBlock::Morning,
            210..=269 => TimeBlock::Lunch,
            270..=479 => TimeBlock::Afternoon,
            _ => TimeBlock::Evening,
        }
    }
}

// ── Scheduled Place ───────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScheduledPlace {
    pub name: String,
    pub start_time_min: u32, // minutes from 09:00 = 0
    pub end_time_min: u32,
    pub time_block: TimeBlock,
    pub kid_energy_after: f32, // remaining kid energy after visiting
    pub transit_min: u32,
}

// ── Family Day Plan ───────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct FamilyDayPlan {
    pub schedule: Vec<ScheduledPlace>,
    pub total_duration_min: u32,
    pub kid_energy_remaining: f32,
    pub kid_overloaded: bool, // true if energy dropped below 0.3 at any point
    pub meal_break_recommended_at: Option<String>, // place name after which meal break is needed
    pub estimated_start: String, // "09:00"
    pub estimated_end: String,   // e.g. "16:30"
}

// ── Helpers ───────────────────────────────────────────────────────────────────

pub fn haversine_km(a: (f64, f64), b: (f64, f64)) -> f64 {
    const R: f64 = 6371.0;
    let dlat = (b.0 - a.0).to_radians();
    let dlng = (b.1 - a.1).to_radians();
    let lat1 = a.0.to_radians();
    let lat2 = b.0.to_radians();
    let h = (dlat / 2.0).sin().powi(2) + lat1.cos() * lat2.cos() * (dlng / 2.0).sin().powi(2);
    2.0 * R * h.sqrt().asin()
}

pub fn transit_min(a: (f64, f64), b: (f64, f64)) -> u32 {
    let raw = (haversine_km(a, b) * 1000.0 / 50.0).ceil() as u32;
    raw.min(30)
}

/// Format minutes-from-09:00 as a clock string, e.g. 90 → "10:30".
fn fmt_time(minutes_from_nine: u32) -> String {
    let total = 9 * 60 + minutes_from_nine;
    format!("{:02}:{:02}", total / 60, total % 60)
}

// ── plan_day (original greedy nearest-neighbor) ───────────────────────────────

pub fn plan_day(places: &[PlaceNode], max_hours: f32) -> DayPlan {
    if places.is_empty() {
        return DayPlan {
            sequence: vec![],
            total_min: 0,
            energy_used: 0.0,
            kid_max_hit: false,
        };
    }

    let max_min = (max_hours * 60.0) as u32;
    let mut visited = vec![false; places.len()];
    let mut sequence: Vec<String> = Vec::new();
    let mut total_min: u32 = 0;
    let mut energy_used: f32 = 0.0;
    let mut current = 0usize;

    visited[current] = true;
    total_min += places[current].duration_min;
    energy_used += places[current].energy_cost;
    sequence.push(places[current].name.clone());

    loop {
        if energy_used > 4.0 || total_min > max_min {
            break;
        }

        let cur_pos = (places[current].lat, places[current].lng);
        let next = (0..places.len())
            .filter(|&i| !visited[i])
            .min_by(|&a, &b| {
                let da = haversine_km(cur_pos, (places[a].lat, places[a].lng));
                let db = haversine_km(cur_pos, (places[b].lat, places[b].lng));
                da.partial_cmp(&db).unwrap()
            });

        let Some(idx) = next else { break };

        let transit = transit_min(cur_pos, (places[idx].lat, places[idx].lng));
        let step_min = transit + places[idx].duration_min;
        let step_energy = places[idx].energy_cost;

        if total_min + step_min > max_min || energy_used + step_energy > 4.0 {
            break;
        }

        visited[idx] = true;
        total_min += step_min;
        energy_used += step_energy;
        sequence.push(places[idx].name.clone());
        current = idx;
    }

    let kid_max_hit = energy_used > 3.0;

    DayPlan {
        sequence,
        total_min,
        energy_used,
        kid_max_hit,
    }
}

// ── plan_family_day ───────────────────────────────────────────────────────────

/// Greedy nearest-neighbor day planner that models kid fatigue.
///
/// Rules:
/// - Clock starts at 09:00 (minute 0).
/// - Kid energy starts at `fatigue.energy_cap`.
/// - After each place: energy -= `fatigue.decay_rate * (duration_min / 60)`.
/// - If energy < 0.4 AND current_min > 210 (12:30): recommend meal break once,
///   then recover `fatigue.recovery_meal`.
/// - Stop if kid energy < 0.3 OR elapsed_min > max_hours * 60.
pub fn plan_family_day(
    places: &[PlaceNode],
    fatigue: &KidFatigueModel,
    max_hours: f32,
) -> FamilyDayPlan {
    if places.is_empty() {
        return FamilyDayPlan {
            schedule: vec![],
            total_duration_min: 0,
            kid_energy_remaining: fatigue.energy_cap,
            kid_overloaded: false,
            meal_break_recommended_at: None,
            estimated_start: "09:00".into(),
            estimated_end: "09:00".into(),
        };
    }

    let max_min = (max_hours * 60.0) as u32;
    let mut visited = vec![false; places.len()];
    let mut schedule: Vec<ScheduledPlace> = Vec::new();
    let mut current_min: u32 = 0;
    let mut kid_energy = fatigue.energy_cap;
    let mut kid_overloaded = false;
    let mut meal_break_recommended_at: Option<String> = None;
    let mut current = 0usize;

    // ── Visit first place ────────────────────────────────────────────────────
    visited[current] = true;
    let start = current_min;
    let end = current_min + places[current].duration_min;

    let decay = fatigue.decay_rate * (places[current].duration_min as f32 / 60.0);
    kid_energy -= decay;
    if kid_energy < 0.3 {
        kid_overloaded = true;
    }

    // Check for meal-break recommendation after first place (unlikely at min 0,
    // but handled uniformly by the same logic in the loop below).
    let energy_after_first = kid_energy;
    schedule.push(ScheduledPlace {
        name: places[current].name.clone(),
        start_time_min: start,
        end_time_min: end,
        time_block: TimeBlock::from_minutes(start),
        kid_energy_after: energy_after_first,
        transit_min: 0,
    });
    current_min = end;

    // ── Greedy loop ──────────────────────────────────────────────────────────
    loop {
        // Hard stop conditions
        if kid_energy < 0.3 || current_min > max_min {
            break;
        }

        let cur_pos = (places[current].lat, places[current].lng);
        let next = (0..places.len())
            .filter(|&i| !visited[i])
            .min_by(|&a, &b| {
                let da = haversine_km(cur_pos, (places[a].lat, places[a].lng));
                let db = haversine_km(cur_pos, (places[b].lat, places[b].lng));
                da.partial_cmp(&db).unwrap()
            });

        let Some(idx) = next else { break };

        let t_min = transit_min(cur_pos, (places[idx].lat, places[idx].lng));
        let step_min = t_min + places[idx].duration_min;

        // Would we exceed the daily cap?
        if current_min + step_min > max_min {
            break;
        }

        // Apply fatigue for this place
        let decay = fatigue.decay_rate * (places[idx].duration_min as f32 / 60.0);
        let energy_after = kid_energy - decay;

        // Meal-break recommendation: low energy AND past 12:30 AND not yet set
        if energy_after < 0.4 && current_min > 210 && meal_break_recommended_at.is_none() {
            meal_break_recommended_at = Some(places[idx].name.clone());
            kid_energy = (energy_after + fatigue.recovery_meal).min(fatigue.energy_cap);
        } else {
            kid_energy = energy_after;
        }

        if kid_energy < 0.3 {
            kid_overloaded = true;
        }

        let place_start = current_min + t_min;
        let place_end = place_start + places[idx].duration_min;

        visited[idx] = true;
        schedule.push(ScheduledPlace {
            name: places[idx].name.clone(),
            start_time_min: place_start,
            end_time_min: place_end,
            time_block: TimeBlock::from_minutes(place_start),
            kid_energy_after: kid_energy,
            transit_min: t_min,
        });

        current_min = place_end;
        current = idx;
    }

    let estimated_end = fmt_time(current_min);

    FamilyDayPlan {
        schedule,
        total_duration_min: current_min,
        kid_energy_remaining: kid_energy,
        kid_overloaded,
        meal_break_recommended_at,
        estimated_start: "09:00".into(),
        estimated_end,
    }
}

// ── napoli_family_plan ────────────────────────────────────────────────────────

pub fn napoli_family_plan() -> FamilyDayPlan {
    let places = vec![
        PlaceNode {
            name: "Piazza del Plebiscito".into(),
            lat: 40.8358,
            lng: 14.2487,
            duration_min: 45,
            energy_cost: 0.2,
            kid_friendly: true,
        },
        PlaceNode {
            name: "Castel dell'Ovo".into(),
            lat: 40.8300,
            lng: 14.2462,
            duration_min: 60,
            energy_cost: 0.3,
            kid_friendly: true,
        },
        PlaceNode {
            name: "Lungomare Caracciolo".into(),
            lat: 40.8302,
            lng: 14.2421,
            duration_min: 60,
            energy_cost: 0.4,
            kid_friendly: true,
        },
        PlaceNode {
            name: "L'Antica Pizzeria da Michele".into(),
            lat: 40.8512,
            lng: 14.2618,
            duration_min: 45,
            energy_cost: 0.1,
            kid_friendly: true,
        },
        PlaceNode {
            name: "Via San Gregorio Armeno".into(),
            lat: 40.8501,
            lng: 14.2572,
            duration_min: 40,
            energy_cost: 0.2,
            kid_friendly: true,
        },
        PlaceNode {
            name: "Spaccanapoli".into(),
            lat: 40.8499,
            lng: 14.2531,
            duration_min: 90,
            energy_cost: 0.5,
            kid_friendly: true,
        },
        PlaceNode {
            name: "Museo Archeologico Nazionale".into(),
            lat: 40.8531,
            lng: 14.2498,
            duration_min: 120,
            energy_cost: 0.7,
            kid_friendly: false,
        },
        PlaceNode {
            name: "Napoli Sotterranea".into(),
            lat: 40.8506,
            lng: 14.2554,
            duration_min: 100,
            energy_cost: 0.8,
            kid_friendly: false,
        },
        PlaceNode {
            name: "Certosa di San Martino".into(),
            lat: 40.8397,
            lng: 14.2344,
            duration_min: 120,
            energy_cost: 0.6,
            kid_friendly: false,
        },
        PlaceNode {
            name: "Quartieri Spagnoli".into(),
            lat: 40.8392,
            lng: 14.2461,
            duration_min: 75,
            energy_cost: 0.4,
            kid_friendly: false,
        },
    ];

    plan_family_day(&places, &KidFatigueModel::default(), 8.0)
}

/// Greedy nearest-neighbour single-day plan for the canonical Napoli place set.
///
/// Returns a lightweight [`DayPlan`] (sequence + totals only) suitable for
/// backwards-compatible embedding in [`crate::napoli_scorer::NapoliReport`].
/// For the richer time-blocked schedule use [`napoli_family_plan`].
pub fn napoli_simple_day_plan() -> DayPlan {
    use crate::constants::MAX_DAILY_WALKING_HOURS;
    plan_day(&napoli_all_places(), MAX_DAILY_WALKING_HOURS)
}

// ── Multi-day planning ────────────────────────────────────────────────────

use crate::constants::{
    MAX_DAILY_WALKING_HOURS, MAX_KID_PLACES_PER_DAY, STAY_DAYS,
};

/// A plan spanning multiple days, each modelled as a [`DayPlan`].
#[derive(Debug, Serialize)]
pub struct MultiDayPlan {
    /// Day-by-day sequence plans.
    pub days: Vec<DayPlan>,
    /// Total number of days planned.
    pub total_days: u8,
    /// Total unique places across all days.
    pub total_places: usize,
    /// Days where kid energy limit was not hit.
    pub kid_friendly_days: u8,
}

/// Partition `places` across `num_days` days using a greedy energy-first
/// strategy.
///
/// Algorithm:
/// 1. Sort remaining places by `kid_friendly` DESC, then `energy_cost` ASC.
/// 2. Fill each day greedily up to `KID_ENERGY_LIMIT` and
///    `MAX_KID_PLACES_PER_DAY` stops.
/// 3. Remaining places spill to the next day.
pub fn plan_multi_day(places: &[PlaceNode], num_days: u8) -> MultiDayPlan {
    let mut remaining: Vec<&PlaceNode> = places.iter().collect();
    let mut days: Vec<DayPlan> = Vec::new();

    for _ in 0..num_days {
        if remaining.is_empty() {
            break;
        }

        // Prefer kid-friendly and low-energy places first
        remaining.sort_by(|a, b| {
            b.kid_friendly
                .cmp(&a.kid_friendly)
                .then(a.energy_cost.partial_cmp(&b.energy_cost).unwrap_or(std::cmp::Ordering::Equal))
        });

        let cap = MAX_KID_PLACES_PER_DAY as usize;
        let batch: Vec<PlaceNode> = remaining
            .iter()
            .take(cap.min(remaining.len()))
            .map(|&n| n.clone())
            .collect();

        let day = plan_day(&batch, MAX_DAILY_WALKING_HOURS);
        let used: std::collections::HashSet<&str> =
            day.sequence.iter().map(|s| s.as_str()).collect();
        remaining.retain(|n| !used.contains(n.name.as_str()));
        days.push(day);
    }

    let kid_friendly_days = days.iter().filter(|d| !d.kid_max_hit).count() as u8;
    let total_places = days.iter().map(|d| d.sequence.len()).sum();

    MultiDayPlan {
        total_days: days.len() as u8,
        days,
        total_places,
        kid_friendly_days,
    }
}

/// Canonical 7-day Napoli family plan using the full place dataset.
pub fn napoli_family_7day_plan() -> MultiDayPlan {
    plan_multi_day(&napoli_all_places(), STAY_DAYS)
}

// ── Tests ─────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::constants::{MAX_KID_PLACES_PER_DAY, STAY_DAYS};

    // ── helpers ───────────────────────────────────────────────────────────

    fn place(name: &str, lat: f64, lng: f64, dur: u32, energy: f32, kid: bool) -> PlaceNode {
        PlaceNode { name: name.into(), lat, lng, duration_min: dur, energy_cost: energy, kid_friendly: kid }
    }

    // ── haversine_km ──────────────────────────────────────────────────────

    #[test]
    fn haversine_same_point_is_zero() {
        let p = (40.8358_f64, 14.2487);
        assert!(haversine_km(p, p) < 1e-9);
    }

    #[test]
    fn haversine_equator_one_degree_longitude_is_111km() {
        // Using Earth radius 6371 km: 2π×6371/360 ≈ 111.195 km per degree
        let km = haversine_km((0.0, 0.0), (0.0, 1.0));
        assert!((km - 111.195).abs() < 0.1, "expected ~111.195 km, got {km:.3}");
    }

    #[test]
    fn haversine_one_degree_latitude_is_111km() {
        let km = haversine_km((0.0, 0.0), (1.0, 0.0));
        assert!((km - 111.19).abs() < 0.1, "expected ~111.19 km, got {km:.3}");
    }

    #[test]
    fn haversine_symmetric() {
        let a = (40.8358, 14.2487);
        let b = (40.7498, 14.4862);
        assert!((haversine_km(a, b) - haversine_km(b, a)).abs() < 1e-9);
    }

    #[test]
    fn haversine_naples_to_pompeii_roughly_24km() {
        let naples = (40.8358_f64, 14.2487);
        let pompeii = (40.7498_f64, 14.4862);
        let km = haversine_km(naples, pompeii);
        assert!(km > 20.0 && km < 30.0, "Naples–Pompeii should be ~24 km, got {km:.1}");
    }

    #[test]
    fn haversine_naples_waterfront_places_under_1km() {
        // Piazza del Plebiscito to Castel dell'Ovo (both on the waterfront)
        let km = haversine_km((40.8358, 14.2487), (40.8300, 14.2462));
        assert!(km < 1.0, "waterfront places should be < 1 km apart, got {km:.3}");
    }

    #[test]
    fn haversine_nonnegative() {
        let a = (40.8358_f64, 14.2487);
        let b = (51.5074_f64, -0.1278);
        assert!(haversine_km(a, b) >= 0.0);
    }

    // ── transit_min ───────────────────────────────────────────────────────

    #[test]
    fn transit_min_same_point_is_zero() {
        let p = (40.8358_f64, 14.2487);
        assert_eq!(transit_min(p, p), 0);
    }

    #[test]
    fn transit_min_capped_at_30_for_naples_to_pompeii() {
        // ~24 km → 24*1000/50 = 480 min → capped at 30
        let naples = (40.8358_f64, 14.2487);
        let pompeii = (40.7498_f64, 14.4862);
        assert_eq!(transit_min(naples, pompeii), 30);
    }

    #[test]
    fn transit_min_capped_at_30_for_very_distant_points() {
        let london = (51.5074_f64, -0.1278);
        let sydney = (-33.8688_f64, 151.2093);
        assert_eq!(transit_min(london, sydney), 30);
    }

    #[test]
    fn transit_min_result_always_in_range() {
        for (a, b) in [
            ((40.83, 14.24), (40.83, 14.24)), // same
            ((40.83, 14.24), (40.84, 14.25)), // close
            ((0.0, 0.0), (90.0, 0.0)),         // far
        ] {
            let t = transit_min(a, b);
            assert!(t <= 30, "transit_min should be <= 30, got {t}");
        }
    }

    #[test]
    fn transit_min_increases_with_distance() {
        let origin = (40.83_f64, 14.24);
        let near = (40.831, 14.241);
        let far = (40.90, 14.35);
        // near is always closer to origin than far
        assert!(transit_min(origin, near) <= transit_min(origin, far));
    }

    // ── fmt_time ──────────────────────────────────────────────────────────

    #[test]
    fn fmt_time_zero_is_nine_am() {
        assert_eq!(fmt_time(0), "09:00");
    }

    #[test]
    fn fmt_time_sixty_is_ten_am() {
        assert_eq!(fmt_time(60), "10:00");
    }

    #[test]
    fn fmt_time_ninety_is_ten_thirty() {
        assert_eq!(fmt_time(90), "10:30");
    }

    #[test]
    fn fmt_time_210_is_twelve_thirty() {
        assert_eq!(fmt_time(210), "12:30");
    }

    #[test]
    fn fmt_time_480_is_five_pm() {
        assert_eq!(fmt_time(480), "17:00");
    }

    #[test]
    fn fmt_time_single_digit_minutes_zero_padded() {
        assert_eq!(fmt_time(9), "09:09");
        assert_eq!(fmt_time(1), "09:01");
    }

    #[test]
    fn fmt_time_660_is_eight_pm() {
        // 9*60 + 660 = 540 + 660 = 1200 → 1200/60=20, 1200%60=0
        assert_eq!(fmt_time(660), "20:00");
    }

    // ── TimeBlock::from_minutes ───────────────────────────────────────────

    #[test]
    fn time_block_exact_boundaries() {
        assert_eq!(TimeBlock::from_minutes(0), TimeBlock::Morning);
        assert_eq!(TimeBlock::from_minutes(209), TimeBlock::Morning);
        assert_eq!(TimeBlock::from_minutes(210), TimeBlock::Lunch);
        assert_eq!(TimeBlock::from_minutes(269), TimeBlock::Lunch);
        assert_eq!(TimeBlock::from_minutes(270), TimeBlock::Afternoon);
        assert_eq!(TimeBlock::from_minutes(479), TimeBlock::Afternoon);
        assert_eq!(TimeBlock::from_minutes(480), TimeBlock::Evening);
        assert_eq!(TimeBlock::from_minutes(9999), TimeBlock::Evening);
    }

    #[test]
    fn time_block_morning_range() {
        for m in [0u32, 100, 200, 209] {
            assert_eq!(TimeBlock::from_minutes(m), TimeBlock::Morning, "min={m}");
        }
    }

    #[test]
    fn time_block_lunch_range() {
        for m in [210u32, 240, 269] {
            assert_eq!(TimeBlock::from_minutes(m), TimeBlock::Lunch, "min={m}");
        }
    }

    #[test]
    fn time_block_afternoon_range() {
        for m in [270u32, 350, 479] {
            assert_eq!(TimeBlock::from_minutes(m), TimeBlock::Afternoon, "min={m}");
        }
    }

    #[test]
    fn time_block_evening_range() {
        for m in [480u32, 550, 660] {
            assert_eq!(TimeBlock::from_minutes(m), TimeBlock::Evening, "min={m}");
        }
    }

    // ── KidFatigueModel ───────────────────────────────────────────────────

    #[test]
    fn kid_fatigue_default_energy_cap_is_three() {
        assert!((KidFatigueModel::default().energy_cap - 3.0).abs() < 1e-6);
    }

    #[test]
    fn kid_fatigue_default_recovery_rest_lt_meal() {
        let f = KidFatigueModel::default();
        assert!(f.recovery_rest < f.recovery_meal);
    }

    #[test]
    fn kid_fatigue_default_decay_rate_positive() {
        assert!(KidFatigueModel::default().decay_rate > 0.0);
    }

    // ── plan_day ──────────────────────────────────────────────────────────

    #[test]
    fn plan_day_empty_input_returns_empty_plan() {
        let plan = plan_day(&[], 8.0);
        assert!(plan.sequence.is_empty());
        assert_eq!(plan.total_min, 0);
        assert_eq!(plan.energy_used, 0.0);
        assert!(!plan.kid_max_hit);
    }

    #[test]
    fn plan_day_single_place_always_included() {
        let places = vec![place("A", 40.83, 14.24, 60, 0.5, true)];
        let plan = plan_day(&places, 8.0);
        assert_eq!(plan.sequence, vec!["A"]);
        assert_eq!(plan.total_min, 60);
        assert!((plan.energy_used - 0.5).abs() < 1e-6);
        assert!(!plan.kid_max_hit);
    }

    #[test]
    fn plan_day_respects_time_limit() {
        // Each place is 200 min. With max 5 hrs (300 min), only the first fits.
        let places = vec![
            place("A", 40.83, 14.24, 200, 0.5, true),
            place("B", 40.84, 14.25, 200, 0.5, true),
            place("C", 40.85, 14.26, 200, 0.5, true),
        ];
        let plan = plan_day(&places, 5.0); // 300 min max
        assert_eq!(plan.sequence.len(), 1, "only 1 place should fit in 300 min");
        assert_eq!(plan.sequence[0], "A");
    }

    #[test]
    fn plan_day_kid_max_hit_above_three_energy() {
        // A: energy 2.0, B: energy 2.0 → total 4.0 > 3.0 → kid_max_hit
        let places = vec![
            place("A", 40.83, 14.24, 60, 2.0, true),
            place("B", 40.8301, 14.2401, 60, 2.0, true),
        ];
        let plan = plan_day(&places, 8.0);
        assert!(plan.kid_max_hit, "energy 4.0 should set kid_max_hit");
    }

    #[test]
    fn plan_day_no_kid_max_hit_below_three_energy() {
        let places = vec![
            place("A", 40.83, 14.24, 60, 1.0, true),
            place("B", 40.8301, 14.2401, 60, 1.0, true),
        ];
        let plan = plan_day(&places, 8.0);
        assert!(!plan.kid_max_hit, "energy 2.0 should NOT set kid_max_hit");
    }

    #[test]
    fn plan_day_selects_nearest_neighbor() {
        // Start at A=(0,0), B=(0,0.1) is close, C=(0,10.0) is far
        // B should be visited before C
        let places = vec![
            place("A", 0.0, 0.0, 30, 0.1, true),
            place("C", 0.0, 10.0, 30, 0.1, true),
            place("B", 0.0, 0.1, 30, 0.1, true),
        ];
        let plan = plan_day(&places, 8.0);
        let b_idx = plan.sequence.iter().position(|s| s == "B");
        let c_idx = plan.sequence.iter().position(|s| s == "C");
        if let (Some(bi), Some(ci)) = (b_idx, c_idx) {
            assert!(bi < ci, "B (closer to A) should be visited before C");
        }
    }

    #[test]
    fn plan_day_sequence_contains_no_duplicates() {
        let places: Vec<PlaceNode> = (0..5)
            .map(|i| place(&format!("P{i}"), 40.83 + i as f64 * 0.001, 14.24, 30, 0.1, true))
            .collect();
        let plan = plan_day(&places, 8.0);
        let mut seen = std::collections::HashSet::new();
        for name in &plan.sequence {
            assert!(seen.insert(name.as_str()), "duplicate in sequence: {name}");
        }
    }

    // ── plan_family_day ───────────────────────────────────────────────────

    #[test]
    fn plan_family_day_empty_returns_full_energy() {
        let f = KidFatigueModel::default();
        let plan = plan_family_day(&[], &f, 8.0);
        assert!(plan.schedule.is_empty());
        assert_eq!(plan.total_duration_min, 0);
        assert!((plan.kid_energy_remaining - f.energy_cap).abs() < 1e-6);
        assert!(!plan.kid_overloaded);
        assert!(plan.meal_break_recommended_at.is_none());
        assert_eq!(plan.estimated_start, "09:00");
        assert_eq!(plan.estimated_end, "09:00");
    }

    #[test]
    fn plan_family_day_single_place_scheduled() {
        let places = vec![place("A", 40.83, 14.24, 60, 0.5, true)];
        let plan = plan_family_day(&places, &KidFatigueModel::default(), 8.0);
        assert_eq!(plan.schedule.len(), 1);
        assert_eq!(plan.schedule[0].name, "A");
        assert_eq!(plan.schedule[0].start_time_min, 0);
        assert_eq!(plan.schedule[0].end_time_min, 60);
        assert_eq!(plan.schedule[0].transit_min, 0);
    }

    #[test]
    fn plan_family_day_energy_decays_after_visit() {
        let places = vec![place("A", 40.83, 14.24, 60, 0.0, true)];
        let f = KidFatigueModel { decay_rate: 0.6, ..Default::default() };
        let plan = plan_family_day(&places, &f, 8.0);
        // decay = 0.6 * (60/60) = 0.6; energy = 3.0 - 0.6 = 2.4
        assert!((plan.schedule[0].kid_energy_after - 2.4).abs() < 1e-4);
    }

    #[test]
    fn plan_family_day_estimated_end_reflects_duration() {
        let places = vec![place("A", 40.83, 14.24, 90, 0.5, true)];
        let plan = plan_family_day(&places, &KidFatigueModel::default(), 8.0);
        assert_eq!(plan.estimated_start, "09:00");
        assert_eq!(plan.estimated_end, "10:30"); // 90 min after 09:00
    }

    #[test]
    fn plan_family_day_start_is_always_nine() {
        let places = vec![place("A", 40.83, 14.24, 60, 0.5, true)];
        let plan = plan_family_day(&places, &KidFatigueModel::default(), 8.0);
        assert_eq!(plan.estimated_start, "09:00");
    }

    #[test]
    fn plan_family_day_stops_when_energy_depleted() {
        // High decay drops energy below 0.3 after first place → no more visits
        let places = vec![
            place("A", 40.83, 14.24, 60, 0.0, true),
            place("B", 40.8301, 14.2401, 60, 0.0, true),
        ];
        let f = KidFatigueModel {
            energy_cap: 0.4,
            decay_rate: 0.5, // 0.5 * (60/60) = 0.5 → 0.4 - 0.5 = -0.1 → overloaded
            recovery_meal: 0.0,
            recovery_rest: 0.0,
        };
        let plan = plan_family_day(&places, &f, 8.0);
        assert!(plan.kid_overloaded, "should be overloaded with aggressive decay");
    }

    #[test]
    fn plan_family_day_time_blocks_assigned_correctly() {
        // First place at 0 min → Morning
        let places = vec![place("Morning", 40.83, 14.24, 30, 0.1, true)];
        let plan = plan_family_day(&places, &KidFatigueModel::default(), 8.0);
        assert_eq!(plan.schedule[0].time_block, TimeBlock::Morning);
    }

    #[test]
    fn plan_family_day_no_duplicates_in_schedule() {
        let places: Vec<PlaceNode> = (0..5)
            .map(|i| place(&format!("P{i}"), 40.83 + i as f64 * 0.001, 14.24, 30, 0.1, true))
            .collect();
        let plan = plan_family_day(&places, &KidFatigueModel::default(), 8.0);
        let mut seen = std::collections::HashSet::new();
        for s in &plan.schedule {
            assert!(seen.insert(s.name.as_str()), "duplicate in schedule: {}", s.name);
        }
    }

    // ── plan_multi_day ────────────────────────────────────────────────────

    #[test]
    fn plan_multi_day_empty_returns_zero_days() {
        let plan = plan_multi_day(&[], 7);
        assert_eq!(plan.total_days, 0);
        assert_eq!(plan.total_places, 0);
        assert!(plan.days.is_empty());
    }

    #[test]
    fn plan_multi_day_does_not_exceed_num_days() {
        let places: Vec<PlaceNode> = (0..10)
            .map(|i| place(&format!("P{i}"), 40.83 + i as f64 * 0.001, 14.24, 60, 0.3, true))
            .collect();
        let plan = plan_multi_day(&places, 3);
        assert!(plan.total_days <= 3, "total_days={} > 3", plan.total_days);
    }

    #[test]
    fn plan_multi_day_total_places_matches_sum_of_sequences() {
        let places: Vec<PlaceNode> = (0..6)
            .map(|i| place(&format!("P{i}"), 40.83 + i as f64 * 0.001, 14.24, 30, 0.2, true))
            .collect();
        let plan = plan_multi_day(&places, 3);
        let expected: usize = plan.days.iter().map(|d| d.sequence.len()).sum();
        assert_eq!(plan.total_places, expected);
    }

    #[test]
    fn plan_multi_day_kid_friendly_days_counted() {
        let places: Vec<PlaceNode> = (0..4)
            .map(|i| place(&format!("P{i}"), 40.83 + i as f64 * 0.001, 14.24, 30, 0.1, true))
            .collect();
        let plan = plan_multi_day(&places, 4);
        let manual = plan.days.iter().filter(|d| !d.kid_max_hit).count() as u8;
        assert_eq!(plan.kid_friendly_days, manual);
    }

    #[test]
    fn plan_multi_day_each_day_respects_max_places_per_day() {
        let places: Vec<PlaceNode> = (0..20)
            .map(|i| place(&format!("P{i}"), 40.83 + i as f64 * 0.0001, 14.24, 10, 0.01, true))
            .collect();
        let plan = plan_multi_day(&places, 7);
        for (di, day) in plan.days.iter().enumerate() {
            assert!(
                day.sequence.len() <= MAX_KID_PLACES_PER_DAY as usize,
                "day {di}: {} places > MAX_KID_PLACES_PER_DAY {}",
                day.sequence.len(),
                MAX_KID_PLACES_PER_DAY
            );
        }
    }

    #[test]
    fn plan_multi_day_no_place_appears_twice() {
        let places: Vec<PlaceNode> = (0..12)
            .map(|i| place(&format!("P{i}"), 40.83 + i as f64 * 0.001, 14.24, 30, 0.2, true))
            .collect();
        let plan = plan_multi_day(&places, 5);
        let mut seen = std::collections::HashSet::new();
        for day in &plan.days {
            for name in &day.sequence {
                assert!(seen.insert(name.as_str()), "place {name} appears in multiple days");
            }
        }
    }

    // ── napoli_all_places data validation ─────────────────────────────────

    #[test]
    fn napoli_all_places_has_eleven_entries() {
        assert_eq!(napoli_all_places().len(), 11);
    }

    #[test]
    fn napoli_all_places_includes_pompeii() {
        assert!(
            napoli_all_places().iter().any(|p| p.name == "Pompeii"),
            "Pompeii must be in napoli_all_places"
        );
    }

    #[test]
    fn napoli_all_places_kid_friendly_split() {
        let places = napoli_all_places();
        let kid_count = places.iter().filter(|p| p.kid_friendly).count();
        let adult_count = places.iter().filter(|p| !p.kid_friendly).count();
        assert_eq!(kid_count, 7, "expected 7 kid-friendly places, got {kid_count}");
        assert_eq!(adult_count, 4, "expected 4 adult-primary places, got {adult_count}");
    }

    #[test]
    fn napoli_all_places_sotterranea_not_kid_friendly() {
        let places = napoli_all_places();
        let sott = places.iter().find(|p| p.name == "Napoli Sotterranea").unwrap();
        assert!(!sott.kid_friendly, "Sotterranea should not be kid_friendly");
    }

    #[test]
    fn napoli_all_places_coordinates_in_naples_region() {
        // Naples/Pompeii area: lat ~40.5–41.0, lng ~14.0–14.6
        for p in napoli_all_places() {
            assert!(
                p.lat > 40.5 && p.lat < 41.5,
                "{}: lat={} outside Naples region", p.name, p.lat
            );
            assert!(
                p.lng > 14.0 && p.lng < 15.0,
                "{}: lng={} outside Naples region", p.name, p.lng
            );
        }
    }

    #[test]
    fn napoli_all_places_durations_positive() {
        for p in napoli_all_places() {
            assert!(p.duration_min > 0, "{}: duration must be positive", p.name);
        }
    }

    #[test]
    fn napoli_all_places_energy_costs_positive() {
        for p in napoli_all_places() {
            assert!(p.energy_cost > 0.0, "{}: energy_cost must be positive", p.name);
        }
    }

    #[test]
    fn napoli_all_places_unique_names() {
        let places = napoli_all_places();
        let mut names: Vec<&str> = places.iter().map(|p| p.name.as_str()).collect();
        let total = names.len();
        names.sort_unstable();
        names.dedup();
        assert_eq!(names.len(), total, "place names must be unique");
    }

    #[test]
    fn napoli_all_places_pompeii_is_kid_friendly_high_energy() {
        let p = napoli_all_places().into_iter().find(|p| p.name == "Pompeii").unwrap();
        assert!(p.kid_friendly, "Pompeii should be kid_friendly");
        assert!(p.energy_cost >= 1.0, "Pompeii should have high energy cost (day trip)");
    }

    // ── integration tests ─────────────────────────────────────────────────

    #[test]
    fn napoli_family_7day_plan_runs_without_panic() {
        let plan = napoli_family_7day_plan();
        assert!(plan.total_days > 0);
        assert!(plan.total_places > 0);
    }

    #[test]
    fn napoli_family_7day_plan_days_lte_stay_days() {
        let plan = napoli_family_7day_plan();
        assert!(
            plan.total_days <= STAY_DAYS,
            "plan has {} days, STAY_DAYS={}", plan.total_days, STAY_DAYS
        );
    }

    #[test]
    fn napoli_family_7day_plan_kid_friendly_days_accurate() {
        let plan = napoli_family_7day_plan();
        let manual = plan.days.iter().filter(|d| !d.kid_max_hit).count() as u8;
        assert_eq!(plan.kid_friendly_days, manual);
    }

    #[test]
    fn napoli_simple_day_plan_nonempty_sequence() {
        let plan = napoli_simple_day_plan();
        assert!(!plan.sequence.is_empty());
        assert!(plan.total_min > 0);
    }

    #[test]
    fn napoli_family_plan_produces_valid_schedule() {
        let plan = napoli_family_plan();
        assert!(!plan.schedule.is_empty());
        assert_eq!(plan.estimated_start, "09:00");
        // Each scheduled place should have end_time > start_time
        for s in &plan.schedule {
            assert!(s.end_time_min > s.start_time_min, "{}: end < start", s.name);
        }
    }
}

/// Full Naples place dataset for multi-day planning.
///
/// Extends the single-day dataset with Pompeii (day trip) and
/// Certosa di San Martino.
fn napoli_all_places() -> Vec<PlaceNode> {
    vec![
        // kid-friendly cluster (waterfront)
        PlaceNode { name: "Piazza del Plebiscito".into(),    lat: 40.8358, lng: 14.2487, duration_min: 45,  energy_cost: 0.2, kid_friendly: true  },
        PlaceNode { name: "Castel dell'Ovo".into(),          lat: 40.8300, lng: 14.2462, duration_min: 60,  energy_cost: 0.3, kid_friendly: true  },
        PlaceNode { name: "Lungomare Caracciolo".into(),      lat: 40.8302, lng: 14.2421, duration_min: 60,  energy_cost: 0.4, kid_friendly: true  },
        // kid-friendly cluster (centro storico)
        PlaceNode { name: "L'Antica Pizzeria da Michele".into(), lat: 40.8512, lng: 14.2618, duration_min: 45, energy_cost: 0.1, kid_friendly: true },
        PlaceNode { name: "Via San Gregorio Armeno".into(),  lat: 40.8501, lng: 14.2572, duration_min: 40,  energy_cost: 0.2, kid_friendly: true  },
        PlaceNode { name: "Spaccanapoli".into(),              lat: 40.8499, lng: 14.2531, duration_min: 90,  energy_cost: 0.5, kid_friendly: true  },
        // day-trip (kid-friendly, high energy — place on day 6)
        PlaceNode { name: "Pompeii".into(),                  lat: 40.7498, lng: 14.4862, duration_min: 240, energy_cost: 1.5, kid_friendly: true  },
        // adult-primary places
        PlaceNode { name: "Museo Archeologico Nazionale".into(), lat: 40.8531, lng: 14.2498, duration_min: 120, energy_cost: 0.7, kid_friendly: false },
        PlaceNode { name: "Napoli Sotterranea".into(),        lat: 40.8506, lng: 14.2554, duration_min: 100, energy_cost: 0.8, kid_friendly: false },
        PlaceNode { name: "Certosa di San Martino".into(),    lat: 40.8397, lng: 14.2344, duration_min: 120, energy_cost: 0.6, kid_friendly: false },
        PlaceNode { name: "Quartieri Spagnoli".into(),        lat: 40.8392, lng: 14.2461, duration_min: 75,  energy_cost: 0.4, kid_friendly: false },
    ]
}
