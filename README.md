# Reading a Mettler Toledo Scale via Serial Port on Linux

A beginner's guide to connecting, configuring, and reading weight data from a
Mettler Toledo balance using a USB-to-serial cable.

---

## What You Need

| Item | Details |
|---|---|
| Scale | Mettler Toledo JE1002G/A (1200 g analytical balance) |
| Cable | USB-to-RS232 adapter (FTDI UT232R chip) |
| OS | Ubuntu Linux |
| Software | Python 3 + pyserial (both pre-installed on Ubuntu) |

---

## How the Connection Works

The scale has a 9-pin RS232 serial port on the back.
Your PC does not have RS232, so you use a **USB-to-RS232 adapter cable**.

```
[ Scale RS232 port ] ──cable──► [ USB-to-RS232 adapter ] ──USB──► [ PC ]
```

When you plug the USB adapter in, Linux automatically creates a device file:

```
/dev/ttyUSB0
```

This file is how your software talks to the scale — reading from it receives
data, writing to it sends commands.

---

## Step 1 — Verify the Cable is Detected

Plug in the USB cable, then run:

```bash
ls /dev/ttyUSB*
```

You should see `/dev/ttyUSB0`. If nothing appears, the driver is not loaded
(unlikely on modern Ubuntu — FTDI chips work out of the box).

To see the adapter's details:

```bash
lsusb
```

Look for a line containing **FTDI** or **Future Technology Devices**.

---

## Step 2 — Fix Permissions (one-time setup)

By default, only the `root` user and members of the `dialout` group can access
serial ports. Add your user to that group:

```bash
sudo usermod -aG dialout $USER
```

**You must log out and log back in** for this to take effect.

To confirm it worked:

```bash
groups
# dialout should appear in the list
```

---

## Step 3 — Serial Port Settings

The scale communicates using these settings (factory defaults):

| Setting | Value |
|---|---|
| Baud rate | 9600 |
| Data bits | 8 |
| Parity | None |
| Stop bits | 1 |
| Handshake | None |
| Line ending | `\r\n` (CR + LF) |

This is commonly written as **9600 8N1**.

> If the scale was reconfigured by someone, these may differ. Check the scale's
> menu under Interface / RS232 settings.

---

## Step 4 — The Protocol (MT-SICS)

Mettler Toledo scales speak a protocol called **MT-SICS**
(Mettler Toledo Standard Interface Command Set).

**How it works:**
1. You send a command as plain ASCII text, ending with `\r\n`
2. The scale sends back a one-line response

**Command format:**
```
COMMAND\r\n
```

**Response format:**
```
COMMAND  STATUS  VALUE  UNIT
```

**Status codes:**

| Code | Meaning |
|---|---|
| `S` | Stable — reliable reading |
| `D` | Dynamic — scale still settling, value may change |
| `A` | Acknowledged — command accepted, no value returned |
| `I` | Not executable right now (e.g. scale is moving) |
| `+` | Overload — too much weight |
| `-` | Underload — below zero range |
| `L` | Unknown command |

---

## Key Commands

| Command | What it does | Example response |
|---|---|---|
| `I1\r\n` | Balance identification | `I1 A "0123" "2.30"` |
| `I2\r\n` | Model and capacity | `I2 A "JE1002G/A 1200.90 g"` |
| `I3\r\n` | Software / serial info | `I3 A "1.20 34.28.3.4485.1729"` |
| `I0\r\n` | List all supported commands | *(multi-line response)* |
| `SI\r\n` | Immediate weight (even if unstable) | `S D       0.00 g` |
| `S\r\n` | Weight — waits until stable | `S S       1.234 g` |
| `SIR\r\n` | Continuous weight stream (push mode) | *(sends readings non-stop)* |
| `T\r\n` | Tare (zero out current weight) | `T S       0.00 g` |
| `TA\r\n` | Get current tare value | `TA S       0.00 g` |
| `TAC\r\n` | Clear tare | `TAC A` |
| `Z\r\n` | Zero the balance | `Z A` |
| `@\r\n` | Reset / stop continuous mode | *(resets scale software)* |

> Commands are **case-sensitive** — always use uppercase.

---

## Step 5 — Test It with Python

Save this as `test_scale.py` and run with `python3 test_scale.py`:

