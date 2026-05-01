import { getLastSnapshot } from "../memory/db";
import { generateOverview, formatOverview, OverviewData } from "../engines/overview/overview";

export interface OverviewRegistration {
  healthy: boolean;
  getOverview: () => OverviewData;
  format: () => string;
}

export function registerOverview(): OverviewRegistration {
  const snapshot = getLastSnapshot();
  if (!snapshot) {
    throw new Error("No snapshot available. Run `cwy scan` before overview registration.");
  }

  const getOverview = (): OverviewData => generateOverview(snapshot);

  return {
    healthy: true,
    getOverview,
    format: () => formatOverview(getOverview()),
  };
}
