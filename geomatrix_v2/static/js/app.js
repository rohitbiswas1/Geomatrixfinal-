// Geomatrix v2 — Main Application JavaScript
// Premium UI interactions, API helpers, theme management

/* ═══════════════════════════════════════════════════════════════
   THEME MANAGEMENT
═══════════════════════════════════════════════════════════════ */

const ThemeManager = {
  init() {
    const saved = localStorage.getItem('geo-theme') || 'dark';
    this.apply(saved);
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => this.apply(btn.dataset.theme));
    });
  },
  apply(mode) {
    const root = document.documentElement;
    let effective = mode;
    if (mode === 'auto') {
      effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    root.setAttribute('data-theme', effective === 'light' ? 'light' : 'dark');
    localStorage.setItem('geo-theme', mode);
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === mode);
    });
  }
};

/* ═══════════════════════════════════════════════════════════════
   TOAST NOTIFICATIONS
═══════════════════════════════════════════════════════════════ */

const Toast = {
  container: null,
  init() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      document.body.appendChild(this.container);
    }
  },
  show(message, type = 'info', duration = 4000) {
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span style="font-weight:700;font-size:16px;color:var(--${type === 'success' ? 'green' : type === 'error' ? 'red' : 'blue'})">${icons[type]}</span><span>${message}</span>`;
    this.container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};

/* ═══════════════════════════════════════════════════════════════
   API HELPERS
═══════════════════════════════════════════════════════════════ */

const API = {
  async get(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
    return r.json();
  },
  async post(url, body, isForm = false) {
    const opts = { method: 'POST' };
    if (isForm) {
      opts.body = body;
    } else {
      opts.headers = { 'Content-Type': 'application/json' };
      opts.body = JSON.stringify(body);
    }
    const r = await fetch(url, opts);
    const data = await r.json();
    if (!r.ok) throw Object.assign(new Error(data.detail || data.message || 'Error'), { data });
    return data;
  }
};

/* ═══════════════════════════════════════════════════════════════
   RISK BADGE HELPER
═══════════════════════════════════════════════════════════════ */

function riskBadge(level, score) {
  if (!level) return '<span class="badge badge-neutral">No ML Score</span>';
  const cls = { Critical: 'critical', High: 'high', Medium: 'medium', Low: 'low' }[level] || 'neutral';
  const s = score !== null && score !== undefined ? ` ${score.toFixed(1)}%` : '';
  return `<span class="badge badge-${cls}">${level}${s}</span>`;
}

function riskDot(level) {
  const map = { Critical: 'red', High: 'amber', Medium: 'amber', Low: 'green' };
  return `<span class="status-dot ${map[level] || 'blue'}"></span>`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function truncate(str, n = 30) {
  if (!str) return '—';
  return str.length > n ? str.slice(0, n) + '…' : str;
}

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════════════════════════ */

async function loadDashboard() {
  try {
    const [summary, modelStatus] = await Promise.all([
      API.get('/api/dashboard/summary'),
      API.get('/api/model/status'),
    ]);

    // KPI cards
    setKPI('kpi-total', summary.total_projects, '');
    setKPI('kpi-critical', summary.critical_count, '');
    setKPI('kpi-high', summary.high_count, '');
    setKPI('kpi-families', summary.total_families.toLocaleString('en-IN'), 'Recorded across project parcels');
    if (summary.avg_risk_score !== null && summary.avg_risk_score !== undefined) {
      setKPI('kpi-avg-risk', summary.avg_risk_score.toFixed(1) + '%', 'Average model risk score');
    } else {
      document.getElementById('kpi-avg-risk-val').innerHTML = '<span class="kpi-value unavailable">Data unavailable</span>';
      document.getElementById('kpi-avg-risk-sub').textContent = 'No ML scores computed yet';
    }

    // Model status banner
    renderModelStatusBanner(modelStatus);

    // Recent projects table
    const projects = await API.get('/api/projects?limit=5');
    renderProjectsTable('recent-projects-body', projects, true);

    // Alerts
    const alerts = await API.get('/api/alerts');
    renderAlertsList('alerts-list', alerts);

  } catch (e) {
    console.error('Dashboard load error:', e);
    Toast.show('Failed to load dashboard data: ' + e.message, 'error');
  }
}

function setKPI(id, value, sub) {
  const el = document.getElementById(id + '-val');
  const subEl = document.getElementById(id + '-sub');
  if (el) el.textContent = value;
  if (subEl && sub) subEl.textContent = sub;
}

function renderModelStatusBanner(status) {
  const el = document.getElementById('model-status-banner');
  if (!el) return;
  if (status.trained) {
    el.innerHTML = `
      <div class="flex items-center gap-8">
        <span class="status-dot green"></span>
        <span style="font-weight:600;color:var(--green)">Model Active</span>
        <span class="text-sm text-muted">— ${status.algorithm} · ${status.n_samples} samples · F1: ${(status.f1_score * 100).toFixed(1)}%</span>
      </div>`;
  } else {
    el.innerHTML = `
      <div class="flex items-center gap-8">
        <span class="status-dot amber"></span>
        <span style="font-weight:600;color:var(--amber)">Not Trained</span>
        <span class="text-sm text-muted">— Requires ≥ 10 real labeled records</span>
        <a href="/ingest" class="btn btn-xs btn-secondary">Import Data →</a>
      </div>`;
  }
}

function renderProjectsTable(tbodyId, projects, compact = false) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;

  if (!projects || projects.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-state" style="padding:40px;text-align:center">
      <div class="empty-state-icon">📭</div>
      <h3>No Projects Found</h3>
      <p>Import project data via the <a href="/ingest" class="text-blue">Data Ingestion</a> page.</p>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = projects.map(p => `
    <tr>
      <td><span class="font-mono text-xs" style="color:var(--accent)">${p.project_code}</span></td>
      <td><strong>${truncate(p.name, 35)}</strong></td>
      <td class="text-sm text-muted">${p.district}, ${p.state}</td>
      <td class="text-sm">${p.authority || '—'}</td>
      ${!compact ? `<td><span class="badge badge-neutral" style="font-size:10px">${p.current_stage || '—'}</span></td>` : ''}
      <td>${p.latitude && p.longitude ? `<span class="coords-badge">${p.latitude.toFixed(3)}, ${p.longitude.toFixed(3)}</span>` : '<span class="text-muted text-xs">No coords</span>'}</td>
      <td class="text-xs"><a href="${p.source_url || '#'}" class="source-url" target="_blank" title="${p.source_url || 'No source'}">${truncate(p.source_url || 'Manual entry', 25)}</a></td>
      <td><a href="/projects/${p.id}" class="btn btn-xs btn-secondary">Inspect →</a></td>
    </tr>
  `).join('');
}

function renderAlertsList(containerId, alerts) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!alerts || alerts.length === 0) {
    el.innerHTML = `<div class="empty-state" style="padding:32px">
      <div class="empty-state-icon">🔔</div>
      <h3>No Active Risk Alerts</h3>
      <p>Alerts will be triggered automatically when ML delay predictions exceed critical risk thresholds.</p>
    </div>`;
    return;
  }
  el.innerHTML = alerts.map(a => `
    <div class="alert-card ${(a.severity || '').toLowerCase()}">
      <div class="alert-header">
        <div>
          <span class="badge badge-${(a.severity||'info').toLowerCase()}">${a.severity || 'Unknown'}</span>
          <span class="alert-title" style="margin-left:8px">${a.project_name || 'Unknown Project'}</span>
        </div>
        <span class="badge badge-${a.status === 'Open' ? 'info' : 'neutral'}">${a.status}</span>
      </div>
      <div class="alert-meta">${a.reason || 'No reason specified'} · Detected ${formatDate(a.detected_at)}</div>
      ${a.recommended_action ? `<div class="alert-action">→ ${a.recommended_action}</div>` : ''}
    </div>
  `).join('');
}

/* ═══════════════════════════════════════════════════════════════
   PROJECTS PAGE
═══════════════════════════════════════════════════════════════ */

async function loadProjects() {
  const tbody = document.getElementById('projects-table-body');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="9"><div class="loading-row"><div class="spinner"></div>Loading real project data…</div></td></tr>`;

  try {
    const params = new URLSearchParams(window.location.search);
    const url = '/api/projects?' + new URLSearchParams({
      ...(params.get('state') ? { state: params.get('state') } : {}),
      ...(params.get('stage') ? { stage: params.get('stage') } : {}),
      ...(params.get('risk_level') ? { risk_level: params.get('risk_level') } : {}),
      limit: 200
    });

    const projects = await API.get(url);
    renderProjectsTable('projects-table-body', projects, false);

    // Update count
    const countEl = document.getElementById('project-count');
    if (countEl) countEl.textContent = projects.length;

  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="9" style="padding:24px;color:var(--red)">${e.message}</td></tr>`;
    Toast.show('Failed to load projects: ' + e.message, 'error');
  }
}

/* ═══════════════════════════════════════════════════════════════
   PROJECT DETAIL PAGE
═══════════════════════════════════════════════════════════════ */

async function loadProjectDetail(projectId) {
  try {
    const project = await API.get(`/api/projects/${projectId}`);
    renderProjectDetail(project);

    // Try to load prediction
    loadProjectPrediction(projectId, project);
  } catch (e) {
    Toast.show('Failed to load project: ' + e.message, 'error');
  }
}

function renderProjectDetail(p) {
  setTextContent('proj-name', p.name);
  setTextContent('proj-code', p.project_code);
  setTextContent('proj-state', p.state);
  setTextContent('proj-district', p.district);
  setTextContent('proj-authority', p.authority);
  setTextContent('proj-type', p.project_type);
  setTextContent('proj-stage', p.current_stage || '—');
  setTextContent('proj-status', p.status || '—');
  setTextContent('proj-land-req', p.land_required ? p.land_required.toFixed(1) + ' ha' : '—');
  setTextContent('proj-land-acq', p.land_acquired ? p.land_acquired.toFixed(1) + ' ha' : '—');
  setTextContent('proj-families', p.affected_families?.toLocaleString('en-IN') || '—');
  setTextContent('proj-source', p.source_url || 'Manual entry');
  setTextContent('proj-source-id', p.source_record_id || '—');
  setTextContent('proj-imported', formatDate(p.imported_at));

  if (p.latitude && p.longitude) {
    setTextContent('proj-coords', `${p.latitude.toFixed(6)}, ${p.longitude.toFixed(6)}`);
  } else {
    setTextContent('proj-coords', 'Coordinates unavailable');
  }
}

function setTextContent(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

async function loadProjectPrediction(projectId, project) {
  const predPanel = document.getElementById('prediction-panel');
  if (!predPanel) return;

  // Show loading
  predPanel.innerHTML = `<div class="loading-row"><div class="spinner"></div>Computing ML risk prediction…</div>`;

  try {
    const result = await API.post(`/api/projects/${projectId}/predict-risk`, {});
    const pred = result.prediction;
    const levelCls = { Critical: 'critical', High: 'high', Medium: 'medium', Low: 'low' }[pred.risk_level] || 'neutral';

    predPanel.innerHTML = `
      <div class="metric-grid mt-8">
        <div class="metric-card">
          <div class="metric-label">Risk Score</div>
          <div class="metric-value ${levelCls === 'critical' ? 'bad' : levelCls === 'low' ? 'good' : 'warn'}">${pred.risk_score.toFixed(1)}%</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Risk Level</div>
          <div style="margin-top:6px">${riskBadge(pred.risk_level)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Delay Probability</div>
          <div class="metric-value ${pred.delay_probability > 0.7 ? 'bad' : pred.delay_probability > 0.4 ? 'warn' : 'good'}">${(pred.delay_probability * 100).toFixed(1)}%</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Predicted Delay</div>
          <div class="metric-value warn">${pred.predicted_delay_days} days</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Model Confidence</div>
          <div class="metric-value good">${pred.confidence.toFixed(1)}%</div>
        </div>
      </div>
    `;

    // Load SHAP explanations
    loadShapExplanations(projectId);

  } catch (e) {
    if (e.message.includes('503') || e.message.includes('not trained')) {
      predPanel.innerHTML = `
        <div class="not-trained-banner">
          <div class="not-trained-icon">🧠</div>
          <div>
            <div class="not-trained-title">ML Model Not Trained</div>
            <div class="not-trained-text">
              No risk prediction available. Import ≥10 real labeled historical records
              and train the model via the <a href="/model" style="color:var(--blue)">ML Model & SHAP</a> page.
            </div>
          </div>
        </div>`;
    } else {
      predPanel.innerHTML = `<div class="data-unavailable">⚠ Prediction failed: ${e.message}</div>`;
    }
  }
}

async function loadShapExplanations(projectId) {
  const shapPanel = document.getElementById('shap-panel');
  if (!shapPanel) return;

  try {
    const result = await API.get(`/api/projects/${projectId}/explain`);
    const features = result.shap_features;
    const maxAbs = Math.max(...features.map(f => Math.abs(f.shap_value)));

    shapPanel.innerHTML = `
      <div class="card-header">
        <span class="card-title">🔍 SHAP Feature Explanations</span>
        <span class="badge badge-info">Real model output</span>
      </div>
      ${features.map(f => `
        <div class="shap-bar-row">
          <div class="shap-feature-name" title="${f.description}">${f.display_name}</div>
          <div class="shap-bar-track">
            <div class="shap-bar-fill ${f.direction}"
                 style="width:${maxAbs > 0 ? (Math.abs(f.shap_value) / maxAbs * 100).toFixed(1) : 0}%"></div>
          </div>
          <div class="shap-value">${f.shap_value > 0 ? '+' : ''}${f.shap_value.toFixed(4)}</div>
          <span class="badge badge-${f.direction === 'up' ? 'critical' : 'low'}" style="font-size:10px">${f.direction === 'up' ? '↑ Risk' : '↓ Risk'}</span>
        </div>
      `).join('')}
      <div class="text-xs text-muted mt-8">SHAP values computed by TreeExplainer on real trained model. Positive = increases delay risk.</div>
    `;
  } catch (e) {
    if (shapPanel.innerHTML.includes('not-trained-banner')) return; // already showing
    if (e.message.includes('503')) {
      shapPanel.innerHTML = `<div class="data-unavailable">🔍 SHAP explanations unavailable — model not trained.</div>`;
    }
  }
}

/* ═══════════════════════════════════════════════════════════════
   ML MODEL PAGE
═══════════════════════════════════════════════════════════════ */

async function loadModelPage() {
  try {
    const [status, trainingData, runs] = await Promise.all([
      API.get('/api/model/status'),
      API.get('/api/model/training-data'),
      API.get('/api/model/runs'),
    ]);

    renderModelStatus(status);
    renderTrainingData(trainingData);
    renderModelRuns(runs);

  } catch (e) {
    Toast.show('Failed to load model data: ' + e.message, 'error');
  }
}

function renderModelStatus(status) {
  const el = document.getElementById('model-status-section');
  if (!el) return;

  if (!status.trained) {
    el.innerHTML = `
      <div class="not-trained-banner">
        <div class="not-trained-icon">🧠</div>
        <div>
          <div class="not-trained-title">Model Not Trained</div>
          <div class="not-trained-text">${status.message}</div>
        </div>
      </div>`;
  } else {
    el.innerHTML = `
      <div class="flex items-center gap-12 mb-16">
        <span class="status-dot green"></span>
        <span style="font-weight:700;color:var(--green);font-size:15px">Model Active — ${status.algorithm}</span>
        <span class="badge badge-success">Ready for Predictions</span>
      </div>
      <div class="metric-grid">
        <div class="metric-card"><div class="metric-label">Precision</div><div class="metric-value good">${(status.precision * 100).toFixed(1)}%</div></div>
        <div class="metric-card"><div class="metric-label">Recall</div><div class="metric-value good">${(status.recall * 100).toFixed(1)}%</div></div>
        <div class="metric-card"><div class="metric-label">F1 Score</div><div class="metric-value good">${(status.f1_score * 100).toFixed(1)}%</div></div>
        <div class="metric-card"><div class="metric-label">ROC-AUC</div><div class="metric-value good">${(status.roc_auc * 100).toFixed(1)}%</div></div>
        <div class="metric-card"><div class="metric-label">RMSE (days)</div><div class="metric-value warn">${status.rmse.toFixed(1)}</div></div>
        <div class="metric-card"><div class="metric-label">Training Samples</div><div class="metric-value">${status.n_samples}</div></div>
      </div>
      <div class="mt-16">
        <div class="card-title mb-8">Feature Importance Order</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${(status.feature_names || []).map((f, i) => `
            <span class="badge badge-neutral" style="font-size:11px">${i + 1}. ${f.replace(/_/g, ' ')}</span>
          `).join('')}
        </div>
        <div class="text-xs text-muted mt-8">Features used in training. SHAP values provide per-prediction explanations.</div>
      </div>
    `;
  }
}

function renderTrainingData(data) {
  const el = document.getElementById('training-data-section');
  if (!el) return;
  const color = data.ready_to_train ? 'var(--green)' : 'var(--amber)';
  el.innerHTML = `
    <div class="flex items-center gap-12 mb-12">
      <span style="font-size:24px;font-weight:700;color:${color}">${data.total_records}</span>
      <div>
        <div class="font-bold">Labeled Historical Records</div>
        <div class="text-sm text-muted">${data.delayed_count} delayed · ${data.on_time_count} on-time</div>
      </div>
      <span class="badge badge-${data.ready_to_train ? 'success' : 'neutral'}">${data.ready_to_train ? 'Ready to Train' : 'Need ' + (10 - data.total_records) + ' more'}</span>
    </div>
    <div class="text-sm text-muted">${data.message}</div>
  `;
}

function renderModelRuns(runs) {
  const el = document.getElementById('model-runs-body');
  if (!el) return;
  if (!runs.length) {
    el.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--ink-3)">No training runs yet</td></tr>`;
    return;
  }
  el.innerHTML = runs.map(r => `
    <tr>
      <td class="font-mono text-xs">${r.id.slice(0, 8)}…</td>
      <td><span class="badge badge-info">${r.algorithm}</span></td>
      <td class="text-xs text-muted">${formatDate(r.trained_at)}</td>
      <td>${r.n_samples}</td>
      <td>${r.f1_score !== null ? (r.f1_score * 100).toFixed(1) + '%' : '—'}</td>
      <td>${r.roc_auc !== null ? (r.roc_auc * 100).toFixed(1) + '%' : '—'}</td>
      <td>${r.is_active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-neutral">Archived</span>'}</td>
    </tr>
  `).join('');
}

async function triggerTraining(algorithm) {
  const btn = document.getElementById('train-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Training…'; }

  try {
    const result = await API.post(`/api/model/train?algorithm=${algorithm}`, {});
    Toast.show(`Model trained: F1=${(result.metrics.f1_score * 100).toFixed(1)}% ROC-AUC=${(result.metrics.roc_auc * 100).toFixed(1)}%`, 'success', 6000);
    setTimeout(() => loadModelPage(), 500);
  } catch (e) {
    const msg = e.data?.detail || e.message;
    Toast.show('Training failed: ' + msg, 'error', 6000);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Train Model'; }
  }
}

/* ═══════════════════════════════════════════════════════════════
   DATA INGESTION PAGE
═══════════════════════════════════════════════════════════════ */

function initIngestPage() {
  const zone = document.getElementById('upload-zone');
  const input = document.getElementById('file-input');
  const typeSelect = document.getElementById('data-type');

  if (!zone || !input) return;

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleFileUpload(e.dataTransfer.files[0]);
  });
  input.addEventListener('change', () => {
    if (input.files.length) handleFileUpload(input.files[0]);
    input.value = '';
  });
}

