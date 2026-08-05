/**
 * Web Bluetooth heart-rate client (Phase 1 of WEARABLES.md).
 *
 * Speaks the standard BLE Heart Rate service (0x180D / measurement 0x2A37) —
 * chest straps and most sport watches in broadcast mode. Chrome on Android and
 * desktop only; feature-detect with `hrSupported()` and simply don't render the
 * button elsewhere (iOS Safari has no Web Bluetooth).
 */

// Minimal structural type — the DOM lib has no Web Bluetooth defs by default
// and pulling @types/web-bluetooth in for one file isn't worth it.
type BleDevice = {
  gatt?: { connect: () => Promise<any>; disconnect: () => void };
  addEventListener: (ev: string, cb: () => void) => void;
};

export type HrHandle = {
  device: BleDevice;
  stop: () => void;
};

export function hrSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

/** Flags bit 0 decides 8- vs 16-bit heart-rate value. */
function parseHeartRate(value: DataView): number {
  const flags = value.getUint8(0);
  return flags & 0x1 ? value.getUint16(1, true) : value.getUint8(1);
}

export async function connectHr(
  onReading: (bpm: number) => void,
  onDisconnect: () => void,
): Promise<HrHandle> {
  const device: BleDevice = await (navigator as any).bluetooth.requestDevice({
    filters: [{ services: ['heart_rate'] }],
    optionalServices: ['battery_service'],
  });

  const subscribe = async () => {
    const server = await device.gatt!.connect();
    const service = await server.getPrimaryService('heart_rate');
    const characteristic = await service.getCharacteristic('heart_rate_measurement');
    await characteristic.startNotifications();
    characteristic.addEventListener('characteristicvaluechanged', (e: Event) => {
      const dv = (e.target as any).value as DataView;
      const bpm = parseHeartRate(dv);
      if (bpm > 25 && bpm < 250) onReading(bpm);
    });
  };

  let intentional = false;
  device.addEventListener('gattserverdisconnected', () => {
    if (intentional) return onDisconnect();
    // One quiet reconnect attempt — straps drop briefly when the screen locks.
    subscribe().catch(() => onDisconnect());
  });

  await subscribe();

  return {
    device,
    stop: () => {
      intentional = true;
      try { device.gatt?.disconnect(); } catch { /* already gone */ }
    },
  };
}

/** Zone 1–5 from an age-estimated HRmax (220 − age). */
export function hrZone(bpm: number, birthYear?: number | null): { zone: number; pct: number } {
  const age = birthYear ? new Date().getFullYear() - birthYear : 30;
  const max = 220 - Math.min(Math.max(age, 10), 90);
  const pct = Math.min(bpm / max, 1.05);
  const zone = pct < 0.6 ? 1 : pct < 0.7 ? 2 : pct < 0.8 ? 3 : pct < 0.9 ? 4 : 5;
  return { zone, pct };
}

export const ZONE_COLORS = ['#94a3b8', '#38bdf8', '#22c55e', '#f59e0b', '#f97316', '#ef4444'];
