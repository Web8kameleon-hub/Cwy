// Project Size Score Calculator
// Formula: log2(M+1) + log2(R+1) + D + (C*0.5) + log2(H+1) + (A*0.7)
// M = modules, R = routes, D = depth, C = cycles+conflicts, H = history days, A = agents

export interface ProjectMetrics {
  modules: number;       // M
  routes: number;        // R
  depth: number;         // D (average graph depth)
  cycles: number;        // part of C
  conflicts: number;     // part of C
  historyDays: number;   // H
  agents: number;        // A (future)
}

export interface ScoreResult {
  score: number;
  category: "Small" | "Growing" | "Substantial" | "Large" | "System-scale";
  suggestedContribution: number; // in €
}

/**
 * Calculate the ProjectScore based on metrics.
 */
export function calculateProjectScore(metrics: ProjectMetrics): number {
  const { modules, routes, depth, cycles, conflicts, historyDays, agents } = metrics;

  const M = Math.log2(modules + 1);
  const R = Math.log2(routes + 1);
  const D = depth;
  const C = (cycles + conflicts) * 0.5;
  const H = Math.log2(historyDays + 1);
  const A = agents * 0.7;

  return M + R + D + C + H + A;
}

/**
 * Map score to human-readable category.
 */
export function scoreToCategory(
  score: number
): "Small" | "Growing" | "Substantial" | "Large" | "System-scale" {
  if (score < 10) return "Small";
  if (score < 20) return "Growing";
  if (score < 35) return "Substantial";
  if (score < 55) return "Large";
  return "System-scale";
}

/**
 * Calculate suggested contribution based on score.
 * Formula: round(log(score+1) * 2)
 */
export function suggestedContribution(score: number): number {
  return Math.round(Math.log(score + 1) * 2);
}

/**
 * Full score calculation with category and suggestion.
 */
export function evaluateProject(metrics: ProjectMetrics): ScoreResult {
  const score = calculateProjectScore(metrics);
  const category = scoreToCategory(score);
  const suggestedContribution_ = suggestedContribution(score);

  return { score, category, suggestedContribution: suggestedContribution_ };
}
