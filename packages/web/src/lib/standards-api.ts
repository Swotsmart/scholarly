/**
 * Standards Compliance API Client
 * Handles all API interactions for standards compliance monitoring
 */

import type {
  ComplianceFramework,
  ComplianceAudit,
  AuditRequirement,
} from '@/types/standards';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// =============================================================================
// DEMO DATA
// =============================================================================

const demoFrameworks: ComplianceFramework[] = [
  {
    id: 'fw-1',
    name: 'Higher Education Standards',
    abbreviation: 'HES',
    version: '2021.2',
    complianceScore: 92,
    totalRequirements: 49,
    metRequirements: 45,
    lastAudit: '2024-01-15',
    status: 'compliant',
  },
  {
    id: 'fw-2',
    name: 'Australian Curriculum',
    abbreviation: 'ACARA',
    version: '9.0',
    complianceScore: 88,
    totalRequirements: 177,
    metRequirements: 156,
    lastAudit: '2024-01-10',
    status: 'compliant',
  },
  {
    id: 'fw-3',
    name: 'Security Standards for Schools',
    abbreviation: 'ST4S',
    version: '3.1',
    complianceScore: 95,
    totalRequirements: 40,
    metRequirements: 38,
    lastAudit: '2024-01-18',
    status: 'compliant',
  },
  {
    id: 'fw-4',
    name: 'Australian Institute for Teaching and School Leadership',
    abbreviation: 'AITSL',
    version: '2.0',
    complianceScore: 78,
    totalRequirements: 32,
    metRequirements: 25,
    lastAudit: '2024-01-08',
    status: 'partial',
  },
  {
    id: 'fw-5',
    name: 'AI Ethics in Schools Framework',
    abbreviation: 'AI Ethics',
    version: '1.0',
    complianceScore: 85,
    totalRequirements: 20,
    metRequirements: 17,
    lastAudit: '2024-01-12',
    status: 'compliant',
  },
];

