import { afterEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  prisma: { booking: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() } },
  notifyReminder: vi.fn(),
  notifyVisitConfirmed: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: m.prisma }));
vi.mock("./notify", () => ({ notifyReminder: m.notifyReminder, notifyVisitConfirmed: m.notifyVisitConfirmed }));

import { addDays, todayISO } from "@/lib/time";
import { confirmVisit, sendReminders } from "./reminders";

afterEach(() => vi.resetAllMocks());

describe("sendReminders", () => {
  it("reminds Telegram clients about tomorrow's active bookings once and marks them", async () => {
    m.prisma.booking.findMany.mockResolvedValue([{ id: "b1" }, { id: "b2" }]);
    m.notifyReminder.mockRejectedValueOnce(new Error("telegram down")).mockResolvedValue(undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await sendReminders()).toBe(2);
    expect(m.prisma.booking.findMany).toHaveBeenCalledWith({
      where: { date: addDays(todayISO(), 1), status: { in: ["confirmed", "pending"] }, tgUserId: { not: null }, remindedAt: null },
      include: { master: true, service: true },
    });
    // сбой отправки не мешает пометить запись и продолжить
    expect(m.prisma.booking.update).toHaveBeenCalledTimes(2);
    expect(m.prisma.booking.update).toHaveBeenCalledWith({ where: { id: "b1" }, data: { remindedAt: expect.any(Date) } });
  });
});

describe("confirmVisit", () => {
  it("confirms only the client's own upcoming booking", async () => {
    const own = { id: "b1", tgUserId: "555", status: "confirmed" };
    m.prisma.booking.findUnique
      .mockResolvedValueOnce(own)
      .mockResolvedValueOnce({ ...own, status: "cancelled" })
      .mockResolvedValueOnce(own);
    m.notifyVisitConfirmed.mockResolvedValue(undefined);

    expect(await confirmVisit("b1", "777")).toBe(false);
    expect(await confirmVisit("b1", "555")).toBe(false);
    expect(m.prisma.booking.update).not.toHaveBeenCalled();

    expect(await confirmVisit("b1", "555")).toBe(true);
    expect(m.prisma.booking.update).toHaveBeenCalledWith({ where: { id: "b1" }, data: { confirmedAt: expect.any(Date) } });
    expect(m.notifyVisitConfirmed).toHaveBeenCalledOnce();
  });
});
