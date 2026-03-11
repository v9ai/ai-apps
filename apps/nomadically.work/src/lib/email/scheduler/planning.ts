/**
 * Email scheduling planning — adaptive daily limits based on recipient count
 */

export interface AdaptiveSchedulingConfig {
  contactCount: number;
  maxDays?: number;
  minPerDay?: number;
  maxPerDay?: number;
  smallCompanyThreshold?: number;
}

export interface SchedulingPlan {
  emailsPerDay: number;
  totalDays: number;
  withinLimit: boolean;
  description: string;
}

/**
 * Calculate optimal email scheduling based on contact count.
 *
 * - < 50 contacts: max 5 emails/day (conservative)
 * - >= 50 contacts: scale up to fit within maxDays
 * - Maximum 30 calendar days (Resend API limit)
 */
export function calculateSchedulingPlan(
  config: AdaptiveSchedulingConfig,
): SchedulingPlan {
  const {
    contactCount,
    maxDays = 30,
    minPerDay = 5,
    maxPerDay = 30,
    smallCompanyThreshold = 50,
  } = config;

  if (contactCount === 0) {
    return {
      emailsPerDay: 0,
      totalDays: 0,
      withinLimit: true,
      description: "No contacts to schedule",
    };
  }

  if (contactCount < smallCompanyThreshold) {
    const emailsPerDay = Math.min(minPerDay, contactCount);
    const totalDays = Math.ceil(contactCount / emailsPerDay);
    return {
      emailsPerDay,
      totalDays,
      withinLimit: totalDays <= maxDays,
      description: `Small batch: ${emailsPerDay} emails/day over ${totalDays} days`,
    };
  }

  const emailsPerDay = Math.ceil(contactCount / maxDays);
  const totalDays = Math.ceil(contactCount / emailsPerDay);
  const withinLimit = totalDays <= maxDays;

  let description: string;
  if (withinLimit) {
    if (emailsPerDay > maxPerDay) {
      description = `High volume: ${emailsPerDay} emails/day over ${totalDays} days (exceeds standard ${maxPerDay}/day limit)`;
    } else {
      description = `${emailsPerDay} emails/day over ${totalDays} days`;
    }
  } else {
    description = `Cannot fit ${contactCount} contacts in ${maxDays} days (would need ${totalDays} days at ${emailsPerDay} emails/day)`;
  }

  return { emailsPerDay, totalDays, withinLimit, description };
}