async function handleFileUpload(file) {
  if (!file.name.endsWith('.csv')) {
    Toast.show('Only CSV files are accepted', 'error');
    return;
  }

  const resultEl = document.getElementById('upload-result');
  if (resultEl) {
    resultEl.innerHTML = `<div class="loading-row"><div class="spinner"></div>Uploading ${file.name}…</div>`;
    resultEl.className = 'ingest-result';
    resultEl.classList.remove('hidden');
  }

  const typeSelect = document.getElementById('data-type');
  const dataType = typeSelect?.value || 'projects';

  const formData = new FormData();
  formData.append('file', file);

  try {
    const result = await API.post(`/api/ingest/upload?data_type=${dataType}`, formData, true);
    renderIngestResult(resultEl, result, file.name);
    Toast.show(`Imported: ${result.records_saved} records saved`, result.status === 'success' ? 'success' : 'info');
    loadIngestionLog();
  } catch (e) {
    if (resultEl) resultEl.innerHTML = `<div style="color:var(--red)">Upload failed: ${e.message}</div>`;
    Toast.show('Upload failed: ' + e.message, 'error');
  }
}

function renderIngestResult(el, result, filename) {
  if (!el) return;
  el.className = `ingest-result ${result.status}`;
  el.innerHTML = `
    <div style="font-weight:600;margin-bottom:8px">${filename || result.source}</div>
    <div class="result-row"><span class="text-muted">Records fetched</span><span>${result.records_fetched}</span></div>
    <div class="result-row"><span class="text-muted">Saved to DB</span><span style="color:var(--green)">${result.records_saved}</span></div>
    <div class="result-row"><span class="text-muted">Skipped (duplicates)</span><span style="color:var(--amber)">${result.records_skipped}</span></div>
    <div class="result-row"><span class="text-muted">Status</span><span class="badge badge-${result.status === 'success' ? 'success' : result.status === 'failed' ? 'critical' : 'medium'}">${result.status}</span></div>
    ${result.errors.length ? `<div class="text-xs text-muted mt-8">Errors: ${result.errors.slice(0, 3).join('; ')}</div>` : ''}
  `;
}

