export type ReportType =
  | 'Executive Risk Summary'
  | 'Executive Report'
  | 'District Risk Report'
  | 'Project Risk Report'
  | 'Delay Driver Report'
  | 'Intervention Report';

export function getRecommendedAction(projectName: string): string {
  return `Review ${projectName} using the live backend data and human approval workflow before issuing formal direction.`;
}

export function generateExecutiveReportCSV(): string {
  return "Project Name,Status\nNo verified project data is available; backend data is required for report generation.\n";
}

export function downloadExecutiveReport(): void {
  // No-op until real backend data exists.
}

export function generateGenericReportCSV(): string {
  return "Project Name,Status\nNo verified project data is available; backend data is required for report generation.\n";
}
