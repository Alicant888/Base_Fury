"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { SiweMessage } from "siwe";
import { createWalletClient, custom, numberToHex } from "viem";
import { base } from "viem/chains";
import { GAME_LOADING_COMPLETE_EVENT, isGameLoadingComplete } from "@/src/platform";
import { requestWalletSession } from "@/src/platform/wallet";
import { dispatchAuthSessionChanged } from "@/src/platform/auth/client";
import { AUTH_CHAIN_ID, AUTH_STATEMENT, type AuthSession } from "@/src/platform/auth/shared";
import styles from "./AuthOverlay.module.css";

const SESSION_ACTIVITY_REFRESH_MS = 5 * 60 * 1000;

type SessionResponse =
  | { authenticated: false }
  | { authenticated: true; session: AuthSession };

type WalletConnectAuthResult = {
  address: `0x${string}`;
  message: string;
  signature: `0x${string}`;
};

type VerifyResponse = {
  message?: string;
  session?: AuthSession;
};

function fallbackToPersonalSign(error: unknown) {
  const message = String((error as { message?: unknown })?.message ?? error ?? "");
  return /wallet_connect|method_not_supported|not supported|unsupported|-32601/i.test(message);
}

function extractWalletConnectResult(raw: unknown): WalletConnectAuthResult | null {
  if (!raw || typeof raw !== "object") return null;
  const accounts = (raw as { accounts?: unknown }).accounts;
  if (!Array.isArray(accounts) || accounts.length === 0) return null;

  const account = accounts[0] as {
    address?: unknown;
    capabilities?: {
      signInWithEthereum?: {
        message?: unknown;
        signature?: unknown;
      };
    };
  };

  const address = account.address;
  const message = account.capabilities?.signInWithEthereum?.message;
  const signature = account.capabilities?.signInWithEthereum?.signature;

  if (typeof address !== "string" || typeof message !== "string" || typeof signature !== "string") {
    return null;
  }

  return {
    address: address as `0x${string}`,
    message,
    signature: signature as `0x${string}`,
  };
}

async function fetchNonce() {
  const response = await fetch("/api/auth/nonce", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to create auth nonce");
  }

  const data = (await response.json()) as { nonce?: string };
  if (!data.nonce) {
    throw new Error("Nonce response is missing a nonce value");
  }

  return data.nonce;
}

async function fetchSession() {
  const response = await fetch("/api/auth/session", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to read auth session");
  }

  return (await response.json()) as SessionResponse;
}

async function readVerifyResponse(response: Response): Promise<VerifyResponse> {
  const raw = await response.text();
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as VerifyResponse;
  } catch {
    return {
      message: response.ok ? "Authentication failed" : `Authentication failed (${response.status})`,
    };
  }
}

