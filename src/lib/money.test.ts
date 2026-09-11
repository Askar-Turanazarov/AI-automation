import { describe, expect, it } from "vitest";
import { compactUZS, formatPriceLine, formatUSD, formatUZS } from "./money";

const NBSP = " ";

describe("money", () => {
  it("formats sums per locale", () => {
    expect(formatUZS(3_500_000, "ru")).toBe(`3${NBSP}500${NBSP}000${NBSP}сум`);
    expect(formatUZS(3_500_000, "uz")).toBe(`3${NBSP}500${NBSP}000${NBSP}so'm`);
    expect(formatUZS(3_500_000, "en")).toBe("3,500,000 UZS");
    expect(formatUZS(900, "en")).toBe("900 UZS");
  });

  it("converts to USD at 11,900 sum per dollar", () => {
    expect(formatUSD(3_500_000)).toBe(`≈${NBSP}$294`);
    expect(formatUSD(18_500_000)).toBe(`≈${NBSP}$1,555`);
    expect(formatPriceLine(900_000, "en")).toBe(`900,000 UZS (≈${NBSP}$76)`);
  });

  it("compacts for chart axes", () => {
    expect(compactUZS(3_500_000, "ru")).toBe(`3,5${NBSP}млн`);
    expect(compactUZS(3_500_000, "uz")).toBe(`3,5${NBSP}mln`);
    expect(compactUZS(3_500_000, "en")).toBe("3.5M");
    expect(compactUZS(1_200_000_000, "en")).toBe("1.2B");
    expect(compactUZS(0, "ru")).toBe("0");
  });
});
