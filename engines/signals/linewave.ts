// Signal calculator: compute amplitude, frequency, jaggedness for "electric" linewave rendering.
import type { EdgeSignals } from "../../schema/types";

export interface WaveParams {
  amplitude: number;
  frequency: number;
  jaggedness: number; // 0..1, higher = more "broken" / sharp
}

// Baseline constants (tune these for aesthetic control)
const A0 = 2; // minimal amplitude when quiet
const A1 = 12; // amplitude gain from load
const A2 = 8; // amplitude gain from errors
const F0 = 0.5; // baseline frequency
const F1 = 1.5; // frequency gain from load

export function computeWaveParams(signals?: EdgeSignals): WaveParams {
  if (!signals) {
    return { amplitude: A0, frequency: F0, jaggedness: 0 };
  }

  const load = signals.load ?? 0;
  const error = signals.error_rate ?? 0;

  const amplitude = A0 + A1 * load + A2 * Math.min(error * 2, 1);
  const frequency = F0 + F1 * load;

  // Jaggedness kicks in when load > 0.6 (smoothstep for gradual transition)
  const jaggedness = smoothstep(0.6, 1.0, load);

  return { amplitude, frequency, jaggedness };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
