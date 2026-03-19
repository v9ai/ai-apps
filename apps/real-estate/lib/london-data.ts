// ─── Shared London market dataset ──────────────────────────────────────────
// Land Registry + ONS 2025-2026 data, used by all predict/london components.

export type Borough = {
  name: string;
  zone: string;
  avgPricePerM2: number;
  avgPrice: number;
  yieldLow: number;
  yieldHigh: number;
  growth1y: number;
  trend: "rising" | "stable" | "declining";
  tier: "prime" | "inner_premium" | "inner" | "outer" | "outer_affordable";
};

export const BOROUGHS: Borough[] = [
  // Prime Central
  { name: "Kensington & Chelsea", zone: "1", avgPricePerM2: 21797, avgPrice: 1275000, yieldLow: 4.0, yieldHigh: 5.0, growth1y: -1.5, trend: "declining", tier: "prime" },
  { name: "Westminster", zone: "1", avgPricePerM2: 19749, avgPrice: 891000, yieldLow: 4.0, yieldHigh: 5.0, growth1y: 0.8, trend: "stable", tier: "prime" },
  { name: "Camden", zone: "1-2", avgPricePerM2: 14863, avgPrice: 896000, yieldLow: 4.5, yieldHigh: 5.5, growth1y: 2.1, trend: "stable", tier: "prime" },
  { name: "City of London", zone: "1", avgPricePerM2: 13500, avgPrice: 750000, yieldLow: 4.0, yieldHigh: 5.0, growth1y: 1.2, trend: "stable", tier: "prime" },
  // Inner Premium
  { name: "Hammersmith & Fulham", zone: "2", avgPricePerM2: 12153, avgPrice: 764000, yieldLow: 4.5, yieldHigh: 5.5, growth1y: 2.5, trend: "stable", tier: "inner_premium" },
  { name: "Islington", zone: "1-2", avgPricePerM2: 11280, avgPrice: 634000, yieldLow: 4.5, yieldHigh: 5.5, growth1y: 2.8, trend: "rising", tier: "inner_premium" },
  { name: "Wandsworth", zone: "2-3", avgPricePerM2: 9517, avgPrice: 600000, yieldLow: 4.5, yieldHigh: 5.5, growth1y: 2.9, trend: "rising", tier: "inner_premium" },
  { name: "Haringey", zone: "2-3", avgPricePerM2: 9500, avgPrice: 550000, yieldLow: 5.5, yieldHigh: 6.5, growth1y: 3.5, trend: "rising", tier: "inner_premium" },
  { name: "Southwark", zone: "1-2", avgPricePerM2: 8784, avgPrice: 550000, yieldLow: 5.0, yieldHigh: 5.5, growth1y: 2.2, trend: "stable", tier: "inner_premium" },
  { name: "Hackney", zone: "2", avgPricePerM2: 8541, avgPrice: 634000, yieldLow: 5.0, yieldHigh: 5.5, growth1y: 6.3, trend: "rising", tier: "inner_premium" },
  { name: "Lambeth", zone: "2", avgPricePerM2: 8440, avgPrice: 530000, yieldLow: 5.0, yieldHigh: 5.5, growth1y: 2.4, trend: "rising", tier: "inner_premium" },
  { name: "Richmond upon Thames", zone: "3-4", avgPricePerM2: 8190, avgPrice: 650000, yieldLow: 4.0, yieldHigh: 4.5, growth1y: 1.8, trend: "stable", tier: "inner_premium" },
  // Inner Mid-Range
  { name: "Brent", zone: "2-3", avgPricePerM2: 7927, avgPrice: 500000, yieldLow: 5.0, yieldHigh: 5.5, growth1y: 2.6, trend: "rising", tier: "inner" },
  { name: "Tower Hamlets", zone: "2", avgPricePerM2: 7914, avgPrice: 480000, yieldLow: 5.0, yieldHigh: 5.5, growth1y: 3.0, trend: "rising", tier: "inner" },
  { name: "Barnet", zone: "3-4", avgPricePerM2: 7673, avgPrice: 530000, yieldLow: 4.5, yieldHigh: 5.0, growth1y: 1.9, trend: "stable", tier: "inner" },
  { name: "Ealing", zone: "3", avgPricePerM2: 7412, avgPrice: 480000, yieldLow: 5.0, yieldHigh: 5.5, growth1y: 4.2, trend: "rising", tier: "inner" },
  { name: "Merton", zone: "3-4", avgPricePerM2: 7339, avgPrice: 500000, yieldLow: 4.5, yieldHigh: 5.0, growth1y: 2.0, trend: "stable", tier: "inner" },
  // Outer
  { name: "Hounslow", zone: "3-4", avgPricePerM2: 6596, avgPrice: 420000, yieldLow: 5.0, yieldHigh: 5.5, growth1y: 3.1, trend: "rising", tier: "outer" },
  { name: "Lewisham", zone: "2-3", avgPricePerM2: 6421, avgPrice: 430000, yieldLow: 5.0, yieldHigh: 5.5, growth1y: 3.8, trend: "rising", tier: "outer" },
  { name: "Harrow", zone: "5", avgPricePerM2: 6202, avgPrice: 450000, yieldLow: 5.0, yieldHigh: 5.5, growth1y: 2.3, trend: "stable", tier: "outer" },
  { name: "Greenwich", zone: "2-3", avgPricePerM2: 6171, avgPrice: 410000, yieldLow: 5.5, yieldHigh: 6.5, growth1y: 5.8, trend: "rising", tier: "outer" },
  { name: "Kingston upon Thames", zone: "5-6", avgPricePerM2: 6171, avgPrice: 470000, yieldLow: 4.5, yieldHigh: 5.0, growth1y: 1.7, trend: "stable", tier: "outer" },
  { name: "Waltham Forest", zone: "3-4", avgPricePerM2: 5973, avgPrice: 430000, yieldLow: 5.0, yieldHigh: 5.5, growth1y: 3.2, trend: "rising", tier: "outer" },
  { name: "Enfield", zone: "4-5", avgPricePerM2: 5946, avgPrice: 400000, yieldLow: 5.0, yieldHigh: 5.5, growth1y: 2.4, trend: "stable", tier: "outer" },
  // Outer Affordable
  { name: "Hillingdon", zone: "5-6", avgPricePerM2: 5449, avgPrice: 400000, yieldLow: 5.0, yieldHigh: 5.5, growth1y: 2.1, trend: "stable", tier: "outer_affordable" },
  { name: "Bromley", zone: "4-5", avgPricePerM2: 5291, avgPrice: 430000, yieldLow: 4.5, yieldHigh: 5.0, growth1y: 2.5, trend: "stable", tier: "outer_affordable" },
  { name: "Redbridge", zone: "4", avgPricePerM2: 5261, avgPrice: 400000, yieldLow: 5.0, yieldHigh: 5.5, growth1y: 2.8, trend: "rising", tier: "outer_affordable" },
  { name: "Croydon", zone: "5", avgPricePerM2: 5258, avgPrice: 380000, yieldLow: 5.5, yieldHigh: 6.5, growth1y: 3.5, trend: "rising", tier: "outer_affordable" },
  { name: "Newham", zone: "3", avgPricePerM2: 5118, avgPrice: 370000, yieldLow: 5.5, yieldHigh: 6.5, growth1y: 4.5, trend: "rising", tier: "outer_affordable" },
  { name: "Sutton", zone: "5", avgPricePerM2: 4964, avgPrice: 370000, yieldLow: 5.0, yieldHigh: 5.5, growth1y: 2.0, trend: "stable", tier: "outer_affordable" },
  { name: "Bexley", zone: "5", avgPricePerM2: 4587, avgPrice: 350000, yieldLow: 5.0, yieldHigh: 5.5, growth1y: 5.1, trend: "rising", tier: "outer_affordable" },
  { name: "Havering", zone: "6", avgPricePerM2: 4506, avgPrice: 370000, yieldLow: 5.0, yieldHigh: 5.5, growth1y: 2.2, trend: "stable", tier: "outer_affordable" },
  { name: "Barking & Dagenham", zone: "4-5", avgPricePerM2: 3916, avgPrice: 354000, yieldLow: 5.5, yieldHigh: 6.5, growth1y: 3.8, trend: "rising", tier: "outer_affordable" },
];

