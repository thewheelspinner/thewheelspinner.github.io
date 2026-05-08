# Shortcode wheels

Three URL params let any page on the site spin a custom wheel without
hard-coding a preset list.

| Param   | Source                          | Use                                |
|---------|---------------------------------|------------------------------------|
| `?w=`   | `/wheels/<slug>.json`           | Permanent slug (committed file)    |
| `?id=`  | `/wheels/temp/<id>.json`        | Temporary / disposable wheel       |
| `?data=`| inline base64-encoded JSON      | No fetch — share via URL only      |

Slug/id charset is restricted to `[A-Za-z0-9._-]` so a malicious query
string cannot point fetch at an off-site URL.

## JSON shape

```json
{
  "title": "Movie Night Picker",
  "entries": ["Action", "Comedy", "Horror", "Sci-Fi"],
  "colors": ["#ef4444", "#f97316", "#eab308", "#22c55e"],
  "stylePreset": "retro",
  "spinDuration": 4
}
```

- `entries` — required, 2–20 strings, each capped at 40 chars.
- `colors` — optional, parallel array of hex colors. Empty string keeps the
  palette default.
- `stylePreset` — one of `vivid`, `pastel`, `mono`, `neon`, `retro`, `earth`.
- `spinDuration` — seconds, 1–10.
- `title` — optional, used for the document title.

## Examples

Sample files committed to the repo:

- https://thewheelspinner.github.io/?w=movie-night
- https://thewheelspinner.github.io/?w=standup-order
- https://thewheelspinner.github.io/?w=chore-roulette
- https://thewheelspinner.github.io/?id=demo-abc123 (temp)

Inline (no file needed):

```js
const url = '/?data=' + btoa(JSON.stringify({
  title: 'Quick pick',
  entries: ['Tea', 'Coffee', 'Water']
}));
```

## Permanent slugs (basic version)

A permanent slug is just a static `/wheels/<slug>.json` file served from
GitHub Pages today and Cloudflare Pages later. To publish one
programmatically, push the file to this repo via the GitHub Contents API:

```bash
SLUG=my-wheel
BODY=$(jq -nc \
  --arg t "My Wheel" \
  --argjson e '["A","B","C"]' \
  '{title:$t, entries:$e, stylePreset:"vivid"}')

curl -X PUT "https://api.github.com/repos/thewheelspinner/thewheelspinner.github.io/contents/wheels/${SLUG}.json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -d "$(jq -nc \
    --arg msg "Add wheel: ${SLUG}" \
    --arg branch "main" \
    --arg content "$(printf '%s' "$BODY" | base64 -w0)" \
    '{message:$msg, branch:$branch, content:$content}')"
```

Once the commit lands, the wheel is live at:

```
https://thewheelspinner.github.io/?w=my-wheel
```

(Same idea on Cloudflare Pages — drop the JSON in the Pages project's
output directory; the `?w=` URL works unchanged.)

## Temp wheels

Files under `/wheels/temp/` are meant to be short-lived. Same publish
mechanism, just write to `wheels/temp/<id>.json`. Garbage-collect them
later by deleting the files in a follow-up commit.
