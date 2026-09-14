import { afterEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  prisma: { booking: { findUnique: vi.fn() }, review: { upsert: vi.fn(), findUnique: vi.fn(), update: vi.fn() } },
  notifyLowRating: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: m.prisma }));
vi.mock("@/lib/booking/notify", () => ({ notifyLowRating: m.notifyLowRating }));

import { saveRating, saveReviewText } from "./reviews";

afterEach(() => vi.resetAllMocks());

describe("saveRating", () => {
  const done = { id: "b1", tgUserId: "555", status: "done" };

  it("accepts ratings only for the client's own completed booking", async () => {
    m.prisma.booking.findUnique.mockResolvedValueOnce(done).mockResolvedValueOnce({ ...done, status: "confirmed" });
    expect(await saveRating("b1", "777", 5)).toBeNull();
    expect(await saveRating("b1", "555", 5)).toBeNull();
    expect(m.prisma.review.upsert).not.toHaveBeenCalled();
  });

  it("upserts the rating and alerts the owner only about low scores", async () => {
    m.prisma.booking.findUnique.mockResolvedValue(done);
    m.prisma.review.upsert.mockResolvedValue({ id: "r1" });
    m.notifyLowRating.mockResolvedValue(undefined);

    expect(await saveRating("b1", "555", 5)).toEqual({ id: "r1" });
    expect(m.notifyLowRating).not.toHaveBeenCalled();

    await saveRating("b1", "555", 2);
    expect(m.prisma.review.upsert).toHaveBeenLastCalledWith({
      where: { bookingId: "b1" },
      create: { bookingId: "b1", rating: 2 },
      update: { rating: 2 },
    });
    expect(m.notifyLowRating).toHaveBeenCalledWith(done, 2);
  });
});

describe("saveReviewText", () => {
  it("saves trimmed text only for the author", async () => {
    m.prisma.review.findUnique.mockResolvedValue({ id: "r1", booking: { tgUserId: "555" } });
    expect(await saveReviewText("r1", "777", "hi")).toBe(false);
    expect(await saveReviewText("r1", "555", "  Отлично!  ")).toBe(true);
    expect(m.prisma.review.update).toHaveBeenCalledWith({ where: { id: "r1" }, data: { text: "Отлично!" } });
  });
});
