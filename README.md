# Base Fury

Base Fury is a standard web app built with Next.js and Phaser. The root route renders a full-screen vertical space shooter with wallet-gated entry, optional onchain progression, and a protected paymaster proxy for sponsored flows on Base Mainnet.

## What Is In This Repo

- Full-screen Phaser 3 game rendered from Next.js App Router
- Wallet connection through wagmi with Base Account and injected wallet fallback
- SIWE-style backend auth session with HttpOnly cookie
- Optional daily onchain check-in flow
- Optional onchain pack ownership and pack purchases
- Optional ERC-7677 paymaster proxy protected by wallet session + sender matching
- Local save system backed by `localStorage`

## Stack

- Next.js 15
- React 19
- Phaser 3
- wagmi + viem
- SIWE

## Routes

- `/` - main game entry point
- `/game` - same game page as `/`
- `/success` - success page for post-transaction flows
- `/api/auth/nonce` - issues one-time auth nonce
- `/api/auth/verify` - verifies signed SIWE payload and creates session cookie
- `/api/auth/session` - returns the current wallet session and refreshes sliding expiration
- `/api/auth/logout` - clears session cookie
- `/api/paymaster` - authenticated proxy for paymaster RPC calls

## Local Development

1. Install dependencies.

```bash
npm install
```

2. Create `.env.local`.

```bash
NEXT_PUBLIC_PROJECT_NAME="Base Fury"
NEXT_PUBLIC_URL="http://localhost:3000"
AUTH_SESSION_SECRET="replace-me"
```

3. Start the app.

```bash
npm run dev
```

4. Open the local URL reported by Next.js. If port `3000` is already in use, `next dev` will automatically move to another port.

Full configuration and environment variable reference lives in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Wallet And Auth Flow

- The game loads first. `CONNECT WALLET` appears only after the Phaser preload completes and `LOADING 100%` is finished.
- After successful sign-in, the connect button disappears.
- The Phaser `START` button appears only after a valid auth session exists.
- Auth uses wallet-based signing against chain id `8453`, which is Base Mainnet.
- Session lifetime is a 7-day sliding window. The cookie is refreshed while the user is active or when authenticated backend routes are used.
- `next.config.ts` already sets `Cross-Origin-Opener-Policy: same-origin-allow-popups`, which is required for the Base Account popup flow.

## Paymaster Behavior

When paymaster support is enabled:

- `/api/paymaster` requires an active auth session cookie
- the authenticated wallet address must match JSON-RPC `params[0].sender`
- silent daily check-in skips sponsorship when no matching auth session exists
- interactive pack purchases fall back to direct wallet transactions when no matching auth session exists

If `AUTH_DEBUG_LOGS=true`, `/api/auth/verify` and `/api/paymaster` log accept/reject decisions, masked wallet addresses, RPC methods, and upstream status without logging signatures, cookies, or raw JSON-RPC payloads.

## Save Data

- Progress is stored locally under the `space_shooter_save` key in `localStorage`.
- Existing pre-migration saves continue to work as long as the browser and origin stay the same.
- Switching browser, device, or domain starts with a fresh local save.
- Onchain pack sync only upgrades local pack flags to `true`; it does not wipe existing saves.

## Deployment

1. Deploy the app, for example on Vercel.
2. Set `NEXT_PUBLIC_URL` to the deployed origin.
3. Set `AUTH_SESSION_SECRET` in the deployed environment.
4. If you use onchain gameplay, set the contract addresses.
5. If you use sponsored transactions, configure the paymaster proxy variables.
6. If you want Base App metadata, register the project in [Base.dev](https://www.base.dev/) and set `NEXT_PUBLIC_BASE_APP_ID`.

## Notes

- The root page and `/game` render the same game page.
- Contract addresses are configured through environment variables and are not hardcoded in gameplay logic.
- Audio does not autoplay. The actual game audio is unlocked on user interaction when the player starts the run.
