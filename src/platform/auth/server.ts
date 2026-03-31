import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isAddress, type Address } from "viem";
import {
  AUTH_NONCE_TTL_MS,
  AUTH_SESSION_COOKIE_NAME,
  AUTH_SESSION_TTL_MS,
  type AuthSession,
} from "./shared";

type NonceStore = Map<string, number>;

const globalNonceStore = globalThis as typeof globalThis & {
  __authNonceStore?: NonceStore;
};

if (!globalNonceStore.__authNonceStore) {
  globalNonceStore.__authNonceStore = new Map<string, number>();
}

const authNonceStore = globalNonceStore.__authNonceStore;

type AuthDebugDetails = Record<string, unknown>;

function getSessionSecret() {
  const configured = process.env.AUTH_SESSION_SECRET?.trim();
  if (configured) {
    return configured;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SESSION_SECRET is required in production");
  }

  return "base-fury-dev-session-secret";
}

function cleanupExpiredNonces(nowMs = Date.now()) {
  for (const [nonce, expiresAt] of authNonceStore) {
    if (expiresAt <= nowMs) {
      authNonceStore.delete(nonce);
    }
  }
}

export function issueAuthNonce() {
  cleanupExpiredNonces();
  const nonce = randomBytes(16).toString("hex");
  authNonceStore.set(nonce, Date.now() + AUTH_NONCE_TTL_MS);
  return nonce;
}

export function consumeAuthNonce(nonce: string) {
  cleanupExpiredNonces();
  const expiresAt = authNonceStore.get(nonce);
  if (!expiresAt) {
    return false;
  }

  authNonceStore.delete(nonce);
  return expiresAt > Date.now();
}

function createSessionSignature(payload: string) {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

function isValidSessionPayload(value: unknown): value is AuthSession {
  if (!value || typeof value !== "object") return false;

  const session = value as Partial<AuthSession>;
  if (typeof session.address !== "string" || !isAddress(session.address)) return false;
  if (typeof session.chainId !== "number" || !Number.isInteger(session.chainId) || session.chainId <= 0) {
    return false;
  }
  if (typeof session.issuedAt !== "string" || Number.isNaN(Date.parse(session.issuedAt))) return false;
  if (typeof session.expiresAt !== "string" || Number.isNaN(Date.parse(session.expiresAt))) return false;

  return true;
}

function encodeSession(session: AuthSession) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signature = createSessionSignature(payload);
  return `${payload}.${signature}`;
}

function decodeSession(token: string | undefined): AuthSession | null {
  if (!token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = createSessionSignature(payload);
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expectedSignature);
  if (actualBytes.length !== expectedBytes.length) return null;
  if (!timingSafeEqual(actualBytes, expectedBytes)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!isValidSessionPayload(parsed)) return null;
    if (Date.parse(parsed.expiresAt) <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function createAuthSession(address: Address, chainId: number): AuthSession {
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + AUTH_SESSION_TTL_MS).toISOString();

  return {
    address,
    chainId,
    issuedAt,
    expiresAt,
  };
}

export function refreshAuthSession(session: AuthSession): AuthSession {
  return {
    ...session,
    expiresAt: new Date(Date.now() + AUTH_SESSION_TTL_MS).toISOString(),
  };
}

export function readAuthSession(request: NextRequest) {
  return decodeSession(request.cookies.get(AUTH_SESSION_COOKIE_NAME)?.value);
}

export function applyAuthSession(response: NextResponse, session: AuthSession) {
  response.cookies.set({
    name: AUTH_SESSION_COOKIE_NAME,
    value: encodeSession(session),
    httpOnly: true,
    maxAge: Math.floor(AUTH_SESSION_TTL_MS / 1000),
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearAuthSession(response: NextResponse) {
  response.cookies.set({
    name: AUTH_SESSION_COOKIE_NAME,
    value: "",
    expires: new Date(0),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export function getExpectedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).origin;
    } catch {
      // ignore
    }
  }

  const protocol = request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl.host;
  return `${protocol}://${host}`;
}

export function getExpectedDomain(request: NextRequest) {
  return new URL(getExpectedOrigin(request)).host;
}

function isAuthDebugEnabled() {
  return process.env.AUTH_DEBUG_LOGS?.trim() === "true";
}

export function maskDebugAddress(address: string | null | undefined) {
  if (!address || address.length < 10) return address ?? null;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function logAuthDebug(scope: string, message: string, details?: AuthDebugDetails) {
  if (!isAuthDebugEnabled()) return;

  const normalizedDetails = details && Object.keys(details).length > 0 ? details : undefined;
  if (normalizedDetails) {
    console.info(`[${scope}] ${message}`, normalizedDetails);
    return;
  }

  console.info(`[${scope}] ${message}`);
}