export function AuthOverlay() {
  const [nonce, setNonce] = useState<string | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGameLoaded, setIsGameLoaded] = useState(() => isGameLoadingComplete());
  const [isPending, startTransition] = useTransition();
  const sessionRef = useRef<AuthSession | null>(null);
  const lastSessionRefreshAtRef = useRef(0);

  useEffect(() => {
    const syncGameLoaded = () => {
      setIsGameLoaded(isGameLoadingComplete());
    };

    syncGameLoaded();
    window.addEventListener(GAME_LOADING_COMPLETE_EVENT, syncGameLoaded);
    return () => {
      window.removeEventListener(GAME_LOADING_COMPLETE_EVENT, syncGameLoaded);
    };
  }, []);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const syncSession = async () => {
    const nextSession = await fetchSession();
    const nextAuthenticatedSession = nextSession.authenticated ? nextSession.session : null;
    sessionRef.current = nextAuthenticatedSession;
    setSession(nextAuthenticatedSession);
    dispatchAuthSessionChanged(nextAuthenticatedSession);
    return nextSession;
  };

  useEffect(() => {
    let cancelled = false;

    void Promise.all([fetchNonce(), fetchSession()])
      .then(([nextNonce, nextSession]) => {
        if (cancelled) return;
        setNonce(nextNonce);
        const nextAuthenticatedSession = nextSession.authenticated ? nextSession.session : null;
        sessionRef.current = nextAuthenticatedSession;
        setSession(nextAuthenticatedSession);
        dispatchAuthSessionChanged(nextAuthenticatedSession);
        lastSessionRefreshAtRef.current = Date.now();
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setErrorMessage(error instanceof Error ? error.message : "Failed to initialize authentication");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!session) return;

    const refreshSessionOnActivity = async () => {
      if (!sessionRef.current) return;

      const nowMs = Date.now();
      if (nowMs - lastSessionRefreshAtRef.current < SESSION_ACTIVITY_REFRESH_MS) {
        return;
      }

      lastSessionRefreshAtRef.current = nowMs;

      try {
        const nextSession = await syncSession();
        if (!nextSession.authenticated) {
          setErrorMessage("Session expired. Sign in again.");
        }
      } catch {
        lastSessionRefreshAtRef.current = 0;
      }
    };

    const handlePointerOrKeyboard = () => {
      void refreshSessionOnActivity();
    };
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void refreshSessionOnActivity();
      }
    };

    window.addEventListener("pointerdown", handlePointerOrKeyboard, { passive: true });
    window.addEventListener("keydown", handlePointerOrKeyboard);
    window.addEventListener("focus", handlePointerOrKeyboard);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pointerdown", handlePointerOrKeyboard);
      window.removeEventListener("keydown", handlePointerOrKeyboard);
      window.removeEventListener("focus", handlePointerOrKeyboard);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [session]);

  const refreshNonce = async () => {
    const nextNonce = await fetchNonce();
    setNonce(nextNonce);
    return nextNonce;
  };

  const handleSignIn = () => {
    startTransition(() => {
      void (async () => {
        setErrorMessage(null);

        const activeNonce = nonce ?? (await refreshNonce());
        const walletSession = await requestWalletSession();

        let authPayload: WalletConnectAuthResult | null = null;
        try {
          const walletConnectResult = await walletSession.provider.request({
            method: "wallet_connect",
            params: [
              {
                version: "1",
                capabilities: {
                  signInWithEthereum: {
                    nonce: activeNonce,
                    chainId: numberToHex(AUTH_CHAIN_ID),
                  },
                },
              },
            ],
          });

          authPayload = extractWalletConnectResult(walletConnectResult);
          if (!authPayload) {
            throw new Error("wallet_connect returned an invalid auth payload");
          }
        } catch (error) {
          if (!fallbackToPersonalSign(error)) {
            throw error;
          }

          const walletClient = createWalletClient({
            chain: base,
            transport: custom(walletSession.provider),
          });
          const message = new SiweMessage({
            address: walletSession.account,
            chainId: AUTH_CHAIN_ID,
            domain: window.location.host,
            nonce: activeNonce,
            statement: AUTH_STATEMENT,
            uri: window.location.origin,
            version: "1",
          }).prepareMessage();
          const signature = await walletClient.signMessage({
            account: walletSession.account,
            message,
          });

          authPayload = {
            address: walletSession.account,
            message,
            signature,
          };
        }

        const verifyResponse = await fetch("/api/auth/verify", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(authPayload),
        });

        const verifyData = await readVerifyResponse(verifyResponse);

        if (!verifyResponse.ok || !verifyData.session) {
          throw new Error(verifyData.message || "Authentication failed");
        }

        setSession(verifyData.session);
        sessionRef.current = verifyData.session;
        dispatchAuthSessionChanged(verifyData.session);
        lastSessionRefreshAtRef.current = Date.now();
        setNonce(await refreshNonce());
      })().catch((error: unknown) => {
        setErrorMessage(error instanceof Error ? error.message : "Failed to sign in");
        void refreshNonce().catch(() => undefined);
      });
    });
  };

  if (session) {
    return null;
  }

  if (!isGameLoaded) {
    return null;
  }

  return (
    <aside className={styles.overlay}>
      <button
        className={styles.primary}
        type="button"
        onClick={handleSignIn}
        disabled={isPending}
      >
        {isPending ? "CONNECTING" : "CONNECT WALLET"}
      </button>
      {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
    </aside>
  );
}