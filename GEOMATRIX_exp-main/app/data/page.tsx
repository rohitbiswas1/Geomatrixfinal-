'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Upload, CheckCircle2, Database, AlertCircle, RefreshCw, FileText, Trash2 } from 'lucide-react';
import { uploadFile, fetchIngestionLog, fetchTrainingDataSummary, fetchDashboardSummary, IngestionLogEntry } from '../../lib/apiClient';

type FileStatus = 'uploading' | 'validating' | 'ready' | 'error';

interface UploadedFile {
  name: string;
  size: string;
  type: string;
  status: FileStatus;
  rows?: number;
  errors?: number;
  errorMessage?: string;
}

const PIPELINE_STEPS = [
  { label: 'Uploaded', desc: 'File received by ingestion API', done: true },
  { label: 'Validated', desc: 'Schema & field validation', done: true },
  { label: 'Cleaned', desc: 'Duplicate & null handling', done: true },
  { label: 'Feature Engineered', desc: 'Risk feature extraction', done: true },
  { label: 'Ready for Prediction', desc: 'Model inference queue', done: false },
];

const DATA_QUALITY = [
  { label: 'Total Records', value: '12,482', color: 'var(--ink)', note: 'Across all datasets' },
  { label: 'Missing Fields', value: '184', color: 'var(--amber)', note: '1.5% of records' },
  { label: 'Duplicates Found', value: '27', color: 'var(--orange)', note: 'Auto-deduplicated' },
  { label: 'Invalid Coordinates', value: '6', color: 'var(--red)', note: 'Flagged for review' },
  { label: 'Validation Score', value: '98.4%', color: 'var(--green)', note: 'Pipeline threshold: 95%' },
  { label: 'Ready for Prediction', value: '12,265', color: 'var(--blue)', note: 'Cleared for model run' },
];

