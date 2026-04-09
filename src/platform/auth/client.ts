import { isAddressEqual, type Address } from "viem";
import { AUTH_CHAIN_ID, type AuthSession } from "./shared";

export const AUTH_SESSION_CHANGED_EVENT = "base-fury:auth-session-changed";

type PaymasterTokenResponse = {
  token?: string;
  expiresAt?: string;
};

type SessionResponse =
  | { authenticated: false }
  | { authenticated: true; session: AuthSession };

let paymasterTokenCache:
  | {
    address: Address;
    token: string;
    expiresAtMs: number;
  }
  | null = null;

export async function getAuthSession(): Promise<AuthSession | null> {
  if (typeof window === "undefined") return null;

  try {
    const response = await fetch("/api/auth/session", {
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as SessionResponse;
    return data.authenticated ? data.session : null;
  } catch {
    return null;
  }
}

export function dispatchAuthSessionChanged(session: AuthSession | null) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new CustomEvent(AUTH_SESSION_CHANGED_EVENT, {
    detail: {
      authenticated: Boolean(session),
      session,
    },
  }));
}

export async function hasAuthSessionForAddress(address: Address): Promise<boolean> {
  const session = await getAuthSession();
  if (!session) return false;

  return session.chainId === AUTH_CHAIN_ID && isAddressEqual(session.address, address);
}

export async function getPaymasterServiceUrlForAddress(baseUrl: string, address: Address): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const nowMs = Date.now();
  if (
    paymasterTokenCache
    && isAddressEqual(paymasterTokenCache.address, address)
    && paymasterTokenCache.expiresAtMs - nowMs > 30_000
  ) {
    const cachedUrl = new URL(baseUrl, window.location.origin);
    cachedUrl.searchParams.set("auth", paymasterTokenCache.token);
    return cachedUrl.toString();
  }

  try {
    const response = await fetch(`/api/auth/paymaster-token?address=${encodeURIComponent(address)}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      paymasterTokenCache = null;
      return null;
    }

    const data = (await response.json()) as PaymasterTokenResponse;
    if (!data.token || !data.expiresAt) {
      paymasterTokenCache = null;
      return null;
    }

    const expiresAtMs = Date.parse(data.expiresAt);
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= nowMs) {
      paymasterTokenCache = null;
      return null;
    }

    paymasterTokenCache = {
      address,
      token: data.token,
      expiresAtMs,
    };

    const authorizedUrl = new URL(baseUrl, window.location.origin);
    authorizedUrl.searchParams.set("auth", data.token);
    return authorizedUrl.toString();
  } catch {
    paymasterTokenCache = null;
    return null;
  }
}
