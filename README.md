# WEATHER STATIC STUDIO v1.0

## What's included
- AI song generation UI: one-sentence prompt or custom style + lyrics, vocals/instrumental, length, one or two takes.
- Eroq API proxy as a Cloudflare Worker so the API key is not exposed in GitHub Pages.
- Async status polling and MP3 playback/download.
- Browser-local generated-song library.
- Basic audio mixer: import multiple audio files, record microphone takes, per-track volume/mute/remove, master level, simultaneous playback.
- Export a JSON session track list.

## Important limits
- The AI feature requires an Eroq account/API key and credits. The provider's engine may return an unavailable error.
- GitHub Pages is static hosting and cannot safely store a secret API key. Deploy `worker.js` separately as a Cloudflare Worker.
- This first studio release is a basic mixer, not a full DAW: no waveform trimming, MIDI piano roll, multitrack WAV render, stems, or offline project media packaging yet.
- The song generator returns finished MP3s, not separate instrument/vocal stems.
- Library URLs are stored in this browser's localStorage. Download MP3s to keep permanent copies.

## Deploy the website
1. Replace `index.html`, `style.css`, and `app.js` in the root of your GitHub repo with these files.
2. Commit the changes. GitHub Pages should redeploy automatically.

## Deploy the private API backend (Cloudflare Workers)
1. Create/sign in to a Cloudflare account and open Workers & Pages.
2. Create a Worker named e.g. `weather-static-api`.
3. Replace the starter Worker code with `worker.js` from this folder and deploy.
4. In the Worker settings, open Variables and Secrets.
5. Add a secret named exactly `EROQ_API_KEY` with your private key from https://eroq.ai/keys.
6. Redeploy if Cloudflare asks you to.
7. Copy the Worker URL, e.g. `https://weather-static-api.<your-subdomain>.workers.dev`.
8. Open your GitHub Pages website → AI Song Generator → paste the Worker URL into BACKEND URL → Save connection.

Never put the Eroq API key in app.js, index.html, GitHub, or a message to anyone.

## Generate
- Simple mode: enter one sentence describing the song.
- Custom mode: enter style and optional lyrics. Lyrics section labels should be on their own lines: [Verse], [Chorus], [Bridge], etc.
- Choose length and number of takes. One take uses fewer credits than two.
- Click Generate. Jobs are polled automatically and the MP3 appears when ready.

## Local development
Open `index.html` on HTTPS or localhost. Microphone recording requires HTTPS or localhost.
