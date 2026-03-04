"use client";

import { useEffect, useRef, useState } from "react";

type GameRenderer = "auto" | "canvas" | "webgl";
type GameAudioMode = "auto" | "html5" | "noaudio";

const RENDERER_STORAGE_KEY = "phaser.renderer";
const AUDIO_MODE_STORAGE_KEY = "phaser.audioMode";

function toErrorString(error: unknown): string {
  if (error instanceof Error) return error.stack || error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function looksLikeWebglStartupFailure(message: string): boolean {
  return /webgl|framebuffer|createframebuffer|createresource/i.test(message);
}

function looksLikeAudioStartupFailure(message: string): boolean {
  return /failed to start the audio device|failed to construct .*audiocontext|audiocontext was not allowed to start/i.test(message);
}

function looksLikeNonFatalLifecycleError(message: string): boolean {
  // iOS WebViews may fail AudioContext suspend/resume across background/foreground transitions.
  // Those errors are noisy but usually non-fatal for gameplay and should not trigger a fatal overlay.
  return /(?:resume|suspend)@\[[^\]]*native code[^\]]*\]|notallowederror|audiocontext/i.test(message);
}

function getRequestedRenderer(): GameRenderer | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const renderer = params.get("renderer")?.toLowerCase();
    if (renderer === "canvas" || renderer === "webgl" || renderer === "auto") return renderer;
  } catch {
    // ignore
  }
  return null;
}