async function fetchFromDataGovIn() {
  const source = document.getElementById('dgi-source')?.value || 'land_acquisition';
  const limit = document.getElementById('dgi-limit')?.value || 50;
  const resultEl = document.getElementById('dgi-result');

  if (resultEl) {
    resultEl.innerHTML = `<div class="loading-row"><div class="spinner"></div>Fetching from data.gov.in…</div>`;
    resultEl.classList.remove('hidden');
  }

  try {
    const result = await API.post(`/api/ingest/datagovIn?source=${source}&limit=${limit}`, {});
    renderIngestResult(resultEl, result, `data.gov.in / ${source}`);
    Toast.show(`Fetched: ${result.records_saved} records from data.gov.in`, result.status === 'failed' ? 'error' : 'success');
    loadIngestionLog();
  } catch (e) {
    if (resultEl) resultEl.innerHTML = `<div style="color:var(--red)">Fetch failed: ${e.message}</div>`;
    Toast.show('data.gov.in fetch failed: ' + e.message, 'error');
  }
}

async function loadIngestionLog() {
  const el = document.getElementById('ingest-log-body');
  if (!el) return;

  try {
    const logs = await API.get('/api/ingest/log');
    if (!logs.length) {
      el.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--ink-3)">No imports yet</td></tr>`;
      return;
    }
    el.innerHTML = logs.map(l => `
      <tr>
        <td class="text-xs text-muted">${formatDate(l.started_at)}</td>
        <td><span class="badge badge-neutral">${l.source}</span></td>
        <td>${l.records_fetched}</td>
        <td style="color:var(--green)">${l.records_saved}</td>
        <td style="color:var(--amber)">${l.records_skipped}</td>
        <td><span class="badge badge-${l.status === 'success' ? 'success' : l.status === 'failed' ? 'critical' : 'medium'}">${l.status}</span></td>
      </tr>
    `).join('');
  } catch (e) {
    el.innerHTML = `<tr><td colspan="6" style="color:var(--red)">${e.message}</td></tr>`;
  }
}

