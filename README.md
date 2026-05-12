# Scale Reader — Mettler Toledo Web UI

A browser-based web app for live weight readings from a Mettler Toledo balance.
No server, no Python — the browser talks to the scale directly via the WebSerial API.

**Browser required:** Chrome or Edge v89+ (Firefox and Safari do not support WebSerial)

---

## Hardware

| Item | Details |
|---|---|
| Scale | Mettler Toledo JE1002G/A (1200 g analytical balance) |
| Cable | USB-to-RS232 adapter (FTDI UT232R chip) |
| Serial settings | 9600 baud, 8N1, no flow control |

Plug the USB adapter in — the in-app **Setup** button (ⓘ) has per-OS driver
and permission instructions for Linux, macOS, and Windows.

---

## Running locally

```bash
npm install
npm run dev       # → http://localhost:5173
npm run build     # production build → dist/
npm run preview   # preview the production build
```

WebSerial works on localhost without HTTPS.

---

## App features

| Feature | Notes |
|---|---|
| **Live weight display** | Shows current weight with STABLE / SETTLING / OVERLOAD / UNDERLOAD state |
| **Tare / Zero** | Sends `T\r\n` or `Z\r\n` to the scale |
| **Capture** | Saves current reading (value, unit, stability, timestamp) to an in-page log |
| **Captured readings log** | Scrollable table; clearable |
| **Raw serial debug panel** | Collapsible; shows last 200 raw MT-SICS lines |
| **Setup instructions modal** | In-app ⓘ button; tabs for Linux, macOS, Windows |
| **Auto-reconnect** | On page load, auto-connects if port was granted in a prior session |

---

## Architecture

```
src/
├── hooks/useScaleSerial.js   — all WebSerial + MT-SICS logic
├── utils/parseMtSics.js      — parses MT-SICS response lines into structs
├── components/
│   ├── ConnectPanel.jsx      — connect/disconnect button + status dot
│   ├── WeightDisplay.jsx     — live weight readout with stability label
│   ├── CaptureLog.jsx        — timestamped table of captured readings
│   ├── RawDebug.jsx          — collapsible raw serial line log
│   └── SetupInfoModal.jsx    — OS-specific driver/permission instructions
└── App.jsx                   — composes components; owns captures array
```

**Data flow:** `useScaleSerial` owns port state; emits `reading` (latest parsed
weight) and `rawLines` (last 200 raw lines). `App` passes these down as props
and owns the `captures` array.

On connect the hook sends `SIR\r\n` (continuous stream). If no data arrives
within 2 s it falls back to polling with `SI\r\n` every 500 ms. On disconnect
it sends `@\r\n` (reset / stop continuous mode).

---

## MT-SICS protocol reference

Response format: `CMD STATUS VALUE UNIT` — e.g. `S S       1.234 g`

### Status codes

| Code | Meaning |
|---|---|
| `S` | Stable reading |
| `D` | Dynamic — still settling |
| `A` | Acknowledged (no value) |
| `I` | Not executable right now |
| `+` | Overload |
| `-` | Underload |
| `L` | Unknown command |
| `B` | List body item (used by `I0` multi-line response) |

### Key commands used by the app

| Command | What it does |
|---|---|
| `SIR\r\n` | Start continuous weight stream (sent on connect) |
| `SI\r\n` | Immediate single weight (fallback poll) |
| `T\r\n` | Tare |
| `Z\r\n` | Zero |
| `@\r\n` | Reset / stop continuous mode (sent on disconnect) |

### Full command reference

| Command | What it does | Example response |
|---|---|---|
| `I1\r\n` | Balance identification | `I1 A "0123" "2.30"` |
| `I2\r\n` | Model and capacity | `I2 A "JE1002G/A 1200.90 g"` |
| `I3\r\n` | Software / serial info | `I3 A "1.20 34.28.3.4485.1729"` |
| `I0\r\n` | List all supported commands | *(multi-line — see note below)* |
| `S\r\n` | Weight — waits until stable | `S S       1.234 g` |
| `TA\r\n` | Get current tare value | `TA S       0.00 g` |
| `TAC\r\n` | Clear tare | `TAC A` |

> **I0 quirk:** `I0` returns one line per command (status `B`) with a final
> `A` line. Reading only one line will corrupt the buffer. Always drain all
> lines until a non-`B` status appears.

### This scale's supported commands (JE1002G/A)

| Level | Commands |
|---|---|
| 0 | `I0 I1 I2 I3 I4 I5 S SI SIR Z @` |
| 1 | `D DW K SR T TA TAC` |
| 2 | `C0 C1 C3 DAT TIM PWR SIU SU SIRU SNRU SRU SNR ST M02–M92 I10 I11 I14 I26 I33 I51 I54 I55 E01 TST0–TST3 UPD` |
| 3 | `PW SM0 SM1 SM2 SM3 SM4` |

---

## Integrating into your app

`useScaleSerial` is the integration seam. Drop it into your React app and wire
the `capture()` callback in `App.jsx` to your API endpoint — there is a
commented-out `fetch` stub at `App.jsx:30`.

WebSerial requires a user gesture to call `navigator.serial.requestPort()`;
the Connect button satisfies this. No server-side component is needed.

---

## Hardware reference

| Item | Value |
|---|---|
| USB adapter chip | FTDI UT232R (VID `0403`, PID `6001`) |
| Linux driver | `ftdi_sio` (ships with modern kernels, auto-loaded) |
| Linux device file | `/dev/ttyUSB0` |
| macOS device file | `/dev/tty.usbserial-*` |
| Windows | Appears as `COMx` in Device Manager |
| Scale model | Mettler Toledo JE1002G/A |
| Max capacity | 1200.90 g |
| Protocol | MT-SICS (all levels 0–3) |
