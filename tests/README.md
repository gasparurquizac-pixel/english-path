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

Microphone failures are injected, not tested on real hardware. Offline coverage is for an already-loaded app, not a service-worker installation. Cross-tab protection detects a changed storage snapshot; it does not merge sessions or provide a transactional multi-user database. Downloaded JSON is a data copy; this change does not add an import screen.

## Reviewed learning units

```sh
node tests/pedagogy.cjs
```

This suite visits the reviewed B1/B2 units, their contextual reading and dictionary, a practice session and mixed-conditional topic selection. It checks migration of previous question/SRS records and today's affected plan, preservation of writing drafts and old review criteria, durable recording of new answers, archive export/reset, mobile layout and the unchanged 2,000-question total.

These are functional/content-integrity checks. They do not assess actual learner acquisition or certify a CEFR level. The editorial scope, rationale and external references are in [the pedagogy review](../docs/pedagogy-review-2026-11.md).
