export interface ComplianceFramework {
  id: string;
  name: string;
  abbreviation: string;
  version: string;
  complianceScore: number;
  totalRequirements: number;
  metRequirements: number;
  lastAudit: string;
  status: 'compliant' | 'partial' | 'non-compliant';
}

export interface ComplianceAudit {
  id: string;
  frameworkId: string;
  frameworkName: string;
  auditor: string;
  date: string;
  status: 'passed' | 'failed' | 'in-progress';
  findings: number;
  criticalFindings: number;
  requirements: AuditRequirement[];
}

export interface AuditRequirement {
  id: string;
  code: string;
  description: string;
  status: 'pass' | 'fail' | 'partial' | 'not-applicable';
  evidence?: string;
}