const demoAudits: ComplianceAudit[] = [
  {
    id: 'audit-1',
    frameworkId: 'fw-1',
    frameworkName: 'HES',
    auditor: 'Dr. Sarah Mitchell',
    date: '2024-01-15',
    status: 'passed',
    findings: 4,
    criticalFindings: 0,
    requirements: [
      { id: 'req-1', code: 'HES-1.1', description: 'Student governance and accountability', status: 'pass', evidence: 'Policy document v3.2' },
      { id: 'req-2', code: 'HES-1.2', description: 'Academic integrity framework', status: 'pass', evidence: 'Framework published Aug 2023' },
      { id: 'req-3', code: 'HES-1.3', description: 'Student complaints and appeals', status: 'partial', evidence: 'Under review' },
      { id: 'req-4', code: 'HES-2.1', description: 'Learning environment standards', status: 'pass', evidence: 'Annual review completed' },
    ],
  },
  {
    id: 'audit-2',
    frameworkId: 'fw-2',
    frameworkName: 'ACARA',
    auditor: 'Prof. James O\'Brien',
    date: '2024-01-10',
    status: 'passed',
    findings: 21,
    criticalFindings: 2,
    requirements: [
      { id: 'req-5', code: 'ACARA-ENG-7', description: 'Year 7 English curriculum alignment', status: 'pass', evidence: 'Curriculum mapping complete' },
      { id: 'req-6', code: 'ACARA-MATH-10', description: 'Year 10 Mathematics alignment', status: 'fail', evidence: 'Gap identified in statistics module' },
      { id: 'req-7', code: 'ACARA-SCI-9', description: 'Year 9 Science alignment', status: 'pass', evidence: 'Lab requirements verified' },
      { id: 'req-8', code: 'ACARA-DT-11', description: 'Year 11 Design & Technology alignment', status: 'pass', evidence: 'Alignment review Jan 2024' },
    ],
  },
  {
    id: 'audit-3',
    frameworkId: 'fw-3',
    frameworkName: 'ST4S',
    auditor: 'Michael Chen',
    date: '2024-01-18',
    status: 'passed',
    findings: 2,
    criticalFindings: 0,
    requirements: [
      { id: 'req-9', code: 'ST4S-SEC-01', description: 'Data encryption at rest', status: 'pass', evidence: 'AES-256 verified' },
      { id: 'req-10', code: 'ST4S-SEC-02', description: 'Data encryption in transit', status: 'pass', evidence: 'TLS 1.3 enforced' },
      { id: 'req-11', code: 'ST4S-ACC-01', description: 'Multi-factor authentication', status: 'pass', evidence: 'MFA enabled school-wide' },
      { id: 'req-12', code: 'ST4S-PRI-01', description: 'Student data privacy controls', status: 'partial', evidence: 'Minor policy update needed' },
    ],
  },
  {
    id: 'audit-4',
    frameworkId: 'fw-4',
    frameworkName: 'AITSL',
    auditor: 'Dr. Karen Williams',
    date: '2024-01-08',
    status: 'in-progress',
    findings: 7,
    criticalFindings: 1,
    requirements: [
      { id: 'req-13', code: 'AITSL-1.1', description: 'Professional knowledge standards', status: 'pass', evidence: 'PD records submitted' },
      { id: 'req-14', code: 'AITSL-2.1', description: 'Professional practice standards', status: 'partial', evidence: 'Observation records incomplete' },
      { id: 'req-15', code: 'AITSL-3.1', description: 'Professional engagement standards', status: 'fail', evidence: 'Community engagement lacking' },
      { id: 'req-16', code: 'AITSL-4.1', description: 'Technology integration standards', status: 'pass', evidence: 'Digital literacy verified' },
    ],
  },
  {
    id: 'audit-5',
    frameworkId: 'fw-5',
    frameworkName: 'AI Ethics',
    auditor: 'Dr. Lisa Park',
    date: '2024-01-12',
    status: 'passed',
    findings: 3,
    criticalFindings: 0,
    requirements: [
      { id: 'req-17', code: 'AIE-01', description: 'Transparency in AI decision-making', status: 'pass', evidence: 'Explainability framework deployed' },
      { id: 'req-18', code: 'AIE-02', description: 'Bias detection and mitigation', status: 'partial', evidence: 'Quarterly reviews in place' },
      { id: 'req-19', code: 'AIE-03', description: 'Student consent and data usage', status: 'pass', evidence: 'Consent forms updated' },
      { id: 'req-20', code: 'AIE-04', description: 'Human oversight requirements', status: 'pass', evidence: 'Teacher review mandatory' },
    ],
  },
  {
    id: 'audit-6',
    frameworkId: 'fw-1',
    frameworkName: 'HES',
    auditor: 'Dr. Sarah Mitchell',
    date: '2023-10-20',
    status: 'passed',
    findings: 6,
    criticalFindings: 1,
    requirements: [],
  },
  {
    id: 'audit-7',
    frameworkId: 'fw-2',
    frameworkName: 'ACARA',
    auditor: 'Prof. James O\'Brien',
    date: '2023-09-15',
    status: 'failed',
    findings: 31,
    criticalFindings: 5,
    requirements: [],
  },
  {
    id: 'audit-8',
    frameworkId: 'fw-4',
    frameworkName: 'AITSL',
    auditor: 'Dr. Karen Williams',
    date: '2023-08-05',
    status: 'failed',
    findings: 12,
    criticalFindings: 3,
    requirements: [],
  },
];

// =============================================================================
// API FUNCTIONS
// =============================================================================

export async function getFrameworks(): Promise<ComplianceFramework[]> {
  if (DEMO_MODE) return demoFrameworks;

  const res = await fetch(`${API_BASE}/standards/frameworks`);
  if (!res.ok) throw new Error('Failed to fetch frameworks');
  return res.json();
}

export async function getAudits(): Promise<ComplianceAudit[]> {
  if (DEMO_MODE) return demoAudits;

  const res = await fetch(`${API_BASE}/standards/audits`);
  if (!res.ok) throw new Error('Failed to fetch audits');
  return res.json();
}

export async function getAuditById(id: string): Promise<ComplianceAudit | undefined> {
  if (DEMO_MODE) return demoAudits.find((a) => a.id === id);

  const res = await fetch(`${API_BASE}/standards/audits/${id}`);
  if (!res.ok) throw new Error('Failed to fetch audit');
  return res.json();
}

export async function scheduleAudit(frameworkId: string, date: string): Promise<ComplianceAudit> {
  if (DEMO_MODE) {
    const framework = demoFrameworks.find((f) => f.id === frameworkId);
    return {
      id: `audit-new-${Date.now()}`,
      frameworkId,
      frameworkName: framework?.abbreviation || 'Unknown',
      auditor: 'TBD',
      date,
      status: 'in-progress',
      findings: 0,
      criticalFindings: 0,
      requirements: [],
    };
  }

  const res = await fetch(`${API_BASE}/standards/audits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ frameworkId, date }),
  });
  if (!res.ok) throw new Error('Failed to schedule audit');
  return res.json();
}
