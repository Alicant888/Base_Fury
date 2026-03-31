# Architecture

## Runtime Shape

Base Fury is a standard web app built with Next.js App Router and a client-only Phaser runtime.

- `/` and `/game` render the same game page
- React owns the shell, wallet/auth UI, and API routes
- Phaser owns gameplay, menus, onboarding, entities, and save application

## Code Boundaries

- `app/*` contains the Next.js shell, routes, API handlers, and minimal Phaser mounting code
- `src/game/*` contains scenes, entities, systems, onchain gameplay helpers, and save logic
- `src/platform/*` contains platform adapters, wallet glue, and auth client/server helpers

Do not place Phaser gameplay logic inside `app/*` beyond mounting and UI orchestration.

## Next.js + Phaser Rules

- Any file that touches `window`, `document`, or creates `new Phaser.Game()` must be a client component and run inside `useEffect`
- Always destroy Phaser on unmount with `game.destroy(true)`
- The game loading lifecycle is explicit: React mounts the canvas, Phaser runs `PreloadScene`, and UI that depends on the game waits for preload completion before rendering

## UI And Auth Flow

- The connect CTA is rendered by React in `app/components/AuthOverlay.tsx`
- `CONNECT WALLET` appears only after Phaser preload completes
- After successful sign-in the overlay disappears
- The Phaser `START` button stays hidden until a valid auth session exists, then appears with a short delay

## Wallet And Session Model

- Wallet connectivity uses wagmi with Base Account and injected-wallet fallback
- Backend identity is wallet-based, not social-account based
- Auth session is stored as a signed HttpOnly cookie
- Session expiration is sliding and refreshed by `/api/auth/session` and successful authenticated backend usage
- Chain id `8453` is Base Mainnet

## Paymaster Model

- `/api/paymaster` is the protected backend proxy for sponsored calls
- Requests require a valid auth session cookie
- JSON-RPC `params[0].sender` must match the authenticated wallet address
- Silent gameplay flows skip sponsorship if auth is missing
- Interactive purchase flows fall back to direct wallet writes if auth is missing

## Save Model

- Save data lives in `localStorage` under `space_shooter_save`
- Existing saves survive migration as long as browser and origin stay the same
- Onchain pack sync only upgrades local pack flags to `true`; it does not wipe local progress

## Assets

- Assets are served from `public/assets/atlases/*` and related files under `public/assets/*`
- Do not invent atlas frame names; use the values documented in `docs/ASSETS.md`

## Compatibility Constraints

- No autoplay audio; gameplay audio is unlocked only after user interaction
- `next.config.ts` sets `Cross-Origin-Opener-Policy: same-origin-allow-popups` for Base Account popup support
- Platform readiness is guarded so the app does not crash outside embedded environments

## Environment Variables

### Core

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_PROJECT_NAME` | No | Public app name used by the shell and wallet integrations. |
| `NEXT_PUBLIC_URL` | Recommended | Canonical app URL used for metadata, auth origin checks, and paymaster origin fallback. |
| `NEXT_PUBLIC_BASE_APP_ID` | Optional | Base App id exposed in app metadata. |
| `AUTH_SESSION_SECRET` | Yes in production | Secret used to sign the auth session cookie. |
| `AUTH_DEBUG_LOGS` | Optional | Set to `true` to log auth/paymaster decisions with masked addresses. |

### Onchain Gameplay

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_CHECKIN_CONTRACT_ADDRESS` | Optional | Daily check-in contract on Base Mainnet. |
| `NEXT_PUBLIC_PACKS_CONTRACT_ADDRESS` | Optional | Pack shop contract for ownership checks and ETH purchases. |
| `NEXT_PUBLIC_PACK_XP_PRICE_ETH` | Optional | ETH price shown for the XP pack. Defaults to `0.05`. |
| `NEXT_PUBLIC_BASE_BUILDER_CODE` | Optional | ERC-8021 builder code for transaction attribution. Defaults to `bc_rn2l4vb0`. |
| `NEXT_PUBLIC_PAYMASTER_PROXY_URL` | Optional | Public client URL for the local paymaster proxy route. |

### Paymaster Proxy

Only needed if sponsored calls are enabled.

| Variable | Required | Purpose |
| --- | --- | --- |
| `CDP_PAYMASTER_URL` | Yes for paymaster | Upstream ERC-7677 paymaster endpoint. |
| `PAYMASTER_ALLOWED_ORIGINS` | Optional | Comma-separated origin allowlist for `/api/paymaster`. |
| `PAYMASTER_REQUIRE_ORIGIN` | Optional | If `true`, requests without origin or referer are rejected. |
| `PAYMASTER_ALLOWED_RPC_METHODS` | Optional | RPC method allowlist. Defaults to `pm_getPaymasterStubData`, `pm_getPaymasterData`, and `pm_getAcceptedPaymentTokens`. |
| `PAYMASTER_RATE_LIMIT_MAX` | Optional | Max requests per rate-limit window. |
| `PAYMASTER_RATE_LIMIT_WINDOW_MS` | Optional | Rate-limit window length in milliseconds. |
| `PAYMASTER_MAX_BODY_BYTES` | Optional | Max request body size. |
| `CDP_PAYMASTER_BEARER_TOKEN` | Optional | Bearer token forwarded to the upstream paymaster. |
| `CDP_PAYMASTER_API_KEY` | Optional | API key forwarded to the upstream paymaster. |

## Recommended Local `.env.local`

```bash
NEXT_PUBLIC_PROJECT_NAME="Base Fury"
NEXT_PUBLIC_URL="http://localhost:3000"
AUTH_SESSION_SECRET="replace-me"
```