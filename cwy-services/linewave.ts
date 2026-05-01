import { computeWaveParams, WaveParams } from "../engines/signals/linewave";
import type { EdgeSignals } from "../schema/types";

export interface LinewaveRegistration {
  healthy: boolean;
  compute: (signals?: EdgeSignals) => WaveParams;
  profile: (load: number, errorRate: number) => WaveParams;
}

export function registerLinewave(): LinewaveRegistration {
  return {
    healthy: true,
    compute: (signals?: EdgeSignals) => computeWaveParams(signals),
    profile: (load: number, errorRate: number) =>
      computeWaveParams({ load, error_rate: errorRate }),
  };
}