function getRequestedAudioMode(): GameAudioMode | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("audio")?.toLowerCase();
    if (mode === "auto" || mode === "html5" || mode === "noaudio") return mode;
  } catch {
    // ignore
  }
  return null;
}

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<import("phaser").Game | null>(null);
  const resumeRef = useRef<(() => Promise<void>) | null>(null);
  const [status, setStatus] = useState<"loading" | "running" | "resume" | "error">("loading");
  const [, setAttemptText] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setStatus("loading");
    setAttemptText(null);

    const root = document.documentElement;
    const body = document.body;

    const prevHtmlOverflow = root.style.overflow;
    const prevHtmlOverscroll = root.style.overscrollBehavior;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyOverscroll = body.style.overscrollBehavior;
    const prevBodyTouchAction = body.style.touchAction;

    // Prevent the WebView/page from scrolling or overscrolling during gameplay.
    root.style.overflow = "hidden";
    root.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    body.style.touchAction = "none";

    const preventTouchMove = (event: TouchEvent) => {
      if (event.cancelable) event.preventDefault();
    };
    container.addEventListener("touchmove", preventTouchMove, { passive: false });

    let disposed = false;
    let retryTimer: number | null = null;
    let startupDeadline = 0;
    let runId = 0;
    let attempt = 0;
    let currentRenderer: GameRenderer = "auto";
    let currentAudioMode: GameAudioMode = "auto";
    let internalStatus: "loading" | "running" | "resume" | "error" = "loading";
    let needsManualResume = false;
    let loggedNonFatalResumeIssue = false;

    const destroyGame = () => {
      if (gameRef.current) {
        try {
          gameRef.current.destroy(true);
        } catch {
          // ignore
        }
        gameRef.current = null;
      }
      needsManualResume = false;
    };

    const scheduleStart = (nextRenderer: GameRenderer, nextAudioMode: GameAudioMode, delayMs: number) => {
      if (disposed) return;
      if (retryTimer) window.clearTimeout(retryTimer);
      retryTimer = window.setTimeout(() => {
        retryTimer = null;
        void start(nextRenderer, nextAudioMode);
      }, delayMs);
    };

    const reportError = (error: unknown) => {
      destroyGame();

      const message = toErrorString(error);
      const duringStartup = performance.now() < startupDeadline;
      const canRetry = duringStartup && attempt < 3;

      if (canRetry) {
        const webglish = looksLikeWebglStartupFailure(message);
        const audioStartupFailure = looksLikeAudioStartupFailure(message);

        // If WebGL init is flaky on iOS WebViews, fall back to Canvas after one failed auto attempt.
        if (webglish && currentRenderer !== "canvas") {
          try {
            sessionStorage.setItem(RENDERER_STORAGE_KEY, "canvas");
          } catch {
            // ignore
          }
          setAttemptText(`Retrying with Canvas (attempt ${attempt + 1}/3)...`);
          internalStatus = "loading";
          setStatus("loading");
          scheduleStart("canvas", currentAudioMode, 350);
          return;
        }

        if (audioStartupFailure && currentAudioMode !== "noaudio") {
          const nextAudioMode: GameAudioMode = currentAudioMode === "auto" ? "html5" : "noaudio";
          const retryLabel = nextAudioMode === "html5" ? "HTML5 audio" : "audio disabled";
          try {
            sessionStorage.setItem(AUDIO_MODE_STORAGE_KEY, nextAudioMode);
          } catch {
            // ignore
          }
          setAttemptText(`Retrying with ${retryLabel} (attempt ${attempt + 1}/3)...`);
          internalStatus = "loading";
          setStatus("loading");
          scheduleStart(currentRenderer, nextAudioMode, 350);
          return;
        }

        setAttemptText(`Retrying (attempt ${attempt + 1}/3)...`);
        internalStatus = "loading";
        setStatus("loading");
        scheduleStart(currentRenderer, currentAudioMode, 350);
        return;
      }

      setAttemptText(null);
      internalStatus = "error";
      setStatus("error");
    };

    const safePauseInPlace = () => {
      const game = gameRef.current;
      if (!game) return;
      try {
        game.pause();
      } catch {
        // ignore
      }
    };

    const safeResumeInPlace = async (): Promise<boolean> => {
      const game = gameRef.current;
      if (!game) return false;

      const gameWithSound = game as import("phaser").Game & {
        sound?: {
          context?: { resume?: () => Promise<void> | void };
          unlock?: () => void;
        };
      };

      try {
        gameWithSound.sound?.unlock?.();
      } catch {
        // ignore
      }

      try {
        const maybeResume = gameWithSound.sound?.context?.resume?.();
        if (maybeResume && typeof (maybeResume as Promise<void>).then === "function") {
          await (maybeResume as Promise<void>).catch(() => undefined);
        }
      } catch {
        // ignore
      }

      try {
        game.resume();
        return true;
      } catch {
        return false;
      }
    };

    const markNeedsResume = () => {
      if (disposed || !gameRef.current) return;
      needsManualResume = true;
      safePauseInPlace();

      if (!document.hidden) {
        setAttemptText(null);
        internalStatus = "resume";
        setStatus("resume");
      }
    };

    const onVisibilityLifecycle = () => {
      if (document.hidden) {
        markNeedsResume();
        return;
      }

      if (needsManualResume && gameRef.current) {
        setAttemptText(null);
        internalStatus = "resume";
        setStatus("resume");
      }
    };

    const onBlurLifecycle = () => markNeedsResume();
    const onFocusLifecycle = () => onVisibilityLifecycle();
    const onPageHideLifecycle = () => markNeedsResume();
    const onPageShowLifecycle = () => onVisibilityLifecycle();

    document.addEventListener("visibilitychange", onVisibilityLifecycle, { passive: true });
    window.addEventListener("blur", onBlurLifecycle, { passive: true });
    window.addEventListener("focus", onFocusLifecycle, { passive: true });
    window.addEventListener("pagehide", onPageHideLifecycle, { passive: true });
    window.addEventListener("pageshow", onPageShowLifecycle, { passive: true });

    const shouldIgnoreLifecycleError = (error: unknown): boolean => {
      const message = toErrorString(error);
      return looksLikeNonFatalLifecycleError(message);
    };

    const onWindowError = (event: ErrorEvent) => {
      const error = event.error ?? event.message;

      if (gameRef.current && looksLikeAudioStartupFailure(toErrorString(error))) {
        try {
          event.preventDefault();
        } catch {
          // ignore
        }
        markNeedsResume();
        return;
      }

      if (shouldIgnoreLifecycleError(error)) {
        try {
          event.preventDefault();
        } catch {
          // ignore
        }
        if (!loggedNonFatalResumeIssue && process.env.NODE_ENV !== "production") {
          loggedNonFatalResumeIssue = true;
          console.warn("Ignored non-fatal lifecycle error:", error);
        }
        return;
      }
      reportError(error);
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (gameRef.current && looksLikeAudioStartupFailure(toErrorString(event.reason))) {
        try {
          event.preventDefault();
        } catch {
          // ignore
        }
        markNeedsResume();
        return;
      }

      if (shouldIgnoreLifecycleError(event.reason)) {
        try {
          event.preventDefault();
        } catch {
          // ignore
        }
        if (!loggedNonFatalResumeIssue && process.env.NODE_ENV !== "production") {
          loggedNonFatalResumeIssue = true;
          console.warn("Ignored non-fatal lifecycle rejection:", event.reason);
        }
        return;
      }
      reportError(event.reason);
    };
    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    const waitForVisible = async (timeoutMs: number) => {
      if (!document.hidden) return;

      await new Promise<void>((resolve) => {
        let timer: number | null = null;

        const cleanup = () => {
          if (timer) window.clearTimeout(timer);
          document.removeEventListener("visibilitychange", onChange);
        };

        const onChange = () => {
          if (document.hidden) return;
          cleanup();
          resolve();
        };

        document.addEventListener("visibilitychange", onChange, { passive: true });
        timer = window.setTimeout(() => {
          cleanup();
          resolve();
        }, timeoutMs);
      });
    };

    const waitForNonZeroSize = async (timeoutMs: number) => {
      const deadline = performance.now() + timeoutMs;
      while (!disposed && performance.now() < deadline) {
        const rect = container.getBoundingClientRect();
        const width = Math.round(rect.width);
        const height = Math.round(rect.height);
        if (width > 0 && height > 0) {
          // Give layout 1 extra frame to settle in WKWebView.
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          return;
        }
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }
    };

    const requestResume = async () => {
      if (disposed) return;

      if (!gameRef.current) {
        if (internalStatus === "error") {
          setAttemptText("Resuming...");
          internalStatus = "loading";
          setStatus("loading");
          scheduleStart(currentRenderer, currentAudioMode, 0);
        }
        return;
      }

      setAttemptText("Resuming...");
      internalStatus = "loading";
      setStatus("loading");

      const resumed = await safeResumeInPlace();
      if (disposed) return;

      if (!resumed) {
        setAttemptText(null);
        internalStatus = "resume";
        setStatus("resume");
        return;
      }

      needsManualResume = false;
      try {
        gameRef.current?.registry.set("audioUnlocked", true);
      } catch {
        // ignore
      }
      setAttemptText(null);
      internalStatus = "running";
      setStatus("running");
    };

    const start = async (renderer: GameRenderer, audioMode: GameAudioMode) => {
      const myRunId = (runId += 1);
      attempt += 1;
      currentRenderer = renderer;
      currentAudioMode = audioMode;
      startupDeadline = performance.now() + 2500;

      setAttemptText(`Starting (${renderer}, ${audioMode}, attempt ${attempt}/3)...`);
      internalStatus = "loading";
      setStatus("loading");

      destroyGame();

      try {
        await waitForVisible(1500);
        await waitForNonZeroSize(1500);

        // IMPORTANT: Phaser must never be imported during SSR.
        // Next.js can evaluate client components on the server, but `useEffect` runs only on the client.
        const { createGame } = await import("@/src/game/Game");

        if (disposed || myRunId !== runId) return;
        if (gameRef.current) return;

        const game = createGame(container, { renderer, audioMode });

        if (disposed || myRunId !== runId) {
          try {
            game.destroy(true);
          } catch {
            // ignore
          }
          return;
        }

        gameRef.current = game;
        needsManualResume = false;
        setAttemptText(null);
        internalStatus = "running";
        setStatus("running");
      } catch (error) {
        if (disposed || myRunId !== runId) return;
        reportError(error);
      }
    };

    resumeRef.current = requestResume;

    const requestedRenderer = getRequestedRenderer();
    if (requestedRenderer) {
      try {
        if (requestedRenderer === "auto") sessionStorage.removeItem(RENDERER_STORAGE_KEY);
        else sessionStorage.setItem(RENDERER_STORAGE_KEY, requestedRenderer);
      } catch {
        // ignore
      }
    }

    const requestedAudioMode = getRequestedAudioMode();
    if (requestedAudioMode) {
      try {
        if (requestedAudioMode === "auto") sessionStorage.removeItem(AUDIO_MODE_STORAGE_KEY);
        else sessionStorage.setItem(AUDIO_MODE_STORAGE_KEY, requestedAudioMode);
      } catch {
        // ignore
      }
    }

    let initialRenderer: GameRenderer = "auto";
    let initialAudioMode: GameAudioMode = "auto";
    try {
      const stored = sessionStorage.getItem(RENDERER_STORAGE_KEY);
      if (stored === "canvas" || stored === "webgl") initialRenderer = stored;

      const storedAudio = sessionStorage.getItem(AUDIO_MODE_STORAGE_KEY);
      if (storedAudio === "html5" || storedAudio === "noaudio") initialAudioMode = storedAudio;
    } catch {
      // ignore
    }
    if (requestedRenderer) initialRenderer = requestedRenderer;
    if (requestedAudioMode) initialAudioMode = requestedAudioMode;

    void start(initialRenderer, initialAudioMode);

    return () => {
      disposed = true;
      resumeRef.current = null;

      if (retryTimer) window.clearTimeout(retryTimer);
      retryTimer = null;

      destroyGame();

      container.removeEventListener("touchmove", preventTouchMove);
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      document.removeEventListener("visibilitychange", onVisibilityLifecycle);
      window.removeEventListener("blur", onBlurLifecycle);
      window.removeEventListener("focus", onFocusLifecycle);
      window.removeEventListener("pagehide", onPageHideLifecycle);
      window.removeEventListener("pageshow", onPageShowLifecycle);

      root.style.overflow = prevHtmlOverflow;
      root.style.overscrollBehavior = prevHtmlOverscroll;
      body.style.overflow = prevBodyOverflow;
      body.style.overscrollBehavior = prevBodyOverscroll;
      body.style.touchAction = prevBodyTouchAction;
    };
  }, []);

  const onResume = () => {
    void resumeRef.current?.();
  };

  return (
    <>
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

      {status === "resume" || status === "error" ? (
        <div
          onClick={status === "resume" ? onResume : undefined}
          onTouchEnd={status === "resume" ? onResume : undefined}
          role={status === "resume" ? "button" : undefined}
          tabIndex={status === "resume" ? 0 : undefined}
          onKeyDown={
            status === "resume"
              ? (event) => {
                  if (event.key === "Enter" || event.key === " ") onResume();
                }
              : undefined
          }
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#000",
            color: "#fff",
            fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
            zIndex: 1000,
            userSelect: "none",
          }}
        >
          <div style={{ textAlign: "center", padding: "16px" }}>
            {status === "resume" ? (
              <div style={{ fontFamily: "Orbitron, sans-serif", fontSize: 18, fontWeight: 400, color: "#ffffff" }}>
                TAP TO CONTINUE
              </div>
            ) : (
              <div style={{ fontSize: 14, opacity: 0.85 }}>Game failed to start</div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
