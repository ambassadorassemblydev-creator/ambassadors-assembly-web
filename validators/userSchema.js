import { z } from 'zod';

export const updateProfileSchema = z.object({
  firstName: z.string().min(2, "First name is too short").max(50),
  lastName: z.string().min(2, "Last name is too short").max(50),
  phone: z.string().optional().nullable(),
  addressLine1: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  bio: z.string().max(500, "Bio must be under 500 characters").optional().nullable()
});