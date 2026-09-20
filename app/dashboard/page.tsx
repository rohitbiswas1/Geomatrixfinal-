'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  fetchDashboardSummary,
  fetchProjects,
  fetchAlerts,
  fetchModelStatus,
  DashboardSummary,
  ApiProject,
  ApiAlert,
  ModelStatus,
} from '../../lib/apiClient';

// ── helpers ──────────────────────────────────────────────────────────────────

function riskColor(level?: string) {
  switch ((level ?? '').toLowerCase()) {
    case 'critical': return 'var(--red)';
    case 'high':     return 'var(--orange)';
    case 'medium':   return 'var(--amber)';
    case 'low':      return 'var(--green)';
    default:         return 'var(--muted)';
  }
}

function riskBg(level?: string) {
  switch ((level ?? '').toLowerCase()) {
    case 'critical': return 'var(--red-bg)';
    case 'high':     return 'var(--orange-bg)';
    case 'medium':   return 'var(--amber-bg)';
    case 'low':      return 'var(--green-bg)';
    default:         return 'var(--line)';
  }
}

function riskTextColor(level?: string) {
  switch ((level ?? '').toLowerCase()) {
    case 'critical': return 'var(--red-text)';
    case 'high':     return 'var(--orange-text)';
    case 'medium':   return 'var(--amber-text)';
    case 'low':      return 'var(--green-text)';
    default:         return 'var(--muted)';
  }
}

function scoreColor(score?: number) {
  if (!score) return 'var(--muted)';
  if (score >= 75) return 'var(--red)';
  if (score >= 50) return 'var(--orange)';
  if (score >= 25) return 'var(--amber)';
  return 'var(--green)';
}

const PIPELINE_STAGES = [
  'Notification', 'Objection / Hearing', 'Compensation',
  'Award', 'Possession', 'Rehabilitation & Resettlement', 'Legal / Dispute',
];

// ── mini bar chart ────────────────────────────────────────────────────────────

