import { notifyLowRating } from "@/lib/booking/notify";
import { prisma } from "@/lib/db";

/** Оценка из бота: только своя выполненная запись; повторное нажатие меняет оценку */
export async function saveRating(bookingId: string, tgUserId: string, rating: number) {
  const b = await prisma.booking.findUnique({ where: { id: bookingId }, include: { master: true, service: true } });
  if (!b || b.tgUserId !== tgUserId || b.status !== "done") return null;
  const review = await prisma.review.upsert({ where: { bookingId }, create: { bookingId, rating }, update: { rating } });
  if (rating <= 3) await notifyLowRating(b, rating).catch((e) => console.error("[telegram] low rating notify failed", e));
  return review;
}

/** Текст отзыва после оценки 4–5 — только от автора */
export async function saveReviewText(reviewId: string, tgUserId: string, text: string) {
  const review = await prisma.review.findUnique({ where: { id: reviewId }, include: { booking: true } });
  if (!review || review.booking.tgUserId !== tgUserId) return false;
  await prisma.review.update({ where: { id: reviewId }, data: { text: text.trim().slice(0, 500) } });
  return true;
}

/** Для лендинга: опубликованные отзывы (имя без фамилии и авто) и средняя оценка по всем */
export async function publicReviews() {
  const [items, stats] = await Promise.all([
    prisma.review.findMany({
      where: { published: true, text: { not: "" } },
      include: { booking: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.review.aggregate({ _avg: { rating: true }, _count: true }),
  ]);
  return {
    items: items.map((r) => ({
      who: [r.booking.clientName.split(" ")[0], r.booking.car].filter(Boolean).join(", "),
      text: r.text,
      rating: r.rating,
    })),
    avg: stats._avg.rating,
    count: stats._count,
  };
}

export type PublicReviews = Awaited<ReturnType<typeof publicReviews>>;
