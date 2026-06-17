# MVP v0.1 Implementation Plan

## 1. Product scope

Build a static browser app that creates short monophonic MIDI melody seeds for Suno upload/cover workflows.

Primary flow:

```txt
Generate → Preview → Download MIDI → Render locally → Upload to Suno
```

## 2. Frontend shell

- Vite + React + TypeScript
- One-screen interface
- Left column: seed, settings, transport/export
- Right column: piano roll, stats, risk/quality signals

## 3. Generation engine

- Use deterministic seeded RNG
- Generate a 1–2 bar motif
- Repeat motif across the requested bar length
- Apply small scale-step variations
- Prefer tonic/third/fifth stable tones
- Limit large interval jumps
- End phrases on stable tones
- Use rhythmic templates instead of fully random note lengths
- Include rests via rest chance

## 4. Commercial Safer Mode

- More attempts per generation
- Reject or downgrade overly plain melodies
- Avoid obvious scale runs and repeated-note patterns
- Generate fingerprint from pitch classes, intervals, rhythm, contour, n-grams
- Compare against local session history
- Export provenance metadata

## 5. Playback and export

- Tone.js preview using a simple synth lead
- `@tonejs/midi` export with tempo metadata
- JSON provenance download next to the MIDI

## 6. Deployment

- Static build with `npm run build`
- Netlify publishes `dist`
- No backend required