function RiskBarChart({ critical, high, medium, low }: { critical: number; high: number; medium: number; low: number }) {
  const max = Math.max(critical, high, medium, low, 1);
  const bars = [
    { label: 'Critical', value: critical, color: 'var(--red)' },
    { label: 'High',     value: high,     color: 'var(--orange)' },
    { label: 'Medium',   value: medium,   color: 'var(--amber)' },
    { label: 'Low',      value: low,      color: 'var(--green)' },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 80, marginTop: 8 }}>
      {bars.map(b => (
        <div key={b.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: b.color }}>{b.value}</span>
          <div style={{
            width: '100%', height: Math.max(4, (b.value / max) * 60),
            background: b.color, borderRadius: 4, transition: 'height 0.6s ease',
          }} />
          <span style={{ fontSize: 10, color: 'var(--muted)' }}>{b.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── donut ring ────────────────────────────────────────────────────────────────

function RiskDonut({ critical, high, medium, low }: { critical: number; high: number; medium: number; low: number }) {
  const total = critical + high + medium + low || 1;
  const segments = [
    { value: critical, color: '#dc2626' },
    { value: high,     color: '#ea580c' },
    { value: medium,   color: '#b45309' },
    { value: low,      color: '#15803d' },
  ];
  let cum = 0;
  const r = 36, cx = 44, cy = 44, stroke = 14;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={88} height={88} viewBox="0 0 88 88">
      {segments.map((s, i) => {
        const pct = s.value / total;
        const dash = pct * circ;
        const offset = circ - cum * circ;
        cum += pct;
        return (
          <circle key={i} cx={cx} cy={cy} r={r}
            fill="none" stroke={s.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dasharray 0.6s ease', transform: 'rotate(-90deg)', transformOrigin: '44px 44px' }}
          />
        );
      })}
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize={14} fontWeight={700} fill="var(--ink)">{total}</text>
    </svg>
  );
}

// ── score ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r = 42, cx = 50, cy = 50;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = scoreColor(score);
  return (
    <svg width={100} height={100} viewBox="0 0 100 100">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--line)" strokeWidth={10} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeLinecap="round"
        style={{ transform: 'rotate(-90deg)', transformOrigin: '50px 50px', transition: 'stroke-dasharray 0.8s ease' }}
      />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize={18} fontWeight={800} fill={color}>{score.toFixed(0)}</text>
      <text x={cx} y={cy + 13} textAnchor="middle" fontSize={9} fill="var(--muted)">/100</text>
    </svg>
  );
}

// ── stage pipeline ────────────────────────────────────────────────────────────

function StageBar({ projects }: { projects: ApiProject[] }) {
  const counts: Record<string, number> = {};
  PIPELINE_STAGES.forEach(s => { counts[s] = 0; });
  projects.forEach(p => {
    const stage = p.current_stage ?? '';
    if (counts[stage] !== undefined) counts[stage]++;
  });
  const stageRisk: Record<string, string> = {
    'Notification': 'Low', 'Objection / Hearing': 'Medium', 'Compensation': 'Critical',
    'Award': 'Critical', 'Possession': 'High', 'Rehabilitation & Resettlement': 'High', 'Legal / Dispute': 'High',
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {PIPELINE_STAGES.map((stage, i) => {
        const cnt = counts[stage] ?? 0;
        const risk = stageRisk[stage] ?? 'Low';
        return (
          <div key={stage} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px', borderRadius: 8, background: 'var(--bg)',
            border: '1px solid var(--line)', transition: 'box-shadow 0.2s',
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: cnt > 0 ? riskColor(risk) : 'var(--line)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, flexShrink: 0,
            }}>{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{stage}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                {cnt > 0 ? `${cnt} project${cnt > 1 ? 's' : ''} in this stage` : 'No projects'}
              </div>
            </div>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
              background: riskBg(risk), color: riskTextColor(risk),
            }}>{risk}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── main ──────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [summary, setSummary]     = useState<DashboardSummary | null>(null);
  const [projects, setProjects]   = useState<ApiProject[]>([]);
  const [alerts, setAlerts]       = useState<ApiAlert[]>([]);
  const [modelSt, setModelSt]     = useState<ModelStatus | null>(null);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'pipeline' | 'alerts'>('overview');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, p, a, m] = await Promise.allSettled([
        fetchDashboardSummary(),
        fetchProjects({ limit: 50 }),
        fetchAlerts('Open', 20),
        fetchModelStatus(),
      ]);
      if (s.status === 'fulfilled') setSummary(s.value);
      if (p.status === 'fulfilled') setProjects(p.value);
      if (a.status === 'fulfilled') setAlerts(a.value);
      if (m.status === 'fulfilled') setModelSt(m.value);
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalProjects = summary?.total_projects ?? projects.length;
  const critical      = summary?.critical_count ?? 0;
  const high          = summary?.high_count ?? 0;
  const medium        = summary?.medium_count ?? 0;
  const low           = summary?.low_count ?? 0;
  const avgRisk       = summary?.avg_risk_score ?? null;
  const landHa        = summary?.total_land_ha ?? projects.reduce((a, p) => a + (p.land_required ?? 0), 0);
  const families      = summary?.total_families ?? projects.reduce((a, p) => a + (p.affected_families ?? 0), 0);
  const openAlerts    = summary?.alerts_open ?? alerts.length;

  const topRisk = [...projects]
    .sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0))
    .slice(0, 5);

  const TABS = [
    { id: 'overview' as const,  label: '📊 Portfolio Overview' },
    { id: 'pipeline' as const,  label: '🔄 Acquisition Pipeline' },
    { id: 'alerts'   as const,  label: `🚨 Alerts (${openAlerts})` },
  ];

  return (
    <div className="page" style={{ maxWidth: '100%', padding: '0 0 40px' }}>

      {/* ── top header ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0b1f3a 0%, #1e3a5f 100%)',
        padding: '28px 32px 24px',
        marginBottom: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
              🏛 GEOMATRIX · COMMAND CENTER
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.2 }}>
              Land Acquisition AI Command Center
            </h1>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: '#94a3b8' }}>
              Live portfolio intelligence · AI risk detection · Real-time pipeline monitoring
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#64748b', background: '#0f2a45', padding: '4px 10px', borderRadius: 6 }}>
              Refreshed {lastRefresh.toLocaleTimeString()}
            </span>
            <button onClick={load} disabled={loading} style={{
              background: '#1e3a5f', color: '#94a3b8', border: '1px solid #28425f',
              padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}>
              {loading ? '⟳ Loading…' : '⟳ Refresh'}
            </button>
            <Link href="/map" style={{
              background: '#1e3a5f', color: '#94a3b8', border: '1px solid #28425f',
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none',
            }}>🗺 GIS View</Link>
            <Link href="/reports" style={{
              background: 'var(--blue)', color: '#fff',
              padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none',
            }}>📄 Executive Report</Link>
          </div>
        </div>

        {/* ── hero risk score bar ── */}
        {!loading && totalProjects > 0 && (
          <div style={{
            marginTop: 24, background: 'rgba(255,255,255,0.05)',
            borderRadius: 14, padding: '20px 28px',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap',
          }}>
            {/* Donut */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <RiskDonut critical={critical} high={high} medium={medium} low={low} />
              <div>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Portfolio Projects</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>{totalProjects}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Monitored projects</div>
              </div>
            </div>

            <div style={{ width: 1, height: 60, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

            {/* Risk breakdown */}
            {[
              { label: 'Critical', val: critical, color: '#dc2626', bg: 'rgba(220,38,38,0.2)' },
              { label: 'High Risk', val: high,     color: '#ea580c', bg: 'rgba(234,88,12,0.2)' },
              { label: 'Medium',   val: medium,    color: '#b45309', bg: 'rgba(180,83,9,0.2)' },
              { label: 'Low Risk', val: low,       color: '#15803d', bg: 'rgba(21,128,61,0.2)' },
            ].map(r => (
              <div key={r.label} style={{
                textAlign: 'center', padding: '10px 20px', borderRadius: 10,
                background: r.bg, border: `1px solid ${r.color}40`,
              }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: r.color }}>{r.val}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{r.label}</div>
              </div>
            ))}

            <div style={{ width: 1, height: 60, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

            {/* Avg risk + model */}
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {avgRisk != null && (
                <div style={{ textAlign: 'center' }}>
                  <ScoreRing score={avgRisk} />
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Avg Risk Score</div>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>ML Model</div>
                <div style={{
                  fontSize: 12, fontWeight: 700,
                  color: modelSt?.trained ? '#22c55e' : '#94a3b8',
                  background: modelSt?.trained ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.1)',
                  padding: '4px 12px', borderRadius: 6,
                }}>
                  {modelSt?.trained ? `✓ ${modelSt.algorithm ?? 'Trained'}` : '○ Not trained'}
                </div>
                {modelSt?.roc_auc && (
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>ROC-AUC: {(modelSt.roc_auc * 100).toFixed(1)}%</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* empty state in header */}
        {!loading && totalProjects === 0 && (
          <div style={{
            marginTop: 20, background: 'rgba(255,255,255,0.04)',
            border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 12,
            padding: '24px 28px', color: '#64748b', fontSize: 14,
          }}>
            <strong style={{ color: '#94a3b8' }}>No project data yet.</strong>{' '}
            Go to{' '}
            <Link href="/data" style={{ color: 'var(--blue)', textDecoration: 'underline' }}>
              Data Management
            </Link>{' '}
            and upload a CSV to get started.
          </div>
        )}
      </div>

      {/* ── KPI strip ── */}
      {!loading && totalProjects > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 0, borderBottom: '1px solid var(--line)',
        }}>
          {[
            { icon: '🏗', label: 'Total Projects', value: totalProjects, note: 'Monitored', color: 'var(--blue)' },
            { icon: '⚠️', label: 'Open Alerts', value: openAlerts, note: 'Need action', color: 'var(--red)' },
            { icon: '🌾', label: 'Land Area', value: `${landHa.toFixed(0)} ha`, note: 'Total required', color: 'var(--amber)' },
            { icon: '👨‍👩‍👧‍👦', label: 'Families Affected', value: families.toLocaleString(), note: 'Under acquisition', color: 'var(--orange)' },
            { icon: '📍', label: 'Overdue Milestones', value: projects.reduce((a, p) => a + (p.overdue_milestones ?? 0), 0), note: 'Past deadline', color: 'var(--red)' },
            { icon: '⚖️', label: 'Legal Cases', value: projects.reduce((a, p) => a + (p.legal_case_count ?? 0), 0), note: 'Active disputes', color: 'var(--purple)' },
          ].map((k, i) => (
            <div key={i} style={{
              padding: '18px 20px', borderRight: '1px solid var(--line)',
              background: 'var(--surface)', transition: 'background 0.2s',
            }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{k.icon}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: k.color, margin: '4px 0 2px' }}>{k.value}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{k.note}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── tabs ── */}
      {!loading && totalProjects > 0 && (
        <div style={{ padding: '0 32px' }}>
          <div style={{
            display: 'flex', gap: 4, borderBottom: '2px solid var(--line)',
            marginTop: 28, marginBottom: 24,
          }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                padding: '10px 18px', border: 'none', cursor: 'pointer',
                borderRadius: '8px 8px 0 0', fontWeight: 600, fontSize: 13,
                background: activeTab === t.id ? 'var(--blue)' : 'transparent',
                color: activeTab === t.id ? '#fff' : 'var(--muted)',
                borderBottom: activeTab === t.id ? '2px solid var(--blue)' : '2px solid transparent',
                transition: 'all 0.15s',
              }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── OVERVIEW TAB ── */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

              {/* Top at-risk projects */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>🔴 Top At-Risk Projects</div>
                  <Link href="/projects" style={{ fontSize: 12, color: 'var(--blue)', textDecoration: 'none', fontWeight: 600 }}>
                    View all →
                  </Link>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {topRisk.length === 0 ? (
                    <div style={{ color: 'var(--muted)', fontSize: 13, padding: '12px 0' }}>
                      Run predictions on projects to see risk scores
                    </div>
                  ) : topRisk.map((p, i) => (
                    <Link key={p.id} href={`/projects/${p.id}`} style={{ textDecoration: 'none' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                        borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--line)',
                        transition: 'border-color 0.2s',
                      }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                          background: riskBg(p.risk_level),
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 800, color: riskColor(p.risk_level),
                        }}>#{i + 1}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {p.name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.state} · {p.authority}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 800, color: scoreColor(p.risk_score) }}>
                            {p.risk_score?.toFixed(1) ?? '—'}
                          </div>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                            background: riskBg(p.risk_level), color: riskTextColor(p.risk_level),
                          }}>{p.risk_level ?? 'Unknown'}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Risk bar chart */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: 4 }}>
                  📈 Risk Distribution
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                  Comparative risk by category across portfolio
                </div>
                <RiskBarChart critical={critical} high={high} medium={medium} low={low} />
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Critical', val: critical, color: 'var(--red)', bg: 'var(--red-bg)' },
                    { label: 'High', val: high, color: 'var(--orange)', bg: 'var(--orange-bg)' },
                    { label: 'Medium', val: medium, color: 'var(--amber)', bg: 'var(--amber-bg)' },
                    { label: 'Low', val: low, color: 'var(--green)', bg: 'var(--green-bg)' },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: r.color, flexShrink: 0 }} />
                      <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--line)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 3, background: r.color,
                          width: `${totalProjects > 0 ? (r.val / totalProjects) * 100 : 0}%`,
                          transition: 'width 0.6s ease',
                        }} />
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: r.color, width: 20, textAlign: 'right' }}>{r.val}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', width: 50 }}>{r.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Model intelligence panel */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: 16 }}>
                  🤖 AI Model Intelligence
                </div>
                {modelSt ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '12px 16px', borderRadius: 10,
                      background: modelSt.trained ? 'var(--green-bg)' : 'var(--red-bg)',
                      border: `1px solid ${modelSt.trained ? 'var(--green)' : 'var(--red)'}30`,
                    }}>
                      <span style={{ fontSize: 22 }}>{modelSt.trained ? '✅' : '❌'}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: modelSt.trained ? 'var(--green-text)' : 'var(--red-text)' }}>
                          {modelSt.trained ? 'Model Trained & Active' : 'Model Not Trained'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{modelSt.algorithm ?? 'RandomForest'}</div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {[
                        { label: 'Precision', val: modelSt.precision, icon: '🎯' },
                        { label: 'Recall', val: modelSt.recall, icon: '📡' },
                        { label: 'F1 Score', val: modelSt.f1_score, icon: '⚖️' },
                        { label: 'ROC-AUC', val: modelSt.roc_auc, icon: '📈' },
                      ].map(m => (
                        <div key={m.label} style={{
                          padding: '10px 14px', borderRadius: 8, background: 'var(--bg)',
                          border: '1px solid var(--line)',
                        }}>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{m.icon} {m.label}</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', marginTop: 2 }}>
                            {m.val != null ? `${(m.val * 100).toFixed(1)}%` : '—'}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <Link href="/model" style={{
                        flex: 1, textAlign: 'center', textDecoration: 'none',
                        background: 'var(--blue)', color: '#fff',
                        padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                      }}>
                        🔬 Model Intelligence →
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: 'var(--muted)', fontSize: 13 }}>Loading model status…</div>
                )}
              </div>

              {/* All projects table */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>📋 Recent Projects</div>
                  <Link href="/projects" style={{ fontSize: 12, color: 'var(--blue)', textDecoration: 'none', fontWeight: 600 }}>
                    View all {totalProjects} →
                  </Link>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 340, overflowY: 'auto' }}>
                  {projects.slice(0, 8).map(p => (
                    <Link key={p.id} href={`/projects/${p.id}`} style={{ textDecoration: 'none' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                        borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg)',
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {p.name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.state} · {p.project_code}</div>
                        </div>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99, flexShrink: 0,
                          background: riskBg(p.risk_level), color: riskTextColor(p.risk_level),
                        }}>
                          {p.risk_level ?? 'Pending'}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── PIPELINE TAB ── */}
          {activeTab === 'pipeline' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: 6 }}>
                  🔄 Acquisition Stage Pipeline
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
                  Current stage distribution across all projects
                </div>
                <StageBar projects={projects} />
              </div>

              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: 16 }}>
                  📊 Stage Risk Analysis
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {PIPELINE_STAGES.map(stage => {
                    const stageRisk: Record<string, { risk: string; color: string; pct: number }> = {
                      'Notification':                { risk: 'Low',      color: 'var(--green)',  pct: 15  },
                      'Objection / Hearing':          { risk: 'Medium',   color: 'var(--amber)',  pct: 50  },
                      'Compensation':                 { risk: 'Critical', color: 'var(--red)',    pct: 80  },
                      'Award':                        { risk: 'Critical', color: 'var(--red)',    pct: 90  },
                      'Possession':                   { risk: 'High',     color: 'var(--orange)', pct: 65  },
                      'Rehabilitation & Resettlement':{ risk: 'High',     color: 'var(--orange)', pct: 60  },
                      'Legal / Dispute':              { risk: 'High',     color: 'var(--orange)', pct: 70  },
                    };
                    const info = stageRisk[stage] ?? { risk: 'Low', color: 'var(--green)', pct: 10 };
                    return (
                      <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ fontSize: 12, color: 'var(--ink)', width: 180, flexShrink: 0 }}>{stage}</div>
                        <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--line)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 4, background: info.color,
                            width: `${info.pct}%`, transition: 'width 0.6s ease',
                          }} />
                        </div>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, flexShrink: 0,
                          background: riskBg(info.risk), color: riskTextColor(info.risk),
                        }}>{info.risk}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── ALERTS TAB ── */}
          {activeTab === 'alerts' && (
            <div>
              {alerts.length === 0 ? (
                <div style={{
                  background: 'var(--green-bg)', border: '1px solid var(--green)', borderRadius: 12,
                  padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 16,
                }}>
                  <span style={{ fontSize: 32 }}>✅</span>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--green-text)', fontSize: 15 }}>No Open Alerts</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                      All projects are within acceptable risk thresholds.
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {alerts.map(a => (
                    <div key={a.id} style={{
                      display: 'flex', gap: 16, padding: '16px 20px', borderRadius: 12,
                      background: 'var(--surface)', border: `1px solid ${a.severity === 'Critical' ? 'var(--red)' : 'var(--line)'}40`,
                      borderLeft: `4px solid ${riskColor(a.severity)}`,
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                            background: riskBg(a.severity), color: riskTextColor(a.severity),
                          }}>{a.severity}</span>
                          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                            {new Date(a.detected_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', marginBottom: 4 }}>
                          {a.project_name ?? 'Unknown Project'}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--muted)' }}>{a.reason}</div>
                        {a.recommended_action && (
                          <div style={{ fontSize: 12, color: 'var(--blue)', marginTop: 8, fontWeight: 600 }}>
                            → {a.recommended_action}
                          </div>
                        )}
                      </div>
                      <div style={{ flexShrink: 0, alignSelf: 'flex-start' }}>
                        <Link href={`/projects/${a.project_id}`} style={{
                          background: 'var(--blue)', color: '#fff', textDecoration: 'none',
                          padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                        }}>View →</Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* loading spinner */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            border: '4px solid var(--line)', borderTopColor: 'var(--blue)',
            animation: 'spin 0.8s linear infinite',
          }} />
          <div style={{ color: 'var(--muted)', fontSize: 14 }}>Loading live portfolio data…</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  );
}
