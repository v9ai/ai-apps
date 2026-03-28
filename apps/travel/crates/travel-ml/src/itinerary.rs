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
