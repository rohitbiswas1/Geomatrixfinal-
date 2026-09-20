/**
 * Universal Client-Side Export Utilities for Geomatrix
 * Supports downloading datasets in:
 * 1. PDF (.pdf) - Native PDF 1.4 binary generation with header, KPIs, and styled tables
 * 2. Excel (.xlsx / .xls) - XML Spreadsheet format with styles, colors, and column definitions
 * 3. CSV (.csv) - UTF-8 formatted CSV with BOM for universal spreadsheet compatibility
 */

// Helper to trigger browser file download
export function triggerDownload(blob: Blob, filename: string): void {
  if (typeof window === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. CSV EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escapeCell = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const headerLine = headers.map(escapeCell).join(',');
  const rowLines = rows.map((r) => r.map(escapeCell).join(','));
  const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. EXCEL (XML Spreadsheet 2003 / .xlsx compatible)
// ─────────────────────────────────────────────────────────────────────────────
export function exportToExcel(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: (string | number)[][],
  title: string = 'Geomatrix Decision Support Report'
): void {
  const sanitize = (str: string | number | null | undefined): string => {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>${sanitize(title)}</Title>
  <Author>Geomatrix AI Platform</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#1e293b"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="TitleStyle">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="16" ss:Bold="1" ss:Color="#0f172a"/>
   <Interior ss:Color="#e2e8f0" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="SubTitleStyle">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="10" ss:Italic="1" ss:Color="#475569"/>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0284c7"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0284c7"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0284c7"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0284c7"/>
   </Borders>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Bold="1" ss:Color="#ffffff"/>
   <Interior ss:Color="#0369a1" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataRowEven">
   <Alignment ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="10"/>
   <Interior ss:Color="#f8fafc" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataRowOdd">
   <Alignment ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="10"/>
   <Interior ss:Color="#ffffff" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="RiskCritical">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#fca5a5"/></Borders>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#991b1b"/>
   <Interior ss:Color="#fee2e2" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="RiskHigh">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#fdba74"/></Borders>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#9a3412"/>
   <Interior ss:Color="#ffedd5" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="RiskMedium">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#fcd34d"/></Borders>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#92400e"/>
   <Interior ss:Color="#fef3c7" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="RiskLow">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#86efac"/></Borders>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#166534"/>
   <Interior ss:Color="#dcfce7" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${sanitize(sheetName.slice(0, 31))}">
  <Table ss:DefaultRowHeight="20">
`;

  const colWidths = headers.map(() => '   <Column ss:AutoFitWidth="1" ss:Width="120"/>').join('\n');

  // Title rows
  const titleRows = `
   <Row ss:Height="28">
    <Cell ss:MergeAcross="${Math.max(0, headers.length - 1)}" ss:StyleID="TitleStyle">
     <Data ss:Type="String">${sanitize(title)}</Data>
    </Cell>
   </Row>
   <Row ss:Height="18">
    <Cell ss:MergeAcross="${Math.max(0, headers.length - 1)}" ss:StyleID="SubTitleStyle">
     <Data ss:Type="String">Generated: ${new Date().toLocaleString('en-IN')} | Ministry of Road Transport &amp; Highways / NHAI</Data>
    </Cell>
   </Row>
   <Row ss:Height="10"/>
`;

  // Header row
  const headerCells = headers
    .map((h) => `    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">${sanitize(h)}</Data></Cell>`)
    .join('\n');
  const headerRow = `   <Row ss:Height="24">\n${headerCells}\n   </Row>\n`;

  // Data rows
  const dataRowsXml = rows
    .map((row, idx) => {
      const baseStyle = idx % 2 === 0 ? 'DataRowEven' : 'DataRowOdd';
      const cells = row
        .map((val) => {
          const sVal = String(val ?? '');
          let style = baseStyle;
          if (sVal === 'Critical') style = 'RiskCritical';
          else if (sVal === 'High') style = 'RiskHigh';
          else if (sVal === 'Medium') style = 'RiskMedium';
          else if (sVal === 'Low') style = 'RiskLow';

          const isNumber = typeof val === 'number' && !isNaN(val);
          const type = isNumber ? 'Number' : 'String';
          return `    <Cell ss:StyleID="${style}"><Data ss:Type="${type}">${sanitize(val)}</Data></Cell>`;
        })
        .join('\n');
      return `   <Row ss:Height="20">\n${cells}\n   </Row>`;
    })
    .join('\n');

  const xmlFooter = `
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <Selected/>
   <FreezePanes/>
   <FrozenNoSplit/>
   <SplitPane>
    <RowNumber>4</RowNumber>
    <PaneNumber>2</PaneNumber>
    <ActivePane>2</ActivePane>
   </SplitPane>
   <ProtectObjects>False</ProtectObjects>
   <ProtectScenarios>False</ProtectScenarios>
  </WorksheetOptions>
 </Worksheet>
</Workbook>`;

  const fullXml = xmlHeader + colWidths + titleRows + headerRow + dataRowsXml + xmlFooter;
  const blob = new Blob([fullXml], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });

  const baseName = filename.replace(/\.(xlsx|xls|csv|pdf)$/i, '');
  triggerDownload(blob, `${baseName}.xls`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. PDF EXPORT (Native Client-Side PDF-1.4 Generator)
// ─────────────────────────────────────────────────────────────────────────────
export interface PDFKpi {
  label: string;
  value: string;
}

export function exportToPDF(
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number)[][],
  filename: string,
  kpis?: PDFKpi[]
): void {
  // Page setup (A4 Landscape for data tables: 842 pt wide, 595 pt high)
  const pageWidth = 842;
  const pageHeight = 595;
  const marginLeft = 36;
  const marginRight = 36;
  const contentWidth = pageWidth - marginLeft - marginRight;

  // Truncate headers and calculate column widths
  const colCount = Math.max(1, headers.length);
  const colWidth = Math.floor(contentWidth / colCount);

  // Helper to escape PDF text strings
  const escapePdfText = (str: string | number | null | undefined): string => {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
  };

  // Helper to truncate text to fit in colWidth roughly
  const fitText = (str: string | number, maxChars: number = Math.floor(colWidth / 5.5)): string => {
    const s = String(str ?? '');
    if (s.length <= maxChars) return s;
    return s.slice(0, Math.max(1, maxChars - 3)) + '...';
  };

  const rowsPerPage = 14;
  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  const pagesData: string[] = [];

  for (let pIdx = 0; pIdx < totalPages; pIdx++) {
    const startRow = pIdx * rowsPerPage;
    const endRow = Math.min(rows.length, startRow + rowsPerPage);
    const sliceRows = rows.slice(startRow, endRow);

    let stream = '';

    // Header Background Bar (Navy / Gov Blue)
    stream += 'q\n';
    stream += '0.05 0.22 0.44 rg\n'; // #0d3870
    stream += `0 ${pageHeight - 54} ${pageWidth} 54 re f\n`;

    // Header Text
    stream += '1 1 1 rg\n';
    stream += 'BT\n';
    stream += '/F1 15 Tf\n';
    stream += `${marginLeft} ${pageHeight - 32} Td\n`;
    stream += `(${escapePdfText(title)}) Tj\n`;
    stream += 'ET\n';

    // Subtitle & Date
    stream += '0.85 0.92 1.0 rg\n';
    stream += 'BT\n';
    stream += '/F2 9 Tf\n';
    stream += `${marginLeft} ${pageHeight - 46} Td\n`;
    stream += `(${escapePdfText(subtitle)} | Generated: ${escapePdfText(new Date().toLocaleDateString('en-IN'))} IST) Tj\n`;
    stream += 'ET\n';
    stream += 'Q\n';

    let curY = pageHeight - 74;

    // First page KPIs if provided
    if (pIdx === 0 && kpis && kpis.length > 0) {
      const kpiCount = Math.min(kpis.length, 5);
      const kpiCardWidth = Math.floor((contentWidth - (kpiCount - 1) * 10) / kpiCount);
      const kpiCardHeight = 44;

      kpis.slice(0, kpiCount).forEach((kpi, kIdx) => {
        const kx = marginLeft + kIdx * (kpiCardWidth + 10);
        // Background
        stream += 'q\n';
        stream += '0.95 0.96 0.98 rg\n';
        stream += `0.85 0.88 0.92 RG\n`;
        stream += '0.75 w\n';
        stream += `${kx} ${curY - kpiCardHeight} ${kpiCardWidth} ${kpiCardHeight} re B\n`;

        // Value
        stream += '0.08 0.15 0.28 rg\n';
        stream += 'BT\n';
        stream += '/F1 12 Tf\n';
        stream += `${kx + 10} ${curY - 20} Td\n`;
        stream += `(${escapePdfText(kpi.value)}) Tj\n`;
        stream += 'ET\n';

        // Label
        stream += '0.35 0.40 0.48 rg\n';
        stream += 'BT\n';
        stream += '/F2 8 Tf\n';
        stream += `${kx + 10} ${curY - 35} Td\n`;
        stream += `(${escapePdfText(fitText(kpi.label, 26))}) Tj\n`;
        stream += 'ET\n';
        stream += 'Q\n';
      });

      curY -= kpiCardHeight + 16;
    }

    // Table Header Row
    const tableHeaderHeight = 24;
    stream += 'q\n';
    stream += '0.12 0.38 0.65 rg\n'; // Header background
    stream += `${marginLeft} ${curY - tableHeaderHeight} ${contentWidth} ${tableHeaderHeight} re f\n`;

    // Table Header Text
    stream += '1 1 1 rg\n';
    headers.forEach((h, hIdx) => {
      const hx = marginLeft + hIdx * colWidth + 6;
      stream += 'BT\n';
      stream += '/F1 8 Tf\n';
      stream += `${hx} ${curY - 16} Td\n`;
      stream += `(${escapePdfText(fitText(h, Math.floor(colWidth / 5.5)))}) Tj\n`;
      stream += 'ET\n';
    });
    stream += 'Q\n';

    curY -= tableHeaderHeight;

    // Table Rows
    const rowHeight = 22;
    sliceRows.forEach((r, rIdx) => {
      const isEven = rIdx % 2 === 0;

      // Row background
      stream += 'q\n';
      if (isEven) {
        stream += '0.98 0.99 1.0 rg\n';
      } else {
        stream += '1 1 1 rg\n';
      }
      stream += `${marginLeft} ${curY - rowHeight} ${contentWidth} ${rowHeight} re f\n`;

      // Bottom border
      stream += '0.88 0.90 0.94 RG\n0.5 w\n';
      stream += `${marginLeft} ${curY - rowHeight} m ${marginLeft + contentWidth} ${curY - rowHeight} l S\n`;

      // Cells
      r.forEach((cellVal, cIdx) => {
        const cx = marginLeft + cIdx * colWidth + 6;
        const valStr = String(cellVal ?? '');

        // Risk badge colors if applicable
        if (valStr === 'Critical') {
          stream += '0.85 0.12 0.12 rg\n';
        } else if (valStr === 'High') {
          stream += '0.90 0.35 0.05 rg\n';
        } else if (valStr === 'Medium') {
          stream += '0.80 0.50 0.05 rg\n';
        } else if (valStr === 'Low') {
          stream += '0.08 0.55 0.25 rg\n';
        } else {
          stream += '0.15 0.20 0.28 rg\n';
        }

        stream += 'BT\n';
        stream += `${valStr === 'Critical' || valStr === 'High' ? '/F1' : '/F2'} 7.5 Tf\n`;
        stream += `${cx} ${curY - 15} Td\n`;
        stream += `(${escapePdfText(fitText(valStr, Math.floor(colWidth / 5.2)))}) Tj\n`;
        stream += 'ET\n';
      });

      stream += 'Q\n';
      curY -= rowHeight;
    });

    // Page Footer
    stream += 'q\n';
    stream += '0.88 0.90 0.94 RG\n0.75 w\n';
    stream += `${marginLeft} 32 m ${marginLeft + contentWidth} 32 l S\n`;
    stream += '0.45 0.50 0.58 rg\n';
    stream += 'BT\n';
    stream += '/F2 8 Tf\n';
    stream += `${marginLeft} 20 Td\n`;
    stream += `(GEOMATRIX AI DSS · Ministry of Road Transport & Highways · Official Decision Support) Tj\n`;
    stream += 'ET\n';

    // Page number on right
    stream += 'BT\n';
    stream += '/F2 8 Tf\n';
    stream += `${pageWidth - marginRight - 60} 20 Td\n`;
    stream += `(Page ${pIdx + 1} of ${totalPages}) Tj\n`;
    stream += 'ET\n';
    stream += 'Q\n';

    pagesData.push(stream);
  }

  // Construct PDF Objects
  const objects: string[] = [];
  const byteOffsets: number[] = [];

  // 1: Catalog
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');

  // 2: Pages container placeholder (updated below)
  objects.push('');

  // 3 & 4: Font descriptors (Helvetica, Helvetica-Bold)
  objects.push(`3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj`);
  objects.push(`4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`);

  // For each page: Page object + Content stream
  pagesData.forEach((streamContent, i) => {
    const pageObjNum = 5 + i * 2;
    const streamObjNum = 6 + i * 2;
    const streamLen = streamContent.length;

    objects.push(
      `${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${streamObjNum} 0 R >>\nendobj`
    );
    objects.push(
      `${streamObjNum} 0 obj\n<< /Length ${streamLen} >>\nstream\n${streamContent}\nendstream\nendobj`
    );
  });

  // Re-index kids correctly in Pages container
  const correctKids = pagesData.map((_, i) => `${5 + i * 2} 0 R`).join(' ');
  objects[1] = `2 0 obj\n<< /Type /Pages /Kids [${correctKids}] /Count ${pagesData.length} >>\nendobj`;

  // Build binary buffer
  let pdfString = '%PDF-1.4\n%âãÏÓ\n';
  objects.forEach((obj) => {
    byteOffsets.push(pdfString.length);
    pdfString += obj + '\n';
  });

  const xrefOffset = pdfString.length;
  pdfString += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  byteOffsets.forEach((offset) => {
    pdfString += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });

  pdfString += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const blob = new Blob([pdfString], { type: 'application/pdf' });
  const finalName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  triggerDownload(blob, finalName);
}
