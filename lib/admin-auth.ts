import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE_NAME = "sector_admin_session";

const SESSION_TTL_SECONDS = 60 * 60 * 8;

function getAuthSecret(): string {
  return (
    process.env.ADMIN_AUTH_SECRET ||
    `${process.env.ADMIN_USERNAME ?? "admin"}:${process.env.ADMIN_PASSWORD ?? "replace_with_strong_password"}:sector-admin-secret`
  );
}

function getExpectedUsername(): string {
  return process.env.ADMIN_USERNAME ?? "admin";
}

function getExpectedPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "replace_with_strong_password";
}

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function hmac(value: string): string {
  return createHmac("sha256", getAuthSecret()).update(value).digest("base64url");
}

function secureEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function isValidAdminCredentials(username: string, password: string): boolean {
  const expectedUsername = getExpectedUsername();
  const expectedPassword = getExpectedPassword();
  return secureEqual(username, expectedUsername) && secureEqual(password, expectedPassword);
}

export function createAdminSessionToken(username: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    username,
    exp: now + SESSION_TTL_SECONDS,
    nonce: randomBytes(16).toString("hex"),
  };

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = hmac(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function isValidAdminSessionToken(token: string | undefined): boolean {
  if (!token) {
    return false;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return false;
  }

  const expectedSignature = hmac(encodedPayload);
  if (!secureEqual(signature, expectedSignature)) {
    return false;
  }

  try {
    const parsed = JSON.parse(fromBase64Url(encodedPayload)) as {
      username?: string;
      exp?: number;
    };

    if (!parsed?.username || typeof parsed.exp !== "number") {
      return false;
    }

    if (!secureEqual(parsed.username, getExpectedUsername())) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    return parsed.exp > now;
  } catch {
    return false;
  }
}

export function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}
