// ─────────────────────────────────────────────────────────────────────────────
// Geomatrix SIH 2026 · lib/data.ts
// Enriched data model with risk history, transitions, audit trail, SHAP data,
// what-if simulator presets, prediction vs actual, and data lineage.
// ─────────────────────────────────────────────────────────────────────────────

export type RiskLevel = 'Critical' | 'High' | 'Medium' | 'Low';
export type RiskTrend = 'rising' | 'stable' | 'falling';

export interface RiskHistoryPoint {
  week: string;   // e.g. "W1", "W2"
  date: string;   // human-readable
  score: number;
  level: RiskLevel;
}

export interface RiskTransition {
  date: string;
  from: RiskLevel;
  to: RiskLevel;
  reason: string;
  trigger: string;
}

export interface AuditEvent {
  date: string;
  action: string;
  user: string;
  role: string;
  outcome: string;
  status: 'completed' | 'pending' | 'in-progress';
}

export interface PredictionVsActual {
  stage: string;
  predictedDelay: number;
  actualDelay: number;
  accuracy: number; // %
  date: string;
}

export interface SimilarProject {
  name: string;
  state: string;
  riskScore: number;
  outcome: string;
  interventionUsed: string;
  delayAvoided: number; // days
}

export interface SimulatorPreset {
  pendingClaims: number;
  legalCases: number;
  docCompleteness: number; // 0-100%
  approvalPending: boolean;
  rrPending: number;
}

export interface DataLineage {
  source: string;
  lastUpdated: string;
  recordsUsed: number;
  featuresUsed: string[];
  missingFields: number;
  dataQualityScore: number; // 0-100
  confidenceImpact: string; // e.g. "High confidence — 98.4% completeness"
}

export interface Project {
  id: string;
  projectCode: string;
  name: string;
  state: string;
  district: string;
  authority: string;
  projectType: string;
  lat: number;
  lng: number;
  stage: string;
  risk: number;
  previousRisk: number;        // ← NEW: risk 30 days ago
  riskTrend: RiskTrend;        // ← NEW
  delay: number;
  delayDays: number;
  expectedDelayMin: number;    // ← NEW: e.g. 34
  expectedDelayMax: number;    // ← NEW: e.g. 52
  predictionHorizon: string;   // ← NEW: "30-day"
  confidence: number;
  driver: string;
  land: number;
  families: number;
  overdue: number;
  compensation: boolean;
  legal: number;
  docs: number;
  approval: boolean;
  status: string;
  riskHistory: RiskHistoryPoint[];          // ← NEW
  riskTransitions: RiskTransition[];        // ← NEW
  auditTrail: AuditEvent[];                 // ← NEW
  predictionVsActual: PredictionVsActual[]; // ← NEW
  similarProjects: SimilarProject[];        // ← NEW
  simulatorBaseline: SimulatorPreset;       // ← NEW
  dataLineage: DataLineage;                 // ← NEW
}

// ─── Helper functions ─────────────────────────────────────────────────────────

export function riskLevel(r: number): RiskLevel {
  return r >= 75 ? 'Critical' : r >= 50 ? 'High' : r >= 25 ? 'Medium' : 'Low';
}

export function calcRisk(p: Pick<Project, 'overdue' | 'approval' | 'compensation' | 'legal' | 'docs' | 'families' | 'land' | 'risk'>) {
  const score = Math.min(100, Math.round(
    20 + p.overdue * 1.2 + (p.approval ? 9 : 0) + (p.compensation ? 18 : 0) +
    p.legal * 1.5 + p.docs * 0.45 + Math.min(10, p.families / 30) + Math.min(8, p.land / 100)
  ));
  const delay = Math.min(0.98, Math.max(0.08, score / 100 * 0.92));
  return { riskScore: score, delayProbability: delay, predictedDelayDays: Math.round(score * 0.62), riskLevel: riskLevel(score) };
}

