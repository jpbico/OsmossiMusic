# Osmossi Music

Create original music for **Osmossi.purpose** Instagram reels, stories and carousels, powered by [SunoAPI.org](https://docs.sunoapi.org/).

The app asks for three things:

1. **Content type**: Reel, Story or Carousel (sets the length and structure of the track)
2. **Topic**: Product, Lifestyle, Artisan stories or The shop (sets instrumentation and feel)
3. **Emotion**: one or two moods to evoke (calm, warm, joyful, inspired, nostalgic, …)

It turns those choices into a Suno style prompt (editable under *More options*), starts the generation and shows the two versions Suno creates, with players and MP3 download links.

## How it works

```
index.html / app.js / styles.css   static front-end (repository root)
netlify/functions/generate.mjs     POST /api/generate  -> Suno /api/v1/generate
netlify/functions/status.mjs       GET  /api/status    -> Suno /api/v1/generate/record-info
netlify/functions/credits.mjs      GET  /api/credits   -> Suno /api/v1/generate/credit
netlify/functions/callback.mjs     callback URL Suno requires (the app polls instead)
```

The SunoAPI key lives only in Netlify's environment variables and is used by the serverless functions, so it is never committed to this repository or sent to the browser.

## Deploying on Netlify

1. In Netlify: **Add new site → Import an existing project →** pick this GitHub repository.
2. Build settings are read from `netlify.toml` (no build command, publish directory `.`). Leave them as they are.
3. In **Site configuration → Environment variables**, add:

   | Variable | Required | Value |
   |---|---|---|
   | `SUNO_API_KEY` | yes | your SunoAPI.org key |
   | `APP_PASSWORD` | recommended | a team password; the app asks for it before creating music, so nobody else can spend your credits |
   | `SUNO_API_BASE` | no | defaults to `https://api.sunoapi.org` |

4. Trigger a redeploy (**Deploys → Trigger deploy**) so the functions pick up the variables.

## Local development

```bash
npm install -g netlify-cli
SUNO_API_KEY=your-key netlify dev
```

## Notes

- Each request makes two track variations and uses SunoAPI credits. Remaining credits are shown under the title.
- Generation takes about 1–3 minutes. Suno keeps files for 14 days, so download the version you want to use.
- "Instrumental" is the default because it sits best under voice-over and on-screen text. With vocals and no lyrics, Suno writes the lyrics itself; in that mode the length and "Avoid" settings are not supported by the API.
