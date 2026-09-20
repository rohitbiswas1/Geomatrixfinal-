'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { fetchAlerts } from '../../lib/apiClient';
import { Bell, CheckCircle2, AlertTriangle, AlertCircle, Filter, RotateCcw, ArrowUpRight, User, TrendingUp } from 'lucide-react';

type AlertRow = {
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

export default function AlertsPage() {
  const [rows, setRows] = useState<AlertRow[]>([]);
  const [severityFilter, setSeverityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selected, setSelected] = useState<AlertRow | null>(null);

  useEffect(() => {
    async function loadAlerts() {
      try {
        const apiAlerts = await fetchAlerts('All', 100);
        const mapped: AlertRow[] = (apiAlerts ?? []).map(a => ({
          id: a.id,
          severity: (a.severity as any) || 'Medium',
          project: a.project_name || a.project_id,
          projectId: a.project_id,
          reason: a.reason,
          riskDelta: '+0% shift',
          riskChange: 0,
          expectedImpact: 'No forecast available',
          cause: a.reason,
          detected: new Date(a.detected_at).toLocaleDateString('en-IN'),
          action: a.recommended_action || 'Review intervention queue',
          status: a.status || 'Open',
          assignedTo: '',
          dueDate: '',
          outcome: '',
        }));
        setRows(mapped);
      } catch {
        setRows([]);
      }
    }
    loadAlerts();
  }, []);
  const [assignModal, setAssignModal] = useState<AlertRow | null>(null);
  const [assignToField, setAssignToField] = useState('');
  const [dueDateField, setDueDateField] = useState('');
  const [toast, setToast] = useState('');

  function update(id: string, changes: Partial<AlertRow>) {
    setRows(prev => prev.map(a => a.id === id ? { ...a, ...changes } : a));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, ...changes } : prev);
  }

  function bulkUpdate(status: string) {
    setRows(prev => prev.map(a =>
      (severityFilter === 'All' || a.severity === severityFilter) ? { ...a, status } : a
    ));
    showToast(`All ${severityFilter === 'All' ? '' : severityFilter + ' '}alerts marked as ${status}`);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  function doAssign() {
    if (!assignModal) return;
    update(assignModal.id, { assignedTo: assignToField, dueDate: dueDateField, status: 'Acknowledged' });
    showToast(`Alert assigned to ${assignToField}`);
    setAssignModal(null);
  }

  const filtered = useMemo(() => rows.filter(a => {
    const matchSev = severityFilter === 'All' || a.severity === severityFilter;
    const matchStatus = statusFilter === 'All' || a.status === statusFilter;
    return matchSev && matchStatus;
  }), [rows, severityFilter, statusFilter]);

  const counts = useMemo(() => ({
    critical: rows.filter(a => a.severity === 'Critical').length,
    high: rows.filter(a => a.severity === 'High').length,
    medium: rows.filter(a => a.severity === 'Medium').length,
    open: rows.filter(a => a.status === 'Open').length,
    ack: rows.filter(a => a.status === 'Acknowledged').length,
    resolved: rows.filter(a => a.status === 'Resolved').length,
  }), [rows]);

  const sevIcon = (s: string) =>
    s === 'Critical' ? <AlertTriangle size={13} /> :
      s === 'High' ? <AlertCircle size={13} /> :
        <Bell size={13} />;

  const statusColor = (s: string) =>
    s === 'Open' ? { bg: 'var(--red-bg)', color: 'var(--red-text)' } :
      s === 'Acknowledged' ? { bg: 'var(--amber-bg)', color: 'var(--amber-text)' } :
        { bg: 'var(--green-bg)', color: 'var(--green-text)' };

  const projectId = (a: AlertRow): string =>
    'projectId' in a ? (a as { projectId: string }).projectId : 'p1';

  return (
    <div className="page">
      <div className="head">
        <div>
          <div className="eyebrow"><Bell size={11} /> Early Warning System</div>
          <h1 className="h1">Predictive Alerts</h1>
          <div className="sub">
            AI-generated alerts showing risk escalation trajectories, root causes, and expected delay impact.
            Alerts require officer acknowledgment before intervention assignment.
          </div>
        </div>
        <div className="actions">
          <button className="btn" onClick={() => bulkUpdate('Acknowledged')}>
            <CheckCircle2 size={13} /> Acknowledge Visible
          </button>
          <button className="btn" onClick={() => bulkUpdate('Resolved')}>
            <CheckCircle2 size={13} /> Resolve Visible
          </button>
        </div>
      </div>

      {/* KPI Tiles — clickable filters */}
      <div className="grid kpis" style={{ marginBottom: 18 }}>
        {([
          ['Critical', counts.critical, 'kpi kpi-critical', 'Critical'],
          ['High', counts.high, 'kpi kpi-high', 'High'],
          ['Medium', counts.medium, 'kpi kpi-medium', 'Medium'],
          ['Open', counts.open, 'kpi', 'Open'],
          ['Acknowledged', counts.ack, 'kpi kpi-medium', 'Acknowledged'],
          ['Resolved', counts.resolved, 'kpi kpi-low', 'Resolved'],
        ] as [string, number, string, string][]).map(([label, val, cls, filter]) => (
          <div
            key={label} className={cls}
            style={{ cursor: 'pointer', outline: (severityFilter === filter || statusFilter === filter) ? '2px solid var(--blue)' : 'none' }}
            onClick={() => {
              if (['Critical', 'High', 'Medium'].includes(filter)) setSeverityFilter(severityFilter === filter ? 'All' : filter);
              else setStatusFilter(statusFilter === filter ? 'All' : filter);
            }}
          >
            <div className="label">{label}</div>
            <div className="value">{val}</div>
            <div className="trend" style={{ fontSize: 12 }}>Click to filter</div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <div className="filter-group">
          <Filter size={14} style={{ color: 'var(--muted)' }} />
          <div className="filter-item">
            <label className="filter-label">Severity</label>
            <select className="filter-select" value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}>
              <option>All</option><option>Critical</option><option>High</option><option>Medium</option>
            </select>
          </div>
          <div className="filter-item">
            <label className="filter-label">Status</label>
            <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option>All</option><option>Open</option><option>Acknowledged</option><option>Resolved</option>
            </select>
          </div>
          {(severityFilter !== 'All' || statusFilter !== 'All') && (
            <button className="filter-reset-btn" onClick={() => { setSeverityFilter('All'); setStatusFilter('All'); }}>
              <RotateCcw size={11} /> Reset
            </button>
          )}
        </div>
        <div className="filter-meta">
          <div className="filter-meta-item">Showing <strong style={{ color: 'var(--ink)' }}>{filtered.length}</strong> of {rows.length} alerts</div>
        </div>
      </div>

      {/* Main layout */}
      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 360px' : '1fr', gap: 16 }}>
        <div className="panel" style={{ padding: 0 }}>
          <div className="tablewrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Predictive Alert</th>
                  <th>Risk Escalation</th>
                  <th>Project</th>
                  <th>Detected</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 14 }}>No alerts match the current filters.</td></tr>
                ) : filtered.map(a => (
                  <tr
                    key={a.id}
                    style={{ cursor: 'pointer', background: selected?.id === a.id ? 'var(--blue-light)' : '' }}
                    onClick={() => setSelected(a.id === selected?.id ? null : a)}
                  >
                    <td>
                      <span className={'risk ' + a.severity.toLowerCase()} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        {sevIcon(a.severity)} {a.severity}
                      </span>
                    </td>
                    <td>
                      {/* PREDICTIVE FORMAT */}
                      <div style={{ fontWeight: 700, fontSize: 14.5 }}>{a.reason}</div>
                      <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                        📍 {a.action}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5 }}>
                        <TrendingUp size={13} style={{ color: (a.riskChange ?? 0) > 0 ? 'var(--red)' : 'var(--green)' }} />
                        <span style={{ fontWeight: 800, color: (a.riskChange ?? 0) > 0 ? 'var(--red-text)' : 'var(--green-text)' }}>
                          {a.riskDelta}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                        Expected impact: <strong style={{ color: 'var(--orange)' }}>{a.expectedImpact}</strong>
                      </div>
                    </td>
                    <td>
                      <Link className="link" href={'/projects/' + projectId(a)} onClick={e => e.stopPropagation()}>
                        {a.project}
                      </Link>
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: 13 }}>{a.detected}</td>
                    <td>
                      <span style={{
                        fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
                        background: statusColor(a.status).bg, color: statusColor(a.status).color
                      }}>
                        {a.status}{a.assignedTo ? ` → ${a.assignedTo.split(' ')[0]}` : ''}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="actions" style={{ gap: 5, flexWrap: 'nowrap' }}>
                        {a.status === 'Open' && (
                          <button className="btn" style={{ padding: '6px 10px', fontSize: 12 }}
                            onClick={() => { setAssignModal(a); setAssignToField(''); setDueDateField(''); }}>
                            <User size={11} /> Assign
                          </button>
                        )}
                        {a.status !== 'Resolved' && (
                          <button className="btn" style={{ padding: '6px 10px', fontSize: 12 }}
                            onClick={() => { update(a.id, { status: 'Resolved', outcome: 'Manually resolved' }); showToast('Alert resolved'); }}>
                            <CheckCircle2 size={11} />
                          </button>
                        )}
                        <Link className="btn" href={'/projects/' + projectId(a)} style={{ padding: '6px 10px', fontSize: 12 }}>
                          <ArrowUpRight size={12} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="panel" style={{ borderLeft: `3px solid ${selected.severity === 'Critical' ? 'var(--red)' : selected.severity === 'High' ? 'var(--orange)' : 'var(--amber)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <span className={'risk ' + selected.severity.toLowerCase()} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                {sevIcon(selected.severity)} {selected.severity} Alert
              </span>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 20 }} onClick={() => setSelected(null)}>×</button>
            </div>

            <div className="paneltitle" style={{ marginBottom: 6 }}>{selected.reason}</div>
            <div className="muted" style={{ fontSize: 14, marginBottom: 16 }}>{selected.action}</div>

            {/* Predictive details */}
            <div style={{ padding: '12px 14px', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: 8, marginBottom: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8, color: 'var(--red-text)' }}>Risk Escalation Detail</div>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>
                <TrendingUp size={15} style={{ display: 'inline', color: 'var(--red)' }} /> Risk: {selected.riskDelta}
              </div>
              <div style={{ fontSize: 13.5 }}>Root cause: <strong>{selected.cause}</strong></div>
              <div style={{ fontSize: 13.5, marginTop: 4 }}>Expected impact: <strong style={{ color: 'var(--orange)' }}>{selected.expectedImpact}</strong></div>
            </div>

            {/* Workflow */}
            <div style={{ marginBottom: 14 }}>
              <div className="paneltitle" style={{ fontSize: 14, marginBottom: 10 }}>Alert Workflow</div>
              {(['Alert Generated', 'Officer Assigned', 'Intervention In Progress', 'Risk Recalculated', 'Resolved'] as const).map((step, i) => {
                const stepStatus = i === 0 ? 'completed'
                  : i === 1 && selected.assignedTo ? 'completed'
                    : i === 1 ? 'pending'
                      : i === 4 && selected.status === 'Resolved' ? 'completed'
                        : 'pending';
                return (
                  <div key={step} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '5px 0' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0, background: stepStatus === 'completed' ? 'var(--green-bg)' : 'var(--bg)', border: `1.5px solid ${stepStatus === 'completed' ? 'var(--green)' : 'var(--line)'}`, color: stepStatus === 'completed' ? 'var(--green-text)' : 'var(--muted)', fontSize: 10, fontWeight: 800 }}>
                      {stepStatus === 'completed' ? '✓' : i + 1}
                    </div>
                    <span style={{ fontSize: 13, color: stepStatus === 'completed' ? 'var(--ink)' : 'var(--muted)', fontWeight: stepStatus === 'completed' ? 700 : 400 }}>{step}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'grid', gap: 7 }}>
              {([
                ['Project', selected.project],
                ['Detected', selected.detected],
                ['Status', selected.status],
                ['Assigned To', selected.assignedTo || 'Unassigned'],
                ['Due Date', selected.dueDate || 'Not set'],
                ['Outcome', (selected as { outcome?: string }).outcome || 'Pending'],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                  <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{k}</span>
                  <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>

            <div className="actions" style={{ flexDirection: 'column', marginTop: 14 }}>
              <button className="btn" style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => { setAssignModal(selected); setAssignToField(selected.assignedTo || ''); setDueDateField(selected.dueDate || ''); }}>
                <User size={14} /> Assign to Officer
              </button>
              {selected.status !== 'Resolved' && (
                <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => { update(selected.id, { status: 'Resolved' }); showToast('Alert resolved'); }}>
                  <CheckCircle2 size={14} /> Mark Resolved
                </button>
              )}
              <Link className="btn" href={'/projects/' + projectId(selected)} style={{ width: '100%', justifyContent: 'center' }}>
                <ArrowUpRight size={14} /> Open Risk Intelligence
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Assign Modal */}
      {assignModal && (
        <div className="modalbg" onClick={() => setAssignModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <h3 style={{ margin: '0 0 8px' }}>Assign Alert to Officer</h3>
            <p className="sub" style={{ marginBottom: 16 }}>
              Alert: <strong>{assignModal.reason}</strong> · <strong>{assignModal.project}</strong>
            </p>
            <div className="form">
              <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>Assign To</label>
              <select value={assignToField} onChange={e => setAssignToField(e.target.value)}>
                <option value="">Select officer...</option>
                <option>District Land Acquisition Officer (DLAO)</option>
                <option>State Revenue Secretary</option>
                <option>Project Director (NHAI/Railways)</option>
                <option>Legal Cell — District Court</option>
                <option>R&R Officer — District Collector Office</option>
              </select>
              <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>Due Date</label>
              <input type="date" value={dueDateField} onChange={e => setDueDateField(e.target.value)} />
              <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>Action Required</label>
              <textarea rows={2} defaultValue={`Resolve: ${assignModal.cause}. Expected impact if resolved: ${assignModal.expectedImpact} reduction.`} readOnly />
              <div className="actions" style={{ justifyContent: 'flex-end' }}>
                <button className="btn" onClick={() => setAssignModal(null)}>Cancel</button>
                <button className="btn primary" onClick={doAssign} disabled={!assignToField}>
                  <User size={13} /> Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', right: 20, bottom: 20, background: 'var(--navy)', color: '#fff', padding: '12px 18px', borderRadius: 8, fontSize: 14, zIndex: 60, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 25px rgba(0,0,0,0.25)' }}>
          <CheckCircle2 size={15} style={{ color: '#4ade80' }} /> {toast}
        </div>
      )}
    </div>
  );
}
