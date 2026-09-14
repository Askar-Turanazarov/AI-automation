import { describe, expect, it } from "vitest";
import { detectLocale, localeFromTelegram } from "./config";
import { formatDate } from "./dates";
import { dictionaries, tpl } from "./index";

describe("locale detection", () => {
  it("prefers the saved cookie", () => {
    expect(detectLocale("uz", "en-US,en;q=0.9")).toBe("uz");
  });
  it("falls back to the first supported browser language", () => {
    expect(detectLocale(undefined, "de-DE,en-US;q=0.8,ru;q=0.5")).toBe("en");
    expect(detectLocale(null, "uz-UZ,ru;q=0.9")).toBe("uz");
    expect(detectLocale("xx", "fr-FR")).toBe("ru");
  });
  it("maps Telegram language codes", () => {
    expect(localeFromTelegram("uz")).toBe("uz");
    expect(localeFromTelegram("en-GB")).toBe("en");
    expect(localeFromTelegram("kk")).toBe("ru");
  });
});

describe("dates", () => {
  it("formats per locale", () => {
    expect(formatDate("2026-09-11", "ru")).toBe("Пт, 11 сентября");
    expect(formatDate("2026-09-11", "uz")).toBe("11-sentabr, juma");
    expect(formatDate("2026-09-11", "en")).toBe("Fri, Sep 11");
    expect(formatDate("2026-09-11", "en", false)).toBe("Sep 11");
  });
});

describe("dictionaries", () => {
  const shape = (o: unknown): unknown =>
    Array.isArray(o)
      ? o.map(shape)
      : o && typeof o === "object"
        ? Object.fromEntries(
            Object.keys(o)
              .sort()
              .map((k) => [k, shape((o as Record<string, unknown>)[k])]),
          )
        : typeof o;

  const placeholders = (o: unknown, path = ""): Record<string, string> =>
    typeof o === "string"
      ? { [path]: (o.match(/\{\w+\}/g) ?? []).sort().join(",") }
      : o && typeof o === "object"
        ? Object.assign({}, ...Object.entries(o).map(([k, v]) => placeholders(v, `${path}.${k}`)))
        : {};

  it("uz and en have exactly the same structure as ru", () => {
    expect(shape(dictionaries.uz)).toEqual(shape(dictionaries.ru));
    expect(shape(dictionaries.en)).toEqual(shape(dictionaries.ru));
  });

  it("keep the same {placeholders} in every string", () => {
    expect(placeholders(dictionaries.uz)).toEqual(placeholders(dictionaries.ru));
    expect(placeholders(dictionaries.en)).toEqual(placeholders(dictionaries.ru));
  });

  it("uzbek texts are in Latin script", () => {
    const cyr = Object.entries(placeholders(dictionaries.uz)).length && JSON.stringify(dictionaries.uz).match(/[А-Яа-яЁё]+/g);
    // допустимы только названия языков в переключателе и т.п. — в словаре их нет
    expect(cyr || []).toEqual([]);
  });

  it("tpl substitutes variables", () => {
    expect(tpl("{n} bookings · {sum}", { n: 3, sum: "1 UZS" })).toBe("3 bookings · 1 UZS");
    expect(tpl("keep {missing}", {})).toBe("keep {missing}");
  });
});
