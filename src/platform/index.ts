import type { Game } from "phaser";

export const GAME_LOADING_COMPLETE_EVENT = "base-fury:game-loading-complete";

type PlatformWindow = Window & {
  __baseFuryGameLoadingComplete?: boolean;
};

async function ready(): Promise<void> {
  return;
}

async function isMiniApp(): Promise<boolean> {
  return false;
}

export const platform = {
  ready,
  isMiniApp,
};

export function isGameLoadingComplete() {
  if (typeof window === "undefined") return false;
  return Boolean((window as PlatformWindow).__baseFuryGameLoadingComplete);
}

export function setGameLoadingComplete(isComplete: boolean) {
  if (typeof window === "undefined") return;

  const platformWindow = window as PlatformWindow;
  platformWindow.__baseFuryGameLoadingComplete = isComplete;
  window.dispatchEvent(new CustomEvent(GAME_LOADING_COMPLETE_EVENT, {
    detail: {
      isComplete,
    },
  }));
}

/**
 * RN WebView / mobile browsers: pause on hidden/blur, resume on visible/focus.
 * Returns a cleanup function.
 */
export function attachVisibilityHandlers(game: Game): () => void {
  let disposed = false;

  const safePause = () => {
    if (disposed) return;
    try {
      game.pause();
    } catch {
      // ignore
    }
  };

  const safeResume = () => {
    if (disposed) return;
    try {
      game.resume();
    } catch {
      // ignore
    }
  };

  const onVisibilityChange = () => {
    if (document.hidden) safePause();
    else safeResume();
  };

  const onBlur = () => safePause();
  const onFocus = () => safeResume();
  const onPageHide = () => safePause();
  const onPageShow = () => safeResume();

  document.addEventListener("visibilitychange", onVisibilityChange, { passive: true });
  window.addEventListener("blur", onBlur, { passive: true });
  window.addEventListener("focus", onFocus, { passive: true });
  window.addEventListener("pagehide", onPageHide, { passive: true });
  window.addEventListener("pageshow", onPageShow, { passive: true });

  // Apply current state immediately.
  onVisibilityChange();

  return () => {
    disposed = true;
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("blur", onBlur);
    window.removeEventListener("focus", onFocus);
    window.removeEventListener("pagehide", onPageHide);
    window.removeEventListener("pageshow", onPageShow);
  };
}

