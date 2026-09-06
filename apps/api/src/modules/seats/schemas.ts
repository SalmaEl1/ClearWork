import { z } from "zod";

export const createSeatReservationSchema = z
  .object({
    date: z.string().date("date debe tener formato AAAA-MM-DD"),
    seatNumber: z.coerce.number().int().positive(),
  });

export const getSeatAvailabilityQuerySchema = z.object({
  date: z.string().date("date debe tener formato AAAA-MM-DD"),
});