```python
import serial, time

ser = serial.Serial('/dev/ttyUSB0', 9600, timeout=2)

def ask(cmd):
    ser.reset_input_buffer()
    ser.write((cmd + '\r\n').encode())
    return ser.readline().decode('ascii', errors='replace').strip()

print('Model :', ask('I2'))
print('Serial:', ask('I3'))
print()

for _ in range(5):
    print('Weight:', ask('SI'))
    time.sleep(0.3)

ser.close()
```

**Expected output:**
```
Model : I2 A "JE1002G/A 1200.90 g"
Serial: I3 A "1.20 34.28.3.4485.1729"

Weight: S D       0.00 g
Weight: S S       0.00 g
Weight: S S       0.00 g
Weight: S S       0.00 g
Weight: S S       0.00 g
```

---

## Reading the Weight Response

The scale responds to `SI` with a line like:

```
S D       0.00 g
^  ^      ^    ^
|  |      |    └─ unit (g = grams)
|  |      └────── weight value
|  └───────────── status: S=stable, D=dynamic/settling
└──────────────── command echo
```

To parse it in Python:

```python
line  = 'S D      -0.01 g'
parts = line.split()          # ['S', 'D', '-0.01', 'g']
status = parts[1]             # 'S' or 'D'
value  = float(parts[2])      # -0.01
unit   = parts[3]             # 'g'
stable = (status == 'S')
```

---

## Common Issues

| Problem | Cause | Fix |
|---|---|---|
| `Permission denied` on `/dev/ttyUSB0` | Not in `dialout` group | `sudo usermod -aG dialout $USER` then re-login |
| `/dev/ttyUSB0` does not exist | Cable not plugged in or driver issue | Replug cable, run `dmesg \| tail` to check |
| Garbled / empty responses | Wrong baud rate | Confirm scale is set to 9600 in its menu |
| `S I` response (not executable) | Scale is moving or warming up | Wait a moment and retry |
| Commands sent, no response at all | Wrong port or cable wiring | Try `/dev/ttyUSB1`, check cable is RS232 not RS485 |
| Readings corrupted after `I0` command | `I0` is multi-line — must read all lines | Read in a loop until you get a non-`B` status line |

---

## How the Scale's Command List Works (I0 quirk)

The `I0` command returns **one line per supported command**, not just one line.
Each line uses status `B` (body/list item). The final line uses status `A`.

```
I0 B 0 "I0"    ← first command in list
I0 B 0 "I1"
I0 B 1 "S"
I0 B 1 "SI"
...
I0 A 3 "SM4"   ← final line, signals end of list
```

If you only read one line after sending `I0`, the remaining lines pile up in
the buffer and corrupt your next reads. Always drain all lines:

```python
def ask_multiline(ser, cmd):
    ser.reset_input_buffer()
    ser.write((cmd + '\r\n').encode())
    lines = []
    while True:
        line = ser.readline().decode('ascii', errors='replace').strip()
        if not line:
            break          # timeout
        lines.append(line)
        parts = line.split()
        if len(parts) >= 2 and parts[1] != 'B':
            break          # final line reached
    return lines
```

---

## This Scale's Supported Commands (JE1002G/A)

Discovered via `I0`. Commands grouped by MT-SICS level:

| Level | Commands |
|---|---|
| 0 (basic) | `I0 I1 I2 I3 I4 I5 S SI SIR Z @` |
| 1 | `D DW K SR T TA TAC` |
| 2 | `C0 C1 C3 DAT TIM PWR SIU SU SIRU SNRU SRU SNR ST M02–M92 I10 I11 I14 I26 I33 I51 I54 I55 E01 TST0–TST3 UPD` |
| 3 | `PW SM0 SM1 SM2 SM3 SM4` |

Higher level = more advanced configuration commands.

---

## Hardware Reference

| Item | Value |
|---|---|
| USB Adapter chip | FTDI UT232R (VID `0403`, PID `6001`) |
| Linux driver | `ftdi_sio` (loaded automatically) |
| Device file | `/dev/ttyUSB0` |
| Device owner | `root:dialout` |
| Scale model | Mettler Toledo JE1002G/A |
| Max capacity | 1200.90 g |
| Protocol | MT-SICS (all levels 0–3) |
