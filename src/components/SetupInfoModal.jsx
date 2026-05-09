import { useState } from 'react';

const TABS = ['Linux', 'macOS', 'Windows'];

const CONTENT = {
  Linux: [
    {
      heading: 'Browser',
      body: 'Use Chrome or Edge (v89+). Firefox does not support WebSerial.',
    },
    {
      heading: 'FTDI driver',
      body: 'The FTDI UT232R driver (ftdi_sio) ships with every modern Linux kernel — no manual install needed. Plug in the USB adapter and the device appears as /dev/ttyUSB0 (or ttyUSB1 if another adapter is already connected).',
    },
    {
      heading: 'Serial port permission',
      body: 'By default only root can open serial ports. Add your user to the dialout group, then log out and back in:',
      code: 'sudo usermod -a -G dialout $USER',
    },
    {
      heading: 'Verify the device',
      body: 'After plugging in the adapter:',
      code: 'ls /dev/ttyUSB*',
    },
    {
      heading: 'Secure context',
      body: 'WebSerial requires HTTPS or localhost. The Vite dev server (npm run dev → http://localhost:5173) counts as secure — no HTTPS setup needed for local use.',
    },
  ],
  macOS: [
    {
      heading: 'Browser',
      body: 'Use Chrome or Edge (v89+). Safari does not support WebSerial.',
    },
    {
      heading: 'FTDI driver',
      body: 'macOS 10.9+ includes a built-in FTDI VCP (Virtual COM Port) driver. Most users need nothing extra. If the port does not appear after plugging in:',
      sub: [
        'Download the macOS VCP driver from ftdichip.com → Drivers → VCP Drivers.',
        'Run the installer package (.dmg), then open System Settings → Privacy & Security and approve the extension.',
        'Reboot once after approving.',
      ],
    },
    {
      heading: 'Verify the device',
      body: 'After plugging in, the adapter appears as:',
      code: 'ls /dev/tty.usbserial-*',
    },
    {
      heading: 'Apple Silicon (M1/M2/M3)',
      body: 'No extra steps. The built-in kernel extension is universal and works on ARM Macs out of the box.',
    },
    {
      heading: 'Secure context',
      body: 'Run the app from localhost (npm run dev) or any HTTPS origin. Chrome on macOS enforces the secure-context requirement strictly.',
    },
  ],
  Windows: [
    {
      heading: 'Browser',
      body: 'Use Chrome or Edge (v89+). Internet Explorer and Firefox do not support WebSerial.',
    },
    {
      heading: 'FTDI VCP driver',
      body: 'Windows 10/11 will often install the FTDI driver automatically via Windows Update when you plug in the adapter. If it does not:',
      sub: [
        'Go to ftdichip.com → Drivers → VCP Drivers and download the Windows setup executable.',
        'Run the installer, then unplug and re-plug the USB adapter.',
        'Open Device Manager (Win + X → Device Manager) and look under Ports (COM & LPT) — you should see "USB Serial Port (COMx)".',
      ],
    },
    {
      heading: 'Note the COM port',
      body: 'Chrome will list available ports by their COM number (e.g. COM3). Check Device Manager if you are unsure which port the adapter is on.',
    },
    {
      heading: 'Windows Defender / antivirus',
      body: 'Some corporate antivirus tools block unsigned drivers. If the adapter shows as "Unknown Device" in Device Manager after installing, try running the FTDI installer as Administrator or temporarily disabling real-time protection.',
    },
    {
      heading: 'Secure context',
      body: 'Run the app from localhost or HTTPS. Edge and Chrome on Windows both enforce the secure-context rule for WebSerial.',
    },
  ],
};

export default function SetupInfoModal() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('Linux');

  return (
    <>
      <button
        className="btn btn-ghost btn-sm info-btn"
        onClick={() => setOpen(true)}
        title="Setup instructions"
        aria-label="Setup instructions"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 1.25a5.75 5.75 0 1 1 0 11.5A5.75 5.75 0 0 1 8 2.25zM8 5a.875.875 0 1 0 0 1.75A.875.875 0 0 0 8 5zm-.625 2.75a.625.625 0 1 0 0 1.25h.25v2.25h-.25a.625.625 0 1 0 0 1.25h1.75a.625.625 0 1 0 0-1.25H8.75V7.375A.625.625 0 0 0 8.125 6.75h-.75z"/>
        </svg>
      </button>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Setup instructions" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Setup Instructions</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)} aria-label="Close">✕</button>
            </div>

            <div className="modal-tabs">
              {TABS.map(t => (
                <button
                  key={t}
                  className={`modal-tab${tab === t ? ' modal-tab--active' : ''}`}
                  onClick={() => setTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="modal-body">
              {CONTENT[tab].map((section, i) => (
                <div key={i} className="setup-section">
                  <h3 className="setup-heading">{section.heading}</h3>
                  <p className="setup-body">{section.body}</p>
                  {section.code && <pre className="setup-code">{section.code}</pre>}
                  {section.sub && (
                    <ol className="setup-list">
                      {section.sub.map((item, j) => <li key={j}>{item}</li>)}
                    </ol>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