export type ElizabethLineStation = {
  name: string;
  borough: string;
  growthYoY: number;
  rentalUplift: string;
  rentalUpliftPct: number; // numeric for charts
};

export const ELIZABETH_LINE: ElizabethLineStation[] = [
  { name: "Ealing Broadway", borough: "Ealing", growthYoY: 9.0, rentalUplift: "+25-30%", rentalUpliftPct: 27.5 },
  { name: "Woolwich", borough: "Greenwich", growthYoY: 7.9, rentalUplift: "+28%", rentalUpliftPct: 28 },
  { name: "Abbey Wood", borough: "Bexley/Greenwich", growthYoY: 6.5, rentalUplift: "+22%", rentalUpliftPct: 22 },
  { name: "Custom House", borough: "Newham", growthYoY: 6.2, rentalUplift: "+26%", rentalUpliftPct: 26 },
  { name: "Stratford", borough: "Newham", growthYoY: 5.8, rentalUplift: "+20%", rentalUpliftPct: 20 },
  { name: "Forest Gate", borough: "Newham", growthYoY: 5.5, rentalUplift: "+18%", rentalUpliftPct: 18 },
  { name: "Whitechapel", borough: "Tower Hamlets", growthYoY: 4.8, rentalUplift: "+15%", rentalUpliftPct: 15 },
  { name: "Tottenham Court Road", borough: "Camden", growthYoY: 3.2, rentalUplift: "+10%", rentalUpliftPct: 10 },
];