/* ═══════════════════════════════════════════════════════════════
   LOGIN PAGE
═══════════════════════════════════════════════════════════════ */

function initLoginPage() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errEl = document.getElementById('login-error');
    const submitBtn = document.getElementById('login-submit');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in…';
    if (errEl) errEl.classList.add('hidden');

    try {
      const result = await API.post('/api/auth/login', { email, password });
      sessionStorage.setItem('geomatrix-auth', JSON.stringify(result.user));
      window.location.href = '/dashboard';
    } catch (e) {
      if (errEl) {
        errEl.textContent = 'Invalid credentials. Try the demo accounts below.';
        errEl.classList.remove('hidden');
      }
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    }
  });

  // Google OAuth
  const googleClientId = document.querySelector('meta[name="google-client-id"]')?.content;
  if (googleClientId && window.google) {
    google.accounts.id.initialize({
      client_id: googleClientId,
      callback: async ({ credential }) => {
        try {
          const result = await API.post('/api/auth/google', { credential });
          sessionStorage.setItem('geomatrix-auth', JSON.stringify(result.user));
          window.location.href = '/dashboard';
        } catch (e) {
          Toast.show('Google sign-in failed', 'error');
        }
      }
    });
    const btnEl = document.getElementById('google-btn-container');
    if (btnEl) {
      google.accounts.id.renderButton(btnEl, { theme: 'filled_black', size: 'large', width: 340, text: 'continue_with' });
    }
  }

  // Demo account click-to-fill
  document.querySelectorAll('.demo-account-row').forEach(row => {
    row.addEventListener('click', () => {
      document.getElementById('email').value = row.dataset.email;
      document.getElementById('password').value = row.dataset.password;
    });
  });
}

