# Melody Seed Generator

Browser-based procedural melody, chord, and bass seed generator for AI music upload and cover workflows.

The generator uses deterministic local algorithms. It does not use samples, audio loops, copyrighted training data, or a remote generation service. Its similarity score is a local heuristic, not a legal guarantee of originality or copyright clearance.

## Current features (v0.2)

- Seed-based reproducible melody generation
- Hook intent presets and manual melody controls
- Mode-aware chord generation and regenerable bass layers
- Browser playback with Tone.js
- Piano-roll visualization for melody, chords, and bass
- MIDI and offline WAV export
- Restorable `.melody-seed.json` project files
- Provenance JSON export
- Local session similarity and cliche checks
- Static Astro site with the React generator mounted on `/generator`

## Stack

- Astro 7
- React 19 and TypeScript
- Tone.js for playback and offline WAV rendering
- `@tonejs/midi` for MIDI export
- Vitest for unit tests
- Netlify-compatible static output

## Local development

Node.js 24 is used in CI.

```bash
npm ci
npm run dev
```

## Verification

```bash
npm run typecheck
npm test
npm run build
```

`npm run build` writes the static site to `dist/`. GitHub Actions runs all three verification commands for pushes to `main` and pull requests.

## Project structure

```txt
src/
  components/        React generator UI
  layouts/           Astro page shell
  pages/             Static site routes
  lib/
    audio/            Playback and WAV rendering
    harmony/          Chord analysis, planning, and bass generation
    melody/           Melody generation, scoring, and similarity heuristics
    midi/             MIDI and provenance export
    music/            Notes, scales, intervals, and theory helpers
    project/          Project-file serialization and validation
    seed/             Melody/chord/bass layer state
    visualization/    Piano-roll calculations
    utils/            Hashing and seeded randomness
tests/                Vitest unit tests
```

## Similarity and provenance limits

The local similarity check compares a generated melody with recent fingerprints from the current browser session and detects a small set of structural cliches. It does not search commercial catalogs, identify copyrighted works, or establish legal clearance. Provenance output documents how a seed was generated; it is not proof of copyright ownership.

## Deployment

The repository contains `netlify.toml` with `npm run build` and `dist` as the publish directory. Any static host that supports Astro's generated directory routes can serve the build.

Netlify provides its deployment URL to the build automatically. Set `SITE_URL` when a custom production domain should be used for canonical links, Open Graph metadata, `robots.txt`, and `sitemap.xml`.

Before promoting a deploy preview to production, verify the roadmap vote form, the CloudTips embed, MIDI/WAV/Project/Provenance downloads, and the response headers declared in `netlify.toml`.
