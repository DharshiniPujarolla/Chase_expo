# CHASE: playable STEM town prototype

## Build
- Replace the placeholder home screen with a colorful, top-down 2D town scene centered on a broken power station, with a compact game HUD and mobile-friendly navigation.
- Make the power station open an interactive adaptive Physics mission with answers, feedback, hints, repair progress, and a completion animation.
- Award coins, XP, and materials for correct answers; persist mission, rewards, and repair progress in local storage; allow rewarded resources to unlock a new building.
- Add small interaction states for town buildings and mission navigation while keeping the prototype focused on the brief’s first playable stage.

## Technical details
- Use React, TypeScript, existing Tailwind/shadcn tokens, and a generated top-down town illustration with layered interactive controls.
- Keep progress and adaptive-question helpers browser-safe; read and write local storage only after hydration or in event handlers.
- Add focused tests for reward/progress rules and unique page metadata for `/`.
- Do not add a backend, multiplayer, other subject missions, or boss battles in this first stage.
