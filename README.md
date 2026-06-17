# Melody Seed Generator

Browser-based procedural monophonic MIDI melody seed generator for AI music upload/cover workflows.

Positioning:

- Procedurally generated MIDI melodies
- No samples
- No audio loops
- No copyrighted training data
- Designed to reduce similarity risk for commercial workflows
- Not a legal guarantee of uniqueness or copyright clearance

## MVP v0.1 features

- Generate short monophonic lead melodies
- Play / Stop browser preview with Tone.js
- Download `.mid`
- Seed-based reproducible generation
- BPM, key, scale/mode, bars, octave, range, density, rest chance, variation, randomness
- Simple piano roll visualization
- Commercial Safer Mode toggle
- Quality score and simplified similarity-risk score
- Download provenance JSON

## Stack

- Vite
- React
- TypeScript
- Tone.js for playback
- `@tonejs/midi` for MIDI export
- Netlify static deploy

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## Netlify deploy

The repository includes `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

Push to GitHub, import the repo in Netlify, and use the default Vite build settings above.

## Project structure

```txt
src/
  components/
    Controls.tsx
    Transport.tsx
    PianoRoll.tsx
    MelodyStats.tsx
    SeedBox.tsx

  lib/
    melody/
      generateMelody.ts
      phrase.ts
      rhythm.ts
      variation.ts
      scoring.ts
      fingerprint.ts
      similarity.ts
      blacklist.ts

    music/
      scales.ts
      notes.ts
      intervals.ts
      theory.ts

    midi/
      exportMidi.ts

    audio/
      playback.ts

    utils/
      seededRandom.ts
      hash.ts

  App.tsx
  main.tsx
```

## Commercial Safer Mode in v0.1

This mode is intentionally conservative but still lightweight. It does:

- seed-based generation
- motif repetition with pitch variation
- stable-tone phrase endings
- interval-size limits
- local melody fingerprint generation
- local session similarity scoring
- cliche pattern warnings
- provenance JSON export

It does not provide a legal guarantee. It should be presented as risk reduction, not copyright clearance.
