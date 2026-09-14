export type BookingErrorCode = "service_not_found" | "slot_taken" | "slot_just_taken" | "not_found" | "photo_failed";

/** Ожидаемая ошибка записи; code — ключ в t.errors */
export class BookingError extends Error {
  constructor(public code: BookingErrorCode) {
    super(code);
  }
}
