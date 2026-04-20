import { z } from "zod";

const currentYear = new Date().getFullYear();

export const createCarSchema = z.object({
  make: z.string().min(1).max(80),
  model: z.string().min(1).max(80),
  year: z.coerce.number().int().min(1900).max(currentYear + 2),
  vin: z.string().max(32).optional().nullable(),
  licensePlate: z.string().max(16).optional().nullable(),
  nickname: z.string().max(60).optional().nullable(),
  odometerMiles: z.coerce.number().int().min(0).max(2_000_000).optional().nullable(),
  color: z.string().max(32).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateCarSchema = createCarSchema.partial();

export const createServiceRecordSchema = z.object({
  carId: z.string().uuid(),
  type: z.string().min(1).max(80),
  serviceDate: z.coerce.date(),
  odometerMiles: z.coerce.number().int().min(0).max(2_000_000).optional().nullable(),
  costCents: z.coerce.number().int().min(0).max(100_000_000).optional().nullable(),
  vendor: z.string().max(120).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export type CreateCarInput = z.infer<typeof createCarSchema>;
export type UpdateCarInput = z.infer<typeof updateCarSchema>;
export type CreateServiceRecordInput = z.infer<typeof createServiceRecordSchema>;
