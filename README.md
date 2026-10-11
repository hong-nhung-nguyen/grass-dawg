# Fetch Quest

A virtual pet dog that refuses to come out until you go outside. All AI runs on your phone using open-weight models, so it works offline after the first load and your photos never leave the device.

Entry for the DEV Hacktoberfest Open-Source AI Challenge, Week 1: Touch Grass.

## What works so far (step 1 and 2)

- Home screen with the pet sulking, facing the wall
- Camera snapshot checked by CLIP (Transformers.js) to decide indoor vs outdoor
- Pet wakes up and celebrates when you're outside
- System check panel: WebGPU support, on-device language model download (Gemma 3 1B by default, with Qwen2.5 alternatives), and a test line from the pet
- Pet stats saved between sessions

## Run it

```bash
npm install
npm run dev
```

The dev server prints a Network URL like `https://192.168.x.x:5173`. Open that on your phone (same Wi-Fi). It uses a self-signed certificate, so accept the browser warning. HTTPS is required for camera access.

## Test order

1. Open System check and confirm WebGPU says supported.
2. Download the language model (use the smaller one if the main one fails) and tap the hello test.
3. Close the panel, tap "Check if we're outside" indoors. The pet should grumble.
4. Go outside and check again. The pet should wake up.

The first CLIP check downloads the vision model (about 150 MB). After that it loads from cache.

## Stack

React + Vite, Tailwind CSS v4, Transformers.js (CLIP ViT-B/32), WebLLM (Gemma 3 1B and Qwen2.5-1.5B / 0.5B), localStorage for now (RxDB with optional MongoDB sync later).