export type HedonicFactor = {
  factor: string;
  adjustment: string;
  adjustLow: number;  // numeric low end (%)
  adjustHigh: number; // numeric high end (%)
  isAbsolute?: boolean; // true if adjustment is GBP not %
  notes: string;
};

export const HEDONIC_FACTORS: HedonicFactor[] = [
  { factor: "New build", adjustment: "+15 to +25%", adjustLow: 15, adjustHigh: 25, notes: "New builds avg 10,400/m vs 7,100/m existing (47% London-wide premium)" },
  { factor: "Refurbished", adjustment: "+5 to +10%", adjustLow: 5, adjustHigh: 10, notes: "Modern kitchen/bathroom, rewired, replumbed" },
  { factor: "Needs work", adjustment: "-15 to -25%", adjustLow: -25, adjustHigh: -15, notes: "Structural or cosmetic renovation required" },
  { factor: "Ground floor (flat)", adjustment: "-5 to -10%", adjustLow: -10, adjustHigh: -5, notes: "Security, noise, less light" },
  { factor: "High floor (10+)", adjustment: "+5 to +10%", adjustLow: 5, adjustHigh: 10, notes: "Views, light, prestige" },
  { factor: "Garden", adjustment: "+5 to +10%", adjustLow: 5, adjustHigh: 10, notes: "Higher for houses; +3-5% for ground floor flats" },
  { factor: "Parking (Zone 1-2)", adjustment: "+20K-50K", adjustLow: 20000, adjustHigh: 50000, isAbsolute: true, notes: "Absolute value add, not percentage" },
  { factor: "Parking (Zone 3-6)", adjustment: "+10K-25K", adjustLow: 10000, adjustHigh: 25000, isAbsolute: true, notes: "Lower premium in outer boroughs" },
  { factor: "Balcony/terrace", adjustment: "+2 to +5%", adjustLow: 2, adjustHigh: 5, notes: "Post-COVID premium for outdoor space" },
  { factor: "EPC A-B", adjustment: "+3 to +5%", adjustLow: 3, adjustHigh: 5, notes: "Energy efficiency premium growing" },
  { factor: "EPC F-G", adjustment: "-8 to -15%", adjustLow: -15, adjustHigh: -8, notes: "Regulatory risk, upgrade costs" },
  { factor: "Leasehold <80yr", adjustment: "-10 to -30%", adjustLow: -30, adjustHigh: -10, notes: "Marriage value, lease extension costs" },
  { factor: "Tube within 500m", adjustment: "+8%", adjustLow: 8, adjustHigh: 8, notes: "Nationwide 2025 research" },
  { factor: "Tube within 750m", adjustment: "+5.6%", adjustLow: 5.6, adjustHigh: 5.6, notes: "Proximity premium decays rapidly" },
  { factor: "Period property (prime)", adjustment: "+5 to +10%", adjustLow: 5, adjustHigh: 10, notes: "Character premium in central boroughs only" },
];

export const STAMP_DUTY_BANDS = [
  { band: "Up to 250,000", rate: "0%", ftb: "0% (up to 425K)", threshold: 250000, pct: 0 },
  { band: "250,001 - 925,000", rate: "5%", ftb: "5% (425K-625K)", threshold: 925000, pct: 5 },
  { band: "925,001 - 1,500,000", rate: "10%", ftb: "Standard rates", threshold: 1500000, pct: 10 },
  { band: "Over 1,500,000", rate: "12%", ftb: "Standard rates", threshold: Infinity, pct: 12 },
  { band: "Additional property", rate: "+5% surcharge", ftb: "N/A", threshold: 0, pct: 5 },
  { band: "Non-UK resident", rate: "+2% surcharge", ftb: "+2% surcharge", threshold: 0, pct: 2 },
];

