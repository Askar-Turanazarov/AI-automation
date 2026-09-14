import { describe, expect, it } from "vitest";
import { localizedName, localizeMaster, localizeService } from "./i18n-data";

const service = {
  id: "s1",
  price: 3_500_000,
  name: "Чип-тюнинг",
  nameUz: "Chip-tyuning",
  nameEn: "Chip tuning",
  category: "Двигатель",
  categoryUz: "",
  categoryEn: "Engine",
  description: "Прошивка ЭБУ",
  descriptionUz: "ECU proshivkasi",
  descriptionEn: "",
};

const master = {
  id: "m1",
  name: "Алишер",
  nameLatin: "Alisher",
  specialty: "Моторист",
  specialtyUz: "Motorist",
  specialtyEn: "",
  bio: "Био",
  bioUz: "",
  bioEn: "Bio",
};

describe("localizeService", () => {
  it("uses translations, falling back to RU when empty", () => {
    expect(localizeService(service, "en")).toMatchObject({ name: "Chip tuning", category: "Engine", description: "Прошивка ЭБУ" });
    expect(localizeService(service, "uz")).toMatchObject({ name: "Chip-tyuning", category: "Двигатель", description: "ECU proshivkasi" });
  });

  it("ignores translations for ru and missing fields", () => {
    expect(localizeService(service, "ru")).toMatchObject({ name: "Чип-тюнинг", category: "Двигатель", description: "Прошивка ЭБУ" });
    expect(localizeService({ name: "А", category: "Б", description: "В" }, "en")).toEqual({ name: "А", category: "Б", description: "В" });
  });

  it("keeps other fields and does not mutate the input", () => {
    const r = localizeService(service, "en");
    expect(r).toMatchObject({ id: "s1", price: 3_500_000, nameUz: "Chip-tyuning" });
    expect(service.name).toBe("Чип-тюнинг");
  });
});

describe("localizeMaster", () => {
  it("uses the Latin name for uz/en and the original for ru", () => {
    expect(localizeMaster(master, "ru")).toMatchObject({ name: "Алишер", specialty: "Моторист", bio: "Био" });
    expect(localizeMaster(master, "uz")).toMatchObject({ name: "Alisher", specialty: "Motorist", bio: "Био" });
    expect(localizeMaster(master, "en")).toMatchObject({ name: "Alisher", specialty: "Моторист", bio: "Bio", id: "m1" });
  });

  it("falls back to the original name when nameLatin is empty", () => {
    expect(localizeMaster({ ...master, nameLatin: "" }, "en").name).toBe("Алишер");
  });
});

describe("localizedName", () => {
  it("Latin for uz/en when present, otherwise the original", () => {
    expect(localizedName(master, "ru")).toBe("Алишер");
    expect(localizedName(master, "uz")).toBe("Alisher");
    expect(localizedName(master, "en")).toBe("Alisher");
    expect(localizedName({ name: "Алишер", nameLatin: "" }, "en")).toBe("Алишер");
    expect(localizedName({ name: "Алишер" }, "uz")).toBe("Алишер");
  });
});
