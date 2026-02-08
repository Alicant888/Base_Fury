import { sdk } from "@farcaster/miniapp-sdk";

let cachedIsMiniApp: boolean | null = null;
let isMiniAppPromise: Promise<boolean> | null = null;

export async function isMiniApp(): Promise<boolean> {
  if (cachedIsMiniApp !== null) return cachedIsMiniApp;

  if (!isMiniAppPromise) {
    isMiniAppPromise = (async () => {
      try {
        cachedIsMiniApp = Boolean(await sdk.isInMiniApp());
      } catch {
        cachedIsMiniApp = false;
      }
      return cachedIsMiniApp;
    })();
  }

  return isMiniAppPromise;
}

/**
 * In Base / Farcaster Mini App context this dismisses the native splash screen.
 * Safe to call outside Mini Apps (it will no-op).
 */
export async function ready(): Promise<void> {
  try {
    if (!(await isMiniApp())) return;
    await sdk.actions.ready({ disableNativeGestures: true });
  } catch {
    // Guarded: never crash outside Mini App environments.
  }
}