const NLP_DOCS = [
  { type: 'Land Records', count: 1842, processed: 1801, icon: '📋' },
  { type: 'Compensation Notices', count: 934, processed: 891, icon: '💼' },
  { type: 'Legal Petitions', count: 412, processed: 398, icon: '⚖️' },
  { type: 'Approval Orders', count: 678, processed: 672, icon: '✅' },
  { type: 'R&R Plans', count: 201, processed: 195, icon: '🏘️' },
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function DataPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [activeTab, setActiveTab] = useState<'upload' | 'quality' | 'pipeline' | 'nlp'>('upload');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [uploadDataType, setUploadDataType] = useState<'projects' | 'historical'>('projects');
  const [uploadLogs, setUploadLogs] = useState<IngestionLogEntry[]>([]);
  const [realQuality, setRealQuality] = useState<{ totalProjects: number; historicalRecords: number } | null>(null);

  const loadDataInfo = useCallback(async () => {
    try {
      const logs = await fetchIngestionLog(15);
      if (logs && logs.length > 0) setUploadLogs(logs);
      const trainSummary = await fetchTrainingDataSummary();
      const dashSummary = await fetchDashboardSummary();
      setRealQuality({
        totalProjects: dashSummary.total_projects,
        historicalRecords: trainSummary.total_records,
      });
    } catch {
      // Keep static fallback
    }
  }, []);

  useEffect(() => {
    loadDataInfo();
  }, [loadDataInfo]);

  async function handleFileAdd(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);
    for (const file of selectedFiles) {
      const entry: UploadedFile = {
        name: file.name,
        size: formatSize(file.size),
        type: file.name.split('.').pop()?.toUpperCase() || 'FILE',
        status: 'uploading',
      };
      setFiles(prev => [...prev, entry]);

      try {
        const result = await uploadFile(file, uploadDataType);
        setFiles(prev => prev.map(f => f.name === file.name ? {
          ...f,
          status: result.status === 'failed' ? 'error' : 'ready',
          rows: result.records_saved,
          errors: result.records_skipped,
          errorMessage: result.errors?.length ? result.errors[0] : undefined,
        } : f));
      } catch (err: any) {
        setFiles(prev => prev.map(f => f.name === file.name ? {
          ...f,
          status: 'error',
          errorMessage: err?.message || 'Upload failed',
        } : f));
      }
    }
    loadDataInfo();
    e.target.value = '';
  }

  function removeFile(name: string) {
    setFiles(prev => prev.filter(f => f.name !== name));
  }

  function refreshQuality() {
    setIsRefreshing(true);
    loadDataInfo().finally(() => setIsRefreshing(false));
  }

  const readyFiles = useMemo(() => files.filter(f => f.status === 'ready').length, [files]);

  return (
    <div className="page">
      <div className="head">
        <div>
          <div className="eyebrow"><Database size={11} /> Data Operations</div>
          <h1 className="h1">Data Management</h1>
          <div className="sub">
            Validate, clean and engineer project, parcel, compensation, legal and document datasets
            before AI risk prediction. Monitor data quality and pipeline status.
          </div>
        </div>
        <div className="actions">
          <button className="btn" onClick={refreshQuality} disabled={isRefreshing}>
            <RefreshCw size={13} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
            {isRefreshing ? 'Refreshing…' : 'Refresh Status'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '2px solid var(--line)' }}>
        {([
          ['upload', 'File Upload', Upload],
          ['quality', 'Data Quality', CheckCircle2],
          ['pipeline', 'Processing Pipeline', RefreshCw],
          ['nlp', 'Document Intelligence', FileText],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              background: 'none', border: 'none', padding: '10px 16px', cursor: 'pointer',
              fontSize: 13, fontWeight: activeTab === key ? 700 : 500,
              color: activeTab === key ? 'var(--blue)' : 'var(--muted)',
              borderBottom: activeTab === key ? '2px solid var(--blue)' : '2px solid transparent',
              marginBottom: -2, display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <Icon size={13} /> {label}
            {key === 'upload' && files.length > 0 && (
              <span style={{ background: 'var(--blue)', color: '#fff', borderRadius: 999, fontSize: 10, padding: '1px 5px', fontWeight: 700 }}>
                {files.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Upload */}
      {activeTab === 'upload' && (
        <div className="grid two">
          <div className="panel">
            <div className="paneltitle" style={{ marginBottom: 14 }}>Upload Datasets</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <button
                type="button"
                onClick={() => setUploadDataType('projects')}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  background: uploadDataType === 'projects' ? 'var(--blue)' : 'var(--bg)',
                  color: uploadDataType === 'projects' ? '#fff' : 'var(--ink)',
                  border: `1px solid ${uploadDataType === 'projects' ? 'var(--blue)' : 'var(--line)'}`
                }}
              >
                Project Records (CSV)
              </button>
              <button
                type="button"
                onClick={() => setUploadDataType('historical')}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  background: uploadDataType === 'historical' ? 'var(--blue)' : 'var(--bg)',
                  color: uploadDataType === 'historical' ? '#fff' : 'var(--ink)',
                  border: `1px solid ${uploadDataType === 'historical' ? 'var(--blue)' : 'var(--line)'}`
                }}
              >
                Historical Training Records (CSV / JSON)
              </button>
            </div>
            <label
              className="btn"
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                padding: '32px 20px', borderStyle: 'dashed', cursor: 'pointer', width: '100%',
                textAlign: 'center', borderRadius: 8, marginBottom: 16,
                background: 'var(--bg)', transition: 'all 0.2s ease',
              }}
            >
              <Upload size={28} style={{ color: 'var(--blue)' }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Click to upload or drag &amp; drop</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  CSV, XLSX, GeoJSON, JSON, PDF supported
                </div>
              </div>
              <input
                type="file"
                multiple
                accept=".csv,.xlsx,.geojson,.json,.pdf"
                style={{ display: 'none' }}
                onChange={handleFileAdd}
              />
            </label>

            {files.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)', fontSize: 13 }}>
                No files uploaded yet. Upload a CSV or GeoJSON to begin validation.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {files.map(f => (
                  <div key={f.name} style={{
                    display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center',
                    padding: '10px 14px', background: 'var(--bg)', borderRadius: 6,
                    border: '1px solid var(--line)', gap: 12,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 6, display: 'grid', placeItems: 'center',
                        background: f.status === 'ready' ? 'var(--green-bg)' : f.status === 'error' ? 'var(--red-bg)' : 'var(--blue-light)',
                        color: f.status === 'ready' ? 'var(--green-text)' : f.status === 'error' ? 'var(--red-text)' : 'var(--blue)',
                        fontSize: 10, fontWeight: 800
                      }}>
                        {f.type.slice(0, 4)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{f.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                          {f.size}
                          {f.status === 'uploading' && ' · Uploading…'}
                          {f.status === 'validating' && ' · Validating schema…'}
                          {f.status === 'ready' && ` · ${f.rows?.toLocaleString()} rows · ${f.errors} errors`}
                          {f.status === 'error' && ' · Validation failed'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {f.status === 'ready' && <CheckCircle2 size={16} style={{ color: 'var(--green)' }} />}
                      {f.status === 'uploading' && <RefreshCw size={14} style={{ color: 'var(--blue)', animation: 'spin 1s linear infinite' }} />}
                      {f.status === 'validating' && <RefreshCw size={14} style={{ color: 'var(--amber)', animation: 'spin 1s linear infinite' }} />}
                      {f.status === 'error' && <AlertCircle size={16} style={{ color: 'var(--red)' }} />}
                      <button
                        onClick={() => removeFile(f.name)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}
                        title="Remove file"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {readyFiles > 0 && (
                  <button className="btn primary" style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}>
                    <CheckCircle2 size={13} /> Run Validation &amp; Feature Engineering ({readyFiles} file{readyFiles > 1 ? 's' : ''})
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="panel">
            <div className="paneltitle" style={{ marginBottom: 14 }}>Accepted Formats</div>
            {([
              ['CSV', 'Project records, compensation tables, legal case registers', 'var(--green)'],
              ['XLSX', 'Master project tracking sheets from state authorities', 'var(--blue)'],
              ['GeoJSON / JSON', 'Parcel boundaries, project alignment coordinates', 'var(--amber)'],
              ['PDF', 'Land records, legal notices, rehabilitation plans (NLP extraction)', 'var(--purple)'],
            ] as [string, string, string][]).map(([fmt, desc, color]) => (
              <div key={fmt} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--line)', alignItems: 'flex-start' }}>
                <div style={{ width: 42, height: 32, display: 'grid', placeItems: 'center', background: color + '20', color, borderRadius: 5, fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
                  {fmt.split(' / ')[0]}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{fmt}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Data Quality */}
      {activeTab === 'quality' && (
        <div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 16 }}>
            {DATA_QUALITY.map(({ label, value, color, note }) => (
              <div key={label} className="kpi">
                <div className="kpi-head"><div className="label">{label}</div></div>
                <div className="value" style={{ color }}>{value}</div>
                <div className="trend" style={{ fontSize: 12 }}>{note}</div>
              </div>
            ))}
          </div>

          <div className="panel">
            <div className="panelhead">
              <div>
                <div className="paneltitle">Field Completeness by Dataset</div>
                <div className="muted">Completeness % across required schema fields</div>
              </div>
            </div>
            {([
              ['Project Master Records', 98.7, 'var(--green)'],
              ['Compensation Register', 94.2, 'var(--amber)'],
              ['Legal Case Register', 96.8, 'var(--green)'],
              ['Land Parcel Coordinates', 99.1, 'var(--green)'],
              ['R&R Family Data', 91.4, 'var(--orange)'],
              ['Approval Documentation', 87.3, 'var(--orange)'],
            ] as [string, number, string][]).map(([label, pct, color]) => (
              <div key={label} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                  <span>{label}</span>
                  <span style={{ color }}>{pct}%</span>
                </div>
                <div style={{ height: 8, background: 'var(--line)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: pct + '%', height: '100%', background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Pipeline */}
      {activeTab === 'pipeline' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0, marginBottom: 20 }}>
            {PIPELINE_STEPS.map((step, i) => (
              <div key={step.label} style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  className="panel"
                  style={{
                    flex: 1, textAlign: 'center', padding: '20px 12px',
                    borderLeft: i === 0 ? '3px solid var(--green)' : step.done ? '3px solid var(--green)' : '3px solid var(--line)',
                    background: step.done ? 'var(--green-bg)' : 'var(--bg)',
                  }}
                >
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{step.done ? '✅' : '⏳'}</div>
                  <div style={{ fontWeight: 800, fontSize: 13, color: step.done ? 'var(--green-text)' : 'var(--muted)' }}>{step.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{step.desc}</div>
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div style={{ width: 20, height: 2, background: 'var(--line-strong)', flexShrink: 0 }} />
                )}
              </div>
            ))}
          </div>

          <div className="grid two">
            <div className="panel">
              <div className="paneltitle" style={{ marginBottom: 14 }}>Pipeline Run History</div>
              {uploadLogs.length > 0 ? (
                uploadLogs.map(log => (
                  <div key={log.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--line)', alignItems: 'center', fontSize: 13 }}>
                    <span style={{ color: 'var(--muted)', fontSize: 12 }}>{log.finished_at ? new Date(log.finished_at).toLocaleTimeString('en-IN') : new Date(log.started_at).toLocaleTimeString('en-IN')}</span>
                    <span style={{ fontWeight: 600 }}>{log.source}</span>
                    <span style={{ color: 'var(--muted)' }}>{log.records_saved} saved ({log.records_skipped} skipped)</span>
                    <span className={'risk ' + (log.status === 'success' ? 'low' : log.status === 'partial' ? 'medium' : 'critical')}>
                      {log.status}
                    </span>
                  </div>
                ))
              ) : (
                ([
                  ['Today 08:30 IST', 'Full pipeline run', '12,265 records', 'Success'],
                  ['Yesterday 20:15 IST', 'Incremental update', '847 records', 'Success'],
                  ['Sep 15, 14:00 IST', 'Full pipeline run', '12,014 records', 'Warning'],
                  ['Sep 14, 09:00 IST', 'Schema validation', '—', 'Failed'],
                ] as [string, string, string, string][]).map(([time, run, records, status]) => (
                  <div key={time} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--line)', alignItems: 'center', fontSize: 13 }}>
                    <span style={{ color: 'var(--muted)', fontSize: 12 }}>{time}</span>
                    <span style={{ fontWeight: 600 }}>{run}</span>
                    <span style={{ color: 'var(--muted)' }}>{records}</span>
                    <span className={'risk ' + (status === 'Success' ? 'low' : status === 'Warning' ? 'medium' : 'critical')}>
                      {status}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="panel">
              <div className="paneltitle" style={{ marginBottom: 14 }}>Trigger New Run</div>
              <div className="form">
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Run Type</label>
                <select className="filter-select" style={{ width: '100%' }}>
                  <option>Full Pipeline (All Records)</option>
                  <option>Incremental (New Records Only)</option>
                  <option>Schema Validation Only</option>
                  <option>Feature Engineering Only</option>
                </select>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Target Dataset</label>
                <select className="filter-select" style={{ width: '100%' }}>
                  <option>All Datasets</option>
                  <option>Project Master Records</option>
                  <option>Compensation Register</option>
                  <option>Legal Case Register</option>
                </select>
                <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => alert('Pipeline trigger: Prototype only — no actual pipeline is running.')}>
                  <RefreshCw size={13} /> Trigger Pipeline Run
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: NLP Intelligence */}
      {activeTab === 'nlp' && (
        <div>
          <div className="demo" style={{ marginBottom: 16 }}>
            <AlertCircle size={14} />
            Document NLP extraction is simulated in this prototype. No actual OCR or NLP processing is performed.
          </div>
          <div className="grid two" style={{ marginBottom: 16 }}>
            <div className="panel">
              <div className="paneltitle" style={{ marginBottom: 14 }}>Document Processing Status</div>
              {NLP_DOCS.map(({ type, count, processed, icon }) => {
                const pct = Math.round((processed / count) * 100);
                return (
                  <div key={type} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                      <span>{icon} {type}</span>
                      <span style={{ color: 'var(--muted)', fontWeight: 500 }}>{processed.toLocaleString()} / {count.toLocaleString()} ({pct}%)</span>
                    </div>
                    <div style={{ height: 8, background: 'var(--line)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: pct + '%', height: '100%', background: pct > 95 ? 'var(--green)' : 'var(--amber)', borderRadius: 4 }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="panel">
              <div className="paneltitle" style={{ marginBottom: 14 }}>NLP Extraction Architecture</div>
              {([
                ['Mock OCR', 'Document type, reference number, project ID, parties, date and authority extraction from uploaded PDFs.', '📄'],
                ['Entity Recognition', 'Named entity recognition (NER) for land owner names, survey numbers, case IDs, and district references.', '🔍'],
                ['Risk Signal Classification', 'Legal-text processing to identify objection keywords, compensation disputes, and court order signals.', '⚖️'],
                ['Future Architecture', 'OCR → NER → Classification pipeline using Tesseract + spaCy. No actual AI is running in prototype mode.', '🚀'],
              ]).map(([title, desc, icon]) => (
                <div key={title as string} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ fontSize: 20, flexShrink: 0 }}>{icon as string}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{title as string}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3, lineHeight: 1.5 }}>{desc as string}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
