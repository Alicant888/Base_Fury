import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isAddress, type Address } from "viem";
import {
  AUTH_NONCE_TTL_MS,
  AUTH_SESSION_COOKIE_NAME,
  AUTH_SESSION_TTL_MS,
  PAYMASTER_AUTH_TOKEN_TTL_MS,
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
type ExpiringSignedPayload = {
  expiresAt: string;
};

export interface PaymasterAuthToken {
  address: Address;
  chainId: number;
  issuedAt: string;
  expiresAt: string;
}

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

function isValidPaymasterAuthTokenPayload(value: unknown): value is PaymasterAuthToken {
  if (!value || typeof value !== "object") return false;

  const token = value as Partial<PaymasterAuthToken>;
  if (typeof token.address !== "string" || !isAddress(token.address)) return false;
  if (typeof token.chainId !== "number" || !Number.isInteger(token.chainId) || token.chainId <= 0) {
    return false;
  }
  if (typeof token.issuedAt !== "string" || Number.isNaN(Date.parse(token.issuedAt))) return false;
  if (typeof token.expiresAt !== "string" || Number.isNaN(Date.parse(token.expiresAt))) return false;

  return true;
}

function encodeSignedPayload<T extends ExpiringSignedPayload>(payload: T) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createSessionSignature(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function decodeSignedPayload<T extends ExpiringSignedPayload>(
  token: string | undefined,
  validator: (value: unknown) => value is T,
): T | null {
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
    if (!validator(parsed)) return null;
    if (Date.parse(parsed.expiresAt) <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function encodeSession(session: AuthSession) {
  return encodeSignedPayload(session);
}

function decodeSession(token: string | undefined): AuthSession | null {
  return decodeSignedPayload(token, isValidSessionPayload);
}

export function createPaymasterAuthToken(session: AuthSession): string {
  return encodeSignedPayload({
    address: session.address,
    chainId: session.chainId,
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + PAYMASTER_AUTH_TOKEN_TTL_MS).toISOString(),
  });
}

export function readPaymasterAuthToken(request: NextRequest): PaymasterAuthToken | null {
  const headerToken = request.headers.get("x-paymaster-auth")?.trim();
  const queryToken = request.nextUrl.searchParams.get("auth")?.trim();
  return decodeSignedPayload(headerToken || queryToken || undefined, isValidPaymasterAuthTokenPayload);
}

function paymasterTokenToSession(token: PaymasterAuthToken): AuthSession {
  return {
    address: token.address,
    chainId: token.chainId,
    issuedAt: token.issuedAt,
    expiresAt: token.expiresAt,
  };
}

export function readPaymasterAuthSession(request: NextRequest): AuthSession | null {
  const token = readPaymasterAuthToken(request);
  return token ? paymasterTokenToSession(token) : null;
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
