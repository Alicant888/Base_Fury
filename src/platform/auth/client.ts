import { isAddressEqual, type Address } from "viem";
import { AUTH_CHAIN_ID, type AuthSession } from "./shared";

export const AUTH_SESSION_CHANGED_EVENT = "base-fury:auth-session-changed";

type SessionResponse =
  | { authenticated: false }
  | { authenticated: true; session: AuthSession };

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