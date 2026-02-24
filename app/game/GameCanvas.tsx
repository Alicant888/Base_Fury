"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAccount, useConnect } from "wagmi";
import { useSendCalls } from "wagmi/experimental";

const PAYMASTER_URL =
  "https://api.developer.coinbase.com/rpc/v1/base/Zvurg1GklICH1FkwKSQhwMZconclNmdN";

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<import("phaser").Game | null>(null);

  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { sendCallsAsync } = useSendCalls();

  // Keep latest values in refs so the event handler always sees current state
  const addressRef = useRef(address);
  const sendCallsRef = useRef(sendCallsAsync);
  addressRef.current = address;
  sendCallsRef.current = sendCallsAsync;

  // Auto-connect to Farcaster wallet when in Mini App
  useEffect(() => {
    if (isConnected) return;
    const fc = connectors.find((c) => c.id === "farcasterMiniApp");
    if (fc) {
      console.log("[GameCanvas] Auto-connecting to Farcaster wallet…");
      connect({ connector: fc });
    }
  }, [isConnected, connect, connectors]);

  // Gasless tx sender
  const fireGaslessTx = useCallback(async () => {
    const addr = addressRef.current;
    const send = sendCallsRef.current;
    if (!addr) {
      console.warn("[GameCanvas] Wallet not connected — skipping tx");
      return;
    }
    try {
      console.log("[GameCanvas] Sending gasless GameStarted tx…");
      const id = await send({
        calls: [
          {
            to: addr,
            value: BigInt(0),
            data: "0x47616d6553746172746564", // "GameStarted" hex
          },
        ],
        capabilities: {
          paymasterService: {
            url: PAYMASTER_URL,
          },
        },
      });
      console.log("[GameCanvas] Tx bundle sent, id:", id);
    } catch (err) {
      console.warn("[GameCanvas] Gasless tx failed (non-blocking):", err);
    }
  }, []);

  // Bridge: Phaser dispatches "phaser:gameStart" → React sends gasless tx
  useEffect(() => {
    const handler = () => { fireGaslessTx(); };
    window.addEventListener("phaser:gameStart", handler);
    return () => window.removeEventListener("phaser:gameStart", handler);
  }, [fireGaslessTx]);

  // Phaser game lifecycle
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let detachVisibility: (() => void) | null = null;

    (async () => {
      // IMPORTANT: Phaser must never be imported during SSR.
      // Next.js can evaluate client components on the server, but `useEffect` runs only on the client.
      const [{ createGame }, { attachVisibilityHandlers }] = await Promise.all([
        import("@/src/game/Game"),
        import("@/src/platform"),
      ]);

      if (disposed) return;
      if (gameRef.current) return;

      const game = createGame(container);
      gameRef.current = game;
      detachVisibility = attachVisibilityHandlers(game);
    })();

    return () => {
      disposed = true;
      detachVisibility?.();
      detachVisibility = null;

      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100dvw",
        height: "100dvh",
        paddingTop: "env(safe-area-inset-top)",
        boxSizing: "border-box",
        overflow: "hidden",
        background: "#000",
        touchAction: "none",
      }}
    />
  );
}

