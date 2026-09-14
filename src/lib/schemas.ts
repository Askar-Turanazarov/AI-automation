import { z } from "zod";

const text = (max: number) => z.string().trim().max(max).default("");

export const masterInput = z.object({
  name: z.string().trim().min(2).max(60),
  nameLatin: text(60),
  specialty: z.string().trim().min(2).max(80),
  specialtyUz: text(80),
  specialtyEn: text(80),
  bio: text(400),
  bioUz: text(400),
  bioEn: text(400),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#FF5A1F"),
  active: z.boolean().default(true),
  serviceIds: z.array(z.string()).default([]),
  schedules: z
    .array(
      z
        .object({ weekday: z.number().int().min(1).max(7), startMin: z.number().int().min(0).max(1440), endMin: z.number().int().min(0).max(1440) })
        .refine((s) => s.endMin > s.startMin),
    )
    .default([]),
});

/** YYYY-MM-DD и реальная дата (2026-02-30 не пройдёт) */
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const ms = Date.parse(`${s}T00:00:00Z`);
    return !Number.isNaN(ms) && new Date(ms).toISOString().startsWith(s);
  });

/** Выходной мастера: { date, reason } — добавить; { date, remove: true } — удалить */
export const timeOffInput = z.object({
  date: isoDate,
  reason: text(200),
  remove: z.boolean().optional(),
});

export const serviceInput = z.object({
  name: z.string().trim().min(2).max(80),
  nameUz: text(80),
  nameEn: text(80),
  category: z.string().trim().min(2).max(40),
  categoryUz: text(40),
  categoryEn: text(40),
  description: text(400),
  descriptionUz: text(400),
  descriptionEn: text(400),
  durationMin: z.number().int().min(15).max(720),
  price: z.number().int().min(0),
  active: z.boolean().default(true),
});
