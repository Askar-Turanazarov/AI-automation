import { z } from "zod";

export const masterInput = z.object({
  name: z.string().trim().min(2, "Имя слишком короткое").max(60),
  specialty: z.string().trim().min(2, "Укажите специализацию").max(80),
  bio: z.string().trim().max(400).default(""),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#FF5A1F"),
  active: z.boolean().default(true),
  serviceIds: z.array(z.string()).default([]),
  schedules: z
    .array(
      z
        .object({ weekday: z.number().int().min(1).max(7), startMin: z.number().int().min(0).max(1440), endMin: z.number().int().min(0).max(1440) })
        .refine((s) => s.endMin > s.startMin, "Конец смены должен быть позже начала"),
    )
    .default([]),
});

export const serviceInput = z.object({
  name: z.string().trim().min(2).max(80),
  category: z.string().trim().min(2).max(40),
  description: z.string().trim().max(400).default(""),
  durationMin: z.number().int().min(15).max(720),
  price: z.number().int().min(0),
  active: z.boolean().default(true),
});
