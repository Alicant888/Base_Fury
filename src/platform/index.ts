import type { Game } from "phaser";
import { isMiniApp, ready } from "./miniapp";

export const platform = {
  ready,
  isMiniApp,
};

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

