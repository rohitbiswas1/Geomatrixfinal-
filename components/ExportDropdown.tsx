'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, FileText, Table, FileCode, Check } from 'lucide-react';

export type ExportFormat = 'pdf' | 'excel' | 'csv';

export interface ExportDropdownProps {
  label?: string;
  variant?: 'primary' | 'secondary';
  align?: 'left' | 'right';
  onExport: (format: ExportFormat) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
  tooltip?: string;
}

export default function ExportDropdown({
  label = 'Export',
  variant = 'secondary',
  align = 'right',
  onExport,
  disabled = false,
  className = '',
  tooltip = 'Export data in PDF, Excel, or CSV formats',
}: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<ExportFormat | null>(null);
  const [justDownloaded, setJustDownloaded] = useState<ExportFormat | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  async function handleSelect(format: ExportFormat) {
    setDownloadingFormat(format);
    try {
      await onExport(format);
      setJustDownloaded(format);
      setTimeout(() => {
        setJustDownloaded(null);
        setIsOpen(false);
      }, 800);
    } finally {
      setDownloadingFormat(null);
    }
  }

  const btnClass = variant === 'primary' ? 'btn primary' : 'btn';

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', display: 'inline-block' }}
      className={`export-dropdown-wrapper ${className}`}
    >
      <button
        type="button"
        className={btnClass}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        disabled={disabled || downloadingFormat !== null}
        title={tooltip}
        aria-haspopup="true"
        aria-expanded={isOpen}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontWeight: 600,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <Download size={13} aria-hidden="true" />
        <span>{label}</span>
        <ChevronDown
          size={12}
          style={{
            transition: 'transform 0.2s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            opacity: 0.75,
          }}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            [align === 'right' ? 'right' : 'left']: 0,
            zIndex: 999,
            minWidth: 220,
            background: 'var(--panel, #ffffff)',
            border: '1px solid var(--line, #e2e8f0)',
            borderRadius: 8,
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)',
            padding: '6px',
            animation: 'fadeInMenu 0.15s ease-out',
          }}
        >
          <div
            style={{
              padding: '6px 10px',
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--muted, #64748b)',
              borderBottom: '1px solid var(--line, #f1f5f9)',
              marginBottom: 4,
            }}
          >
            Select Export Format
          </div>

          {/* Option 1: PDF */}
          <button
            type="button"
            role="menuitem"
            onClick={() => handleSelect('pdf')}
            disabled={downloadingFormat !== null}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              border: 'none',
              background: 'transparent',
              borderRadius: 6,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.15s',
              color: 'var(--ink, #0f172a)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--line-subtle, #f8fafc)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <FileText size={15} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                Download PDF
                {justDownloaded === 'pdf' && (
                  <span style={{ color: '#16a34a', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                    <Check size={11} /> Saved
                  </span>
                )}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--muted, #64748b)' }}>Formatted report (.pdf)</div>
            </div>
          </button>

          {/* Option 2: Excel */}
          <button
            type="button"
            role="menuitem"
            onClick={() => handleSelect('excel')}
            disabled={downloadingFormat !== null}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              border: 'none',
              background: 'transparent',
              borderRadius: 6,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.15s',
              color: 'var(--ink, #0f172a)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--line-subtle, #f8fafc)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: 'rgba(22, 163, 74, 0.12)',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Table size={15} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                Download Excel (XL)
                {justDownloaded === 'excel' && (
                  <span style={{ color: '#16a34a', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                    <Check size={11} /> Saved
                  </span>
                )}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--muted, #64748b)' }}>Spreadsheet workbook (.xlsx)</div>
            </div>
          </button>

          {/* Option 3: CSV */}
          <button
            type="button"
            role="menuitem"
            onClick={() => handleSelect('csv')}
            disabled={downloadingFormat !== null}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              border: 'none',
              background: 'transparent',
              borderRadius: 6,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.15s',
              color: 'var(--ink, #0f172a)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--line-subtle, #f8fafc)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: 'rgba(2, 132, 199, 0.12)',
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <FileCode size={15} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                Download CSV
                {justDownloaded === 'csv' && (
                  <span style={{ color: '#16a34a', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                    <Check size={11} /> Saved
                  </span>
                )}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--muted, #64748b)' }}>Comma-separated values (.csv)</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
