// Статусы и источники записи. В БД это строки (см. prisma/schema.prisma), здесь — единый список значений.

export const BOOKING_STATUSES = ["pending", "confirmed", "done", "cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Записи, которые ещё предстоят */
export const UPCOMING_STATUSES: BookingStatus[] = ["confirmed", "pending"];

/** Prisma-фильтр «запись не отменена» */
export const NOT_CANCELLED = { not: "cancelled" } as const;

export const BOOKING_SOURCES = ["web", "bot", "ai"] as const;
export type BookingSource = (typeof BOOKING_SOURCES)[number];
