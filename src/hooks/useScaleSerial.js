import { useState, useRef, useCallback, useEffect } from 'react';
import { parseMtSics } from '../utils/parseMtSics';

export function useScaleSerial() {
  const [connected, setConnected] = useState(false);
  const [reading, setReading] = useState(null);
  const [rawLines, setRawLines] = useState([]);
  const [error, setError] = useState(null);

  const portRef = useRef(null);
  const readerRef = useRef(null);
  const writerRef = useRef(null);
  const bufferRef = useRef('');
  const gotDataRef = useRef(false);
  const pollTimerRef = useRef(null);

  const sendCmd = useCallback(async (cmd) => {
    if (!writerRef.current) return;
    try {
      await writerRef.current.write(new TextEncoder().encode(cmd + '\r\n'));
    } catch (_) {}
  }, []);

  const disconnect = useCallback(async () => {
    clearInterval(pollTimerRef.current);
    pollTimerRef.current = null;
    try { await writerRef.current?.write(new TextEncoder().encode('@\r\n')); } catch (_) {}
    try { writerRef.current?.releaseLock(); writerRef.current = null; } catch (_) {}
    try { await readerRef.current?.cancel(); } catch (_) {}
    await new Promise(r => setTimeout(r, 100));
    try { await portRef.current?.close(); portRef.current = null; } catch (_) {}
    setConnected(false);
    setReading(null);
    gotDataRef.current = false;
  }, []);

  // Core open-and-stream logic shared by both connect paths
  const openPort = useCallback(async (port, baudRate = 9600) => {
    if (portRef.current) await disconnect();
    try {
      await port.open({ baudRate, dataBits: 8, stopBits: 1, parity: 'none', flowControl: 'none' });
    } catch (openErr) {
      if (openErr.message?.includes('already open')) {
        setError('Port is stuck open — close all Chrome windows and reopen.');
      } else {
        setError(openErr.message);
      }
      return;
    }
    portRef.current = port;

    const writer = port.writable.getWriter();
    writerRef.current = writer;
    bufferRef.current = '';
    gotDataRef.current = false;
    setConnected(true);

    await writer.write(new TextEncoder().encode('SIR\r\n'));

    pollTimerRef.current = setTimeout(() => {
      if (gotDataRef.current) return;
      pollTimerRef.current = setInterval(async () => {
        if (!portRef.current) { clearInterval(pollTimerRef.current); return; }
        try { await writer.write(new TextEncoder().encode('SI\r\n')); } catch (_) {}
      }, 500);
    }, 2000);

    const reader = port.readable.getReader();
    readerRef.current = reader;
    const decoder = new TextDecoder();

    (async () => {
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          bufferRef.current += chunk.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
          let idx;
          while ((idx = bufferRef.current.indexOf('\n')) !== -1) {
            const raw = bufferRef.current.slice(0, idx);
            bufferRef.current = bufferRef.current.slice(idx + 1);
            if (!raw.trim()) continue;
            gotDataRef.current = true;
            setRawLines(prev => [...prev.slice(-199), raw]);
            const parsed = parseMtSics(raw);
            if (parsed?.value != null) setReading(parsed);
          }
        }
      } catch (_) {
        // port closed or reader cancelled — expected on disconnect
      } finally {
        try { reader.releaseLock(); } catch (_) {}
        setConnected(false);
        setReading(null);
      }
    })();
  }, [disconnect]);

  // Manual connect: shows browser port-picker dialog (requires user gesture)
  const connect = useCallback(async () => {
    if (!navigator.serial) {
      setError('WebSerial not supported. Use Chrome or Edge on desktop.');
      return;
    }
    setError(null);
    try {
      const port = await navigator.serial.requestPort();
      await openPort(port);
    } catch (err) {
      if (err.name !== 'NotFoundError') setError(err.message);
    }
  }, [openPort]);

  // On mount: auto-connect if the user already granted access in a previous session
  useEffect(() => {
    if (!navigator.serial) return;
    navigator.serial.getPorts().then(async (ports) => {
      if (ports.length === 1) {
        await openPort(ports[0]);
      }
    }).catch(() => {});
  }, [openPort]);

  const tare = useCallback(() => sendCmd('T'), [sendCmd]);
  const zero = useCallback(() => sendCmd('Z'), [sendCmd]);

  return { connected, reading, rawLines, error, connect, disconnect, tare, zero };
}
