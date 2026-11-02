# CMPM 170 — Isometric Panopticon Prototype

A Phaser 4 + Vite starter for an isometric game built around a central
panopticon tower.

## Play online

**[Launch the game](https://woolendoolen.github.io/cmpm170SSBMFNGC/)**

The live build updates automatically whenever `main` is pushed to GitHub.

The current prototype includes:

- an isometric projection and circular prison ring;
- a raised observation tower that demonstrates height and occlusion;
- depth-sorted cell blocks and player rendering;
- a two-player, turn-based game between the prisoner and the guard; and
- procedural placeholder art, so no external assets are required.


## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Production build

```bash
npm run build
```

Vite writes the deployable game to `dist/`.

## Project layout

```text
src/
  main.js                         Phaser game configuration
  styles.css                      Full-screen canvas styling
  scenes/PanopticonScene.js       Isometric scene and movement prototype
```

Phaser is installed as an npm dependency. The framework source is intentionally
not vendored into this repository.
