# media/ — raw source footage

Original clips kept for future use. **Nothing in the live site or app reads from
this folder**, so deleting a file here breaks nothing — but these are the only
copies in the repository, so treat them as originals rather than working files.

The assets the site actually serves live in two places, both of which must stay
in sync:

| Location | Used by |
|---|---|
| `site/media/` | the static marketing site (`site/*.html`, relative `media/...` paths) |
| `app/public/media/` | the Next.js app (root-absolute `/media/...` paths) |

## What's here

| File | Notes |
|---|---|
| `game-clip-1.mp4` / `game-clip-1-slowmo.mp4` | Game footage. A colour-graded variant of clip 1 ships as `game-clip-1-action-slowmo.mp4` in the live folders. |
| `game-clip-2.mp4` / `game-clip-2-slowmo.mp4` | Game footage, unused on the site so far. |
| `hands-slowmo.mp4` | Stickhandling close-up. |
| `shot-rear-slowmo.mp4` | Rear-angle shot. Not used — the site favours side-on, which supports a mechanics read. |
| `poster-clip-2.jpg`, `poster-shot-rear.jpg` | Poster frames for the above. |

## If you add one to the site

Copy it into **both** `site/media/` and `app/public/media/`, then reference it as
`media/<file>` in `site/*.html` and `/media/<file>` in the Next.js pages.
