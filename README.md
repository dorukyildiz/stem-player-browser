# stem player browser

Upload a song and split it into **vocals, drums, bass, and other** — entirely in your browser. No backend, no uploads: your audio never leaves your device. Mix the separated stems live with per-track volume and full playback controls.

**Live demo:** https://stem-player-browser.netlify.app/


## Features

- **In-browser stem separation** — runs Demucs (htdemucs, v4) locally via ONNX Runtime Web, with no server involved.
- **Off-thread processing** — separation runs in a Web Worker, so the UI never freezes while a track is being processed.
- **Synchronized mixer** — all four stems play in perfect sync through the Web Audio API, each with independent volume control.
- **Full transport** — play, pause, and seek with a live time display.
- **Private by design** — audio is processed on-device and is never uploaded anywhere.
- **Live progress** — model download and separation progress are shown while you wait.

## How it works

1. The uploaded file is decoded and resampled to 44.1 kHz stereo on the main thread.
2. The heavy lifting, Demucs inference, runs in a Web Worker via ONNX Runtime Web (WebGPU with a WASM fallback), keeping the page responsive. The model (~170 MB) is fetched from Hugging Face on first use and cached by the browser afterwards.
3. Each of the four resulting stems is turned into an `AudioBuffer`, routed through its own `GainNode` into a shared output, and all sources are started at the same instant for sample-accurate sync.

Because ONNX Runtime Web relies on `SharedArrayBuffer`, the page must be **cross-origin isolated** (COOP/COEP headers). This is configured in `vite.config.ts` for development and `netlify.toml` for production.

## Tech stack

- **Vite + React + TypeScript**
- **Web Audio API** — playback engine and per-stem mixer
- **onnxruntime-web + demucs-web** — in-browser Demucs source separation
- **Web Worker** — off-main-thread inference
- **Netlify** — hosting with cross-origin isolation headers

## Running locally

Requires Node.js 20.19+ (or 22.12+).

```bash
npm install
npm run dev
```

Open the printed local URL. To confirm cross-origin isolation is active, run `crossOriginIsolated` in the browser console — it should return `true`.

## Building

```bash
npm run build
npm run preview
```

## Acknowledgements

- [Demucs](https://github.com/facebookresearch/demucs) — music source separation model by Meta AI
- [demucs-web](https://github.com/timcsy/demucs-web) — ONNX Runtime Web port of Demucs
- Favicon from [Twemoji](https://github.com/jdecked/twemoji) (CC-BY 4.0)

## Author

Built by **Doruk YILDIZ** — [GitHub](https://github.com/dorukyildiz)