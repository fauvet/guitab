---
name: web-audio-pitch
description: Capturing sound and turning it into notes — Web Audio microphone capture, aubio's pitch and onset detection in WebAssembly, the Hz to MIDI to note-name arithmetic, note segmentation, and mapping notes onto a guitar fretboard. Use when working on the pitch monitor, the solo tab generator, or anything reading audio.
---

# Sound in, notes out

The chain is five steps, and each one has a natural home:

```
microphone or file  →  frames of samples  →  frequency + onset  →  note events  →  fret positions  →  tab lines
       Web Audio           Web Audio              aubio             utils/           utils/          SoloTabUtil
```

Everything from "note events" rightwards is **pure**, lives in `src/app/utils/`, and
is tested with plain arrays. Everything left of it lives in
`src/app/services/pitch-detection/`. That line is the reason the musical logic can be
tested without a microphone, and it is worth defending.

## Capturing audio

```typescript
const stream = await navigator.mediaDevices.getUserMedia({
  audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
});
```

**Turn off the three processing flags.** They are designed for speech
intelligibility, and every one of them damages pitch detection: noise suppression
attacks sustained tones as if they were background hum, and automatic gain control
changes amplitude mid-note, which confuses onset detection into inventing attacks.
The defaults are `true`.

Then `new AudioContext()`, `createMediaStreamSource(stream)`, and an `AnalyserNode`
whose `getFloatTimeDomainData()` fills a `Float32Array` with raw samples. Read it in
a `requestAnimationFrame` loop.

Three constraints on the environment:

- **`getUserMedia` requires a secure context** — HTTPS or `localhost`. The deployed
  app is on HTTPS, so this only ever bites when testing from a phone against a dev
  server on a LAN address.
- **An `AudioContext` starts suspended** until a user gesture. Create it inside the
  click handler, or call `resume()` there.
- **Release everything on stop**: `track.stop()` on every track of the stream, then
  `audioContext.close()`. Skipping the first leaves the browser's recording
  indicator on, which users reasonably read as spyware.

For a file, `decodeAudioData()` on the `ArrayBuffer` gives an `AudioBuffer`, and the
same detector runs over it in a sliding window — no realtime constraint, so it can
be done in one pass.

## aubio, and why it is here

`aubiojs` is aubio compiled to WebAssembly. It initialises asynchronously and is
loaded with a dynamic `import()` so its weight never reaches the app shell:

```typescript
const { default: aubio } = await import("aubiojs");
const { Pitch, Onset } = await aubio();
const pitchDetector = new Pitch("yinfft", bufferSize, hopSize, sampleRate);
const onsetDetector = new Onset(bufferSize, hopSize, sampleRate);
```

`Pitch.do(buffer)` returns a frequency in Hz, or `0` when it hears nothing usable.
`Onset.do(buffer)` returns non-zero on the frame where a note starts.

**Onset detection is the entire reason this library is a dependency, and the reason
the app is GPL-licensed.** Pitch tracking alone cannot tell two identical repeated
notes from one held note — the frequency simply does not change. Without onsets, a
hummed `A A A` transcribes as a single long `A`, and the musician has no way to see
that it is wrong. No permissively licensed browser library provides it.

Pitch methods available: `yinfft` (the default and the best general choice), `yin`,
`yinfast`, `mcomb`, `fcomb`, `schmitt`, `specacf`. Prefer `yinfft` unless measuring
something specific.

`bufferSize` and `hopSize` are the latency/accuracy trade-off. A larger buffer
resolves low frequencies better — an estimate needs at least one full wave cycle, so
a low E at 82 Hz needs 12 ms of signal before it can exist at all — and costs
responsiveness. 2048 / 256 at 44.1 kHz is a reasonable starting point.

### What realtime gives up

Offline transcribers such as pYIN run a Viterbi decode over the whole recording,
choosing the globally cheapest path through the pitch candidates, which is how they
suppress octave errors. Causal detection cannot do that — it has not heard the rest
of the signal yet. Expect occasional octave jumps in the live read-out, and design
the UI so correcting them is easy rather than pretending they will not happen.

## The arithmetic

Equal temperament, A4 = 440 Hz, MIDI note 69:

```
midi      = 69 + 12 · log2(frequency / 440)
frequency = 440 · 2^((midi − 69) / 12)
cents     = 100 · (midiFloat − round(midiFloat))
```

The note name is `midi % 12` indexed into
`["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]`, and the octave
is `floor(midi / 12) − 1`. That `− 1` is the convention where middle C is C4 = MIDI
60; get it wrong and everything is displayed an octave off, consistently enough to
look deliberate.

Sharps are used throughout rather than flats. It is a choice, not a truth — an
`A#` and a `B♭` are the same fret — and it keeps the display unambiguous.

## Segmenting frames into notes

Rounding each frame to the nearest semitone and grouping equal neighbours does not
work: a human voice wobbles across a semitone boundary constantly, producing a
stutter of alternating notes. What does work:

1. Drop frames the detector reported as silent.
2. Round to the nearest semitone, then **median-filter** over a small window, which
   removes single-frame excursions without smearing real transitions.
3. Require a **minimum duration** before emitting a note — around 70 ms. Shorter
   runs are detector noise, not something a person sang.
4. **An onset always starts a new note**, even at the same pitch. This is the step
   that makes repeated notes work.
5. A gap in voicing ends the current note.

The minimum duration and the onset sensitivity are the two knobs that need
calibrating against a real voice. Keep them parameters with defaults, never
constants buried in a loop.

## Onto the fretboard

Standard tuning as MIDI, ordered to match `SoloTabUtil`'s `e B G D A E` header —
string index 0 is the high E:

```typescript
const STANDARD_TUNING_MIDI = [64, 59, 55, 50, 45, 40];
```

A note is playable at `midi − STANDARD_TUNING_MIDI[stringIndex]` on each string where
that value is between 0 and the last fret, so most notes have three or four valid
positions. Choosing among them is the interesting part:

- **Prefer a position near a target fret.** Solos usually sit around the twelfth
  fret, where the guitar cuts through a mix — hence the default. It is a preference,
  exposed to the user, not a rule.
- **Prefer staying near the previous note.** Minimising hand movement produces a
  playable phrase; choosing each note independently produces one that leaps around
  the neck.

A hummed melody also needs **transposing**: a voice sits one to two octaves below a
lead guitar line. Shifting by whole octaves preserves the melody exactly, so pick the
shift that lands the phrase closest to the target fret. Display the note actually
sung, and transpose only when producing the tab — the musician should be able to see
that the tool heard them correctly.

## Testing all of this

The pure utils take arrays of numbers and are tested directly — a synthetic frame
list with a known onset asserts the segmentation without any audio at all.

For the service, jsdom has neither `AudioContext` nor `navigator.mediaDevices`, so
both are stubbed with `vi.stubGlobal`, along with the aubio module. Those tests check
the wiring and the teardown — that stopping releases the tracks — not the accuracy of
the detection, which belongs to aubio and is not ours to re-test.
