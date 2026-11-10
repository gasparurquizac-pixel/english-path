# El inglés de hoy

`/api/news` is a Cloudflare Pages Function. It reads the official NASA RSS feed, filters invalid, future and older-than-30-day entries, and returns one recent item. Feed summaries remain publisher excerpts, not generated adaptations. No API key or paid language model is used.

The server caches responses for 30 minutes, and the browser pins its selection for the calendar day in America/Argentina/Buenos_Aires. Dates for publication and last retrieval are displayed separately. A story may repeat when no suitable new item is available.

`curated.json` contains checked, source-specific Klevy adaptations and comprehension questions keyed by the original URL. Both B1 and B2 must be checked against the linked source before adding an entry. Unreviewed new stories use the original RSS excerpt and self-review prompts instead of invented adapted text or an automatic answer key.

`latest.json` is a dated snapshot. It is only a fallback when the live API cannot be reached, and the interface identifies it as a saved selection with its retrieval date. Browser drafts and selections are stored in the existing learner state and are included in the full reset.

Sources and reuse:
- Official feed: https://www.nasa.gov/feed/
- Feed documentation: https://www.nasa.gov/rss-feeds/
- Reuse guidance: https://www.nasa.gov/nasa-brand-center/images-and-media/

Only text is used; no third-party photographs or NASA logos are copied. NASA is credited as publisher of the source excerpt; Klevy adaptations and examples are labelled separately. This app is not affiliated with NASA.

Cloudflare Functions routing is restricted to `/api/news` through `_routes.json`, leaving HTML, images and MP3 assets static. GitHub Pages cannot run the function; the saved fallback is available there but automatic updates require the Cloudflare deployment.

Validation: `node /path/to/api-test.mjs` exercises parsing, date rollover, allowed links, cache and source failure. Browser tests cover the B1/B2 adapted flow, original-only new items, draft recovery, dictionary source attribution, recording and dated fallback.
