Architecture

React/Next.js components and pages must live only in app/game/* (client components).

Phaser game logic, scenes, entities, and systems must live only in src/game/*.

Platform adapters must live only in src/platform/*.

Do not place Phaser logic inside app/* except minimal mounting code.

Next.js + Phaser

Any file that touches window, document, or creates new Phaser.Game() must be a client component ('use client') and run inside useEffect.

Always destroy Phaser on unmount: game.destroy(true).

Assets

Assets are served from public/assets/atlases/*.

Do not invent frame names; only use frames listed in docs/ASSETS.md.

Compatibility

No autoplay audio; unlock after user gesture (START click).

Support Base Mini App: call sdk.actions.ready() after preload, guarded so it doesn’t crash outside Base.