# WEATHER STATIC STUDIO

A dark-themed browser music workspace prototype.

## Run it
Open `index.html` in a modern browser. For microphone recording, use `localhost` or an HTTPS-hosted version (browser microphone permissions are restricted on ordinary local files in some browsers).

## Included in v0.1
- Home dashboard
- AI prompt builder (prepares/copies a request; no AI provider is connected)
- Browser-based soft-sine keyboard
- Microphone recording and playback
- Download recorded microphone take as WebM

## Important
AI generation requires an external music-generation provider/API and usually a backend to keep API keys private. Do not put secret API keys in frontend JavaScript or a public GitHub repository.

## Publish on GitHub Pages
1. Create a repository named `weather-static-studio`.
2. Upload `index.html`, `style.css`, `app.js`, and this README to the repository root.
3. In Settings → Pages, choose Deploy from a branch, select `main` and `/ (root)`.
4. Open the Pages URL. Use HTTPS for microphone recording.

## Next build milestones
1. Multitrack timeline with clips and editing.
2. More instruments: guitar-like plucks, bass, drums and piano.
3. WAV export and project save/load.
4. Connect an AI music provider through a secure backend.
