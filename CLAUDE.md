# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # first-time setup
npm run dev          # start Vite dev server → http://localhost:5173
npm run build        # production build → dist/
npm run preview      # preview production build locally
```

WebSerial only works in Chrome/Edge on desktop. The Vite dev server (localhost) counts as a secure context, so no HTTPS setup is needed for local development.

## Hardware context

Scale: **Mettler Toledo JE1002G/A** (1200 g analytical balance)  
Protocol: **MT-SICS** (Mettler Toledo Standard Interface Command Set)  
Connection: USB-to-RS232 adapter (FTDI UT232R) → `/dev/ttyUSB0` on Linux  
Serial settings: **9600 baud, 8N1** (no parity, 1 stop bit, no flow control)

## Architecture

```
src/
├── hooks/useScaleSerial.js   — all WebSerial + MT-SICS logic
├── utils/parseMtSics.js      — parses MT-SICS response lines into structs
├── components/
│   ├── ConnectPanel.jsx      — connect/disconnect button + status indicator
│   ├── WeightDisplay.jsx     — big live weight readout with stability state
│   ├── CaptureLog.jsx        — timestamped list of captured readings
│   └── RawDebug.jsx          — collapsible raw serial line log
└── App.jsx                   — composes components; owns capture state
```

**Data flow**: `useScaleSerial` owns all port state and emits `reading` (latest parsed weight) + `rawLines` (last 200 raw lines). `App` passes these down as props and owns the `captures` array (readings saved by the user).

## MT-SICS protocol notes

Response format: `CMD STATUS VALUE UNIT` — e.g. `S S       1.234 g`

| Status code | Meaning |
|---|---|
| `S` | Stable reading |
| `D` | Dynamic / still settling |
| `+` / `-` | Overload / underload |
| `A` | Acknowledged (no value) |

Key commands sent by the app:
- `SIR\r\n` — start continuous weight stream (sent on connect)
- `@\r\n` — reset / stop continuous mode (sent on disconnect)
- `T\r\n` — tare; `Z\r\n` — zero

The scale echoes the command name as the first token of each response, so `T S 0.00 g` is a tare response, `S D 1.23 g` is a weight reading.

## Integrating into production React app

`useScaleSerial` is the integration seam. Extract it into your app and wire the `capture()` callback in `App.jsx` to your real API endpoint (the stub is a commented-out `fetch` call in `App.jsx:33`).

WebSerial requires a user gesture to call `navigator.serial.requestPort()` — the Connect button satisfies this. No server-side component is needed; reading happens entirely in the browser.
