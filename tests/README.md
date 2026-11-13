# Reliability checks

These browser tests use disposable browser profiles and synthetic learner data. They do not use an existing browser profile or microphone audio.

Prerequisites: Node.js, Python 3 and Playwright with Chromium installed.

```sh
npm install --no-save playwright
npx playwright install chromium
python -m http.server 8000 --bind 127.0.0.1
```

In another terminal, from the repository root:

```sh
node tests/reliability.cjs
```

Set `KLEVY_TEST_URL` to change the app URL. Set `CHROMIUM_PATH` to use a system Chromium executable instead of Playwright's browser.

The suite checks:

- Unreadable/malformed saved data is preserved byte-for-byte and can be downloaded.
- Valid older data, writing drafts, notebook entries and unknown fields survive reload.
- Storage/quota failures are visible across navigation and a retry saves the current session.
- A failed initial read cannot overwrite existing data on retry.
- A stale tab cannot overwrite a newer tab's saved data; reloading loads the newer data.
- A session download includes the latest writing draft, even before its debounce timer fires.
- A confirmed reset can replace protected data.
- Denied microphone permission permits retry; a stream arriving after navigation is stopped.
- An already-loaded practice works offline; unavailable news/audio show a usable failure message.

Microphone failures are injected, not tested on real hardware. Offline coverage is for an already-loaded app, not a service-worker installation. Cross-tab protection detects a changed storage snapshot; it does not merge sessions or provide a transactional multi-user database. Downloaded JSON can be restored using the backup screen described below.

## Reviewed learning units

```sh
node tests/pedagogy.cjs
```

This suite visits the reviewed B1/B2 units, their contextual reading and dictionary, a practice session and mixed-conditional topic selection. It checks migration of previous question/SRS records and today's affected plan, preservation of writing drafts and old review criteria, durable recording of new answers, archive export/reset, mobile layout and the unchanged 2,000-question total.

These are functional/content-integrity checks. They do not assess actual learner acquisition or certify a CEFR level. The editorial scope, rationale and external references are in [the pedagogy review](../docs/pedagogy-review-2026-11.md).


## Listening answer feedback

```sh
node tests/listening-feedback.cjs
```

Checks correct and incorrect selections across all 12 natural-listening lessons at 390px and 320px widths, light/dark appearance, visible English answer/forward button, marked options, optional Spanish explanation, accepted short answers, honest self-review, escaped response text, reload/resume, preserved progress, and the separate standard listening flow.

Set `KLEVY_SCREENSHOT_DIR` to an existing directory to capture the first incorrect answer in both viewport sizes. The test uses disposable profiles and does not alter an existing learner profile.

## Transcript evidence

```sh
node tests/listening-evidence.cjs
```

Checks literal transcript excerpts for both graded answers in every listening lesson, uniquely located text, no evidence/highlights before grading, attributed speakers, dictionary/notebook source, focused and highlighted context, post-answer review separated from pre-answer help, unchanged correctness/play counts, reload/progress and a fallback that omits invalid quotations. Plays all 12 actual local MP3s over HTTP. `KLEVY_SCREENSHOT_DIR` optionally captures the highlighted context.

The editorial selections and scope are documented in [the evidence review](../docs/listening-evidence.md). Exactness here means matching the stored transcript; the test does not establish word-for-word transcription accuracy against the recording.

## B1 routines and travel plans

```sh
node tests/b1-routines-plans.cjs
```

Checks the two additional reviewed units, goal/context visibility, independent answer-meaning fixtures (duration, future-form overlap, booking acceptance, ticket restrictions and a spoken correction), speech API input, removal of obsolete word audio, preservation of historical scores/SRS/drafts/review criteria, multiple archive snapshots on the same day, new answers after reload, export and the mobile flow.

These are functional/editorial checks, not evidence of measured acquisition. The scope and references are in [the review report](../docs/pedagogy-b1-routines-plans.md). Synthetic speech input is inspected with an instrumented speech API; pronunciation on an actual iPhone remains a device check.


## Backup restoration

```sh
node tests/backup-restore.cjs
```

Exercises new versioned and historical raw JSON copies through the file picker and confirmation screen. Checks full populated state (including listening/conversation/news drafts, SRS, notebook and writing), preview/cancel/focus, the single automatic previous-state copy, download and reset, old-content migration, malformed/unsafe/oversized files, asynchronous file selection, quota/read failures, stale changes, corrupt original bytes and pending writing drafts. Tests use disposable profiles and synthetic data; no learner backup is uploaded or modified.

See [backup usage and design](../docs/backup-restore.md) for replacement behavior and limitations. Chromium mobile viewports are checked; an actual iPhone/Safari file-picker and Files download check is still a device validation.


## B1 food and quantities

```sh
node tests/quantity.cjs
```

Checks the revised unit, 15 independently specified meaning cases, five distinct synthetic-listening situations, speech input and removal of obsolete word audio, dedicated oral/writing flows, unchanged earlier drafts and score/SRS records, archived prior quick-check selections, unit-linked daily plan migration (including plans whose questions come from another unit), reload, versioned backup validation and mobile layout. Existing writing drafts retain their daily-plan priority.

The full editorial scope and limitations are in [the quantities review](../docs/pedagogy-b1-quantity.md). Tests do not measure learner acquisition or certify B1. Actual iPhone speech/microphone/file handling remains a device check.

## Vocabulary audio instructions and feedback

```sh
node tests/vocabulary-audio.cjs
```

Exercises every one of the 125 vocabulary audio items with correct and incorrect selections (250 rendered cases), distinguishing English recognition from contextual Spanish meaning. Checks explicit target words, completed English examples, speech API payloads, visible English/Spanish feedback, replay without regrading, keyboard use, metadata fallback, persistent score/SRS/drafts, export and light/dark layout at 320px. Independent cases include staff turnover and headache.

See [the vocabulary audio fix](../docs/vocabulary-audio-feedback.md) for scope and compatibility. Speech API input is instrumented; actual voice playback and pronunciation on an iPhone remain device checks.