export const RENTAL_DATA = [
  { area: "Kensington & Chelsea", r1: "2,200-3,000", r2: "3,000-4,500", r1Low: 2200, r1High: 3000, r2Low: 3000, r2High: 4500 },
  { area: "Westminster", r1: "2,000-2,800", r2: "2,800-4,000", r1Low: 2000, r1High: 2800, r2Low: 2800, r2High: 4000 },
  { area: "Islington / Camden", r1: "1,800-2,300", r2: "2,400-3,200", r1Low: 1800, r1High: 2300, r2Low: 2400, r2High: 3200 },
  { area: "Hackney / Tower Hamlets", r1: "1,600-2,000", r2: "2,200-2,800", r1Low: 1600, r1High: 2000, r2Low: 2200, r2High: 2800 },
  { area: "Wandsworth / Lambeth", r1: "1,500-1,900", r2: "2,000-2,600", r1Low: 1500, r1High: 1900, r2Low: 2000, r2High: 2600 },
  { area: "Greenwich / Lewisham", r1: "1,300-1,600", r2: "1,700-2,200", r1Low: 1300, r1High: 1600, r2Low: 1700, r2High: 2200 },
  { area: "Newham / Barking", r1: "1,200-1,500", r2: "1,500-1,900", r1Low: 1200, r1High: 1500, r2Low: 1500, r2High: 1900 },
  { area: "Croydon / Bromley", r1: "1,100-1,400", r2: "1,400-1,800", r1Low: 1100, r1High: 1400, r2Low: 1400, r2High: 1800 },
  { area: "Outer boroughs", r1: "1,000-1,300", r2: "1,300-1,700", r1Low: 1000, r1High: 1300, r2Low: 1300, r2High: 1700 },
];

export const TIER_LABEL: Record<string, string> = {
  prime: "Prime Central",
  inner_premium: "Inner Premium",
  inner: "Inner Mid-Range",
  outer: "Outer London",
  outer_affordable: "Outer Affordable",
};

export const TIER_COLOR: Record<string, string> = {
  prime: "#6366f1",      // iris
  inner_premium: "#3b82f6", // blue
  inner: "#14b8a6",      // teal
  outer: "#f97316",      // orange
  outer_affordable: "#f59e0b", // amber
};

// Price growth forecasts (2025-2026)
export const GROWTH_FORECASTS = [
  { area: "London overall", low: 3, high: 5, source: "Savills/JLL consensus" },
  { area: "Elizabeth Line corridor", low: 5, high: 8, source: "CBRE Crossrail Report" },
  { area: "East London regeneration", low: 4, high: 7, source: "Land Registry + forecasts" },
  { area: "Prime Central recovery", low: 1, high: 3, source: "Savills Prime Index" },
  { area: "South London gentrification", low: 3, high: 6, source: "JLL UK Outlook" },
  { area: "Outer suburban", low: 2, high: 4, source: "ONS HPI + Savills" },
];

// Helpers
export const fmt = (n: number) => n.toLocaleString("en-GB");
export const fmtK = (n: number) =>
  n >= 1_000_000 ? `\u00A3${(n / 1_000_000).toFixed(1)}M` : `\u00A3${Math.round(n / 1000)}K`;
export const fmtGBP = (n: number) => `\u00A3${n.toLocaleString("en-GB")}`;

export function computeStampDuty(price: number, isAdditional = false, isNonResident = false): number {
  let duty = 0;
  if (price > 250_000) {
    duty += Math.min(price, 925_000) - 250_000;
    duty = Math.round(duty * 0.05);
  }
  if (price > 925_000) {
    duty += Math.round((Math.min(price, 1_500_000) - 925_000) * 0.10);
  }
  if (price > 1_500_000) {
    duty += Math.round((price - 1_500_000) * 0.12);
  }
  if (isAdditional) duty += Math.round(price * 0.05);
  if (isNonResident) duty += Math.round(price * 0.02);
  return duty;
}

export function computeStampDutyFTB(price: number): number {
  if (price > 625_000) return computeStampDuty(price);
  if (price <= 425_000) return 0;
  return Math.round((price - 425_000) * 0.05);
}
