import type { Prisma, WorkUpdate } from "@prisma/client";
import type { Locale } from "@/i18n/config";
import { formatDate } from "@/i18n/dates";
import { localizedName, localizeService } from "@/lib/i18n-data";
import { formatTimeRange } from "@/lib/time";
import type { BookingStatus } from "./status";

type FullBooking = Prisma.BookingGetPayload<{ include: { master: true; service: true } }> & { updates?: WorkUpdate[] };

/** Запись глазами клиента: локализованные тексты, без контактов и служебных полей */
export const bookingView = (b: FullBooking, locale: Locale) => ({
  id: b.id,
  serviceId: b.serviceId,
  service: localizeService(b.service, locale).name,
  master: localizedName(b.master, locale),
  color: b.master.color,
  date: formatDate(b.date, locale),
  time: formatTimeRange(b.startMin, b.endMin),
  price: b.service.price,
  status: b.status as BookingStatus,
  confirmed: !!b.confirmedAt,
  // ход работ: фото отдаются через /api/photos/[id]
  updates: (b.updates ?? []).map((u) => ({
    id: u.id,
    text: u.text,
    photo: u.photoFileId ? `/api/photos/${u.id}` : null,
    at: u.createdAt.toISOString(),
  })),
});

export type BookingView = ReturnType<typeof bookingView>;
