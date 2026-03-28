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

pub fn napoli_family_plan() -> DayPlan {
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

    plan_day(&places, 8.0)
}