/* ═══════════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init();
  Toast.init();

  const path = window.location.pathname;

  if (path === '/login') {
    initLoginPage();
  } else {
    // Auth guard
    if (!sessionStorage.getItem('geomatrix-auth') && path !== '/login') {
      window.location.href = '/login';
      return;
    }

    // Logout button
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      sessionStorage.removeItem('geomatrix-auth');
      window.location.href = '/login';
    });

    // Render user info in sidebar
    const auth = JSON.parse(sessionStorage.getItem('geomatrix-auth') || '{}');
    const nameEl = document.getElementById('user-name');
    const roleEl = document.getElementById('user-role');
    const avatarEl = document.getElementById('user-avatar');
    if (nameEl) nameEl.textContent = auth.name || auth.email?.split('@')[0] || 'User';
    if (roleEl) roleEl.textContent = auth.role || 'Officer';
    if (avatarEl) avatarEl.textContent = (auth.name || auth.email || 'U')[0].toUpperCase();

    // Page-specific loaders
    if (path === '/dashboard') loadDashboard();
    else if (path === '/projects') loadProjects();
    else if (path.startsWith('/projects/')) {
      const id = path.split('/')[2];
      loadProjectDetail(id);
    }
    else if (path === '/model') loadModelPage();
    else if (path === '/ingest') {
      initIngestPage();
      loadIngestionLog();
    }
    else if (path === '/alerts') loadAlerts();
  }
});

async function loadAlerts() {
  try {
    const alerts = await API.get('/api/alerts?status=all&limit=100');
    renderAlertsList('alerts-list', alerts);
    const summary = await API.get('/api/alerts/summary');
    setKPI('alerts-total', summary.total, '');
    setKPI('alerts-open', summary.open, '');
    setKPI('alerts-critical', summary.critical, '');
    setKPI('alerts-high', summary.high, '');
  } catch (e) {
    Toast.show('Failed to load alerts: ' + e.message, 'error');
  }
}
