import { SignJWT, jwtVerify } from "jose";

export const ADMIN_COOKIE = "of_admin";

const secret = () => {
  const s = process.env.AUTH_SECRET;
  // в проде без секрета любой смог бы подписать токен админа известным ключом
  if (!s && process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(s || "dev-secret-change-me");
};

export async function createAdminToken() {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifyAdminToken(token?: string) {
  if (!token) return false;
  const key = secret(); // ошибка конфигурации не должна тихо превращаться в «не авторизован»
  try {
    const { payload } = await jwtVerify(token, key);
    return payload.role === "admin";
  } catch {
    return false;
  }
}