// SHAP-style feature contributions
export function explain(p: Project) {
  const total = (p.compensation ? 18.4 : 0) + p.legal * 2.02 + p.docs * 0.62 +
    (p.approval ? 9.3 : 0) + Math.min(7.1, p.families / 26) + Math.min(5.6, p.overdue * 0.21);
  return [
    { feature: 'Compensation Backlog', value: p.compensation, contribution: p.compensation ? 18.4 : -2.1, pct: p.compensation ? Math.round(18.4 / total * 100) : 0, direction: p.compensation ? 'up' : 'down' as const },
    { feature: 'Legal Disputes', value: p.legal, contribution: p.legal * 2.02, pct: Math.round(p.legal * 2.02 / total * 100), direction: 'up' as const },
    { feature: 'Documentation Gap', value: p.docs, contribution: p.docs * 0.62, pct: Math.round(p.docs * 0.62 / total * 100), direction: 'up' as const },
    { feature: 'Approval Pending', value: p.approval, contribution: p.approval ? 9.3 : -1.4, pct: p.approval ? Math.round(9.3 / total * 100) : 0, direction: p.approval ? 'up' : 'down' as const },
    { feature: 'Affected Families', value: p.families, contribution: Math.min(7.1, p.families / 26), pct: Math.round(Math.min(7.1, p.families / 26) / total * 100), direction: 'up' as const },
    { feature: 'Overdue Milestones', value: p.overdue, contribution: Math.min(5.6, p.overdue * 0.21), pct: Math.round(Math.min(5.6, p.overdue * 0.21) / total * 100), direction: 'up' as const },
    { feature: 'R&R Backlog', value: p.families > 150 ? 'High' : 'Low', contribution: p.families > 150 ? 4.2 : 1.1, pct: p.families > 150 ? 8 : 2, direction: 'up' as const },
    { feature: 'Land Area Complexity', value: p.land, contribution: Math.min(4.0, p.land / 120), pct: Math.round(Math.min(4.0, p.land / 120) / total * 100), direction: 'up' as const },
  ].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
}

// What-if simulation engine
export function simulate(baseline: SimulatorPreset, changes: Partial<SimulatorPreset>): number {
  const s = { ...baseline, ...changes };
  const score = Math.min(100, Math.round(
    20 + s.pendingClaims * 1.1 + s.legalCases * 1.5 +
    (100 - s.docCompleteness) * 0.45 + (s.approvalPending ? 9 : 0) + s.rrPending * 0.8
  ));
  return Math.max(5, Math.min(98, score));
}

export const stages = [
  'Notification', 'Objection / Hearing', 'Compensation', 'Award',
  'Possession', 'Rehabilitation & Resettlement', 'Legal / Dispute'
];

// ─── Common audit/history builders ───────────────────────────────────────────

function makeHistory(currentRisk: number, trend: RiskTrend): RiskHistoryPoint[] {
  const weeks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'];
  const dates = ['23 Jul', '30 Jul', '06 Aug', '13 Aug', '20 Aug', '07 Sep'];
  return weeks.map((week, i) => {
    let score: number;
    if (trend === 'rising') score = Math.max(20, currentRisk - (5 - i) * 6 + (i % 2) * 3);
    else if (trend === 'falling') score = Math.min(98, currentRisk + (5 - i) * 5 - (i % 2) * 2);
    else score = currentRisk + (i % 2 === 0 ? 2 : -2);
    score = Math.round(Math.max(5, Math.min(98, score)));
    return { week, date: dates[i], score, level: riskLevel(score) };
  });
}

// ─── Production safety: synthetic/demo datasets are intentionally disabled. ───

export const projects: Project[] = [];
export type AlertRow = {
  id: string;
  severity: 'Critical' | 'High' | 'Medium';
  project: string;
  projectId: string;
  reason: string;
  riskDelta: string;
  riskChange: number;
  expectedImpact: string;
  cause: string;
  detected: string;
  action: string;
  status: string;
  assignedTo: string;
  dueDate: string;
  outcome: string;
};
export const alerts: AlertRow[] = []; 
