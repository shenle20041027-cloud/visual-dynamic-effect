<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# VJ Live Runtime

This repository contains the现场 VJ 模块 runtime for the show controller and screen outputs.

## Runtime Topology

- Local VJ app port: `4302`
- Show controller backend: `http://localhost:4300`
- Show controller websocket: `ws://localhost:4300/ws`
- Screen sync channel: `/sync` on the same `4302` server
- Screen pages use `/screen/<screenId>` on the same origin and sync through the same `/sync` websocket

The app server on `4302` serves the UI, proxies `/api` to `http://localhost:4300`, and keeps `/sync` on the same listener for controller/screen synchronization.

## Install And Run

Prerequisite: Node.js

1. Install dependencies:
   `npm install`
2. Development runtime:
   `npm run dev`
3. Build the static runtime:
   `npm run build`
4. Start the built runtime:
   `npm run start`
5. Full live show flow:
   `npm run live`

## Show Usage

Use `npm run live` for现场全屏/上屏 operation, or run `npm run build` followed by `npm run start`.

Do not use Vite dev/HMR for the live show surface. The live runtime does not include `/@vite/client` or `__vite_hmr`; it serves only static pages, `/sync`, and the `/api` proxy.

## Controller And Screen Notes

- The controller connects to `http://localhost:4300` and `ws://localhost:4300/ws`.
- `/sync` is the shared synchronization channel between the VJ controller and each `/screen/<screenId>` page.
- If the app cannot reach `4300`, the VJ page still renders and local interaction still works, but SHOW API audio-driven features degrade or stop.

## Deployment Notes

Deploying this app to Vercel is not equivalent to the local live runtime.

- `server.mjs` is a long-running Express process with a live `/sync` websocket, which does not map cleanly to Vercel static hosting.
- If only the static build is deployed, `/sync` and the `/api` proxy will not behave the same way they do locally.
- `localhost:4300` always points to the visitor's own machine, not automatically to the现场 controller.
- Remote deployment requires a public controller URL and a separate websocket/sync service design.

