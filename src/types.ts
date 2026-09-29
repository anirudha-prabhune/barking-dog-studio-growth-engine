export type CompanyStatus = 
  | 'NEW'
  | 'RESEARCHING'
  | 'AUDITED'
  | 'QUALIFIED'
  | 'NEEDS_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'NURTURE';

export type OpportunityLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface User {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  company_id: string;
  activity_type: string;
  description: string;
  metadata_json?: string | null;
  created_by: string;
  created_at: string;
}

export interface Evidence {
  id: string;
  company_id: string;
  type: string;
  statement: string;
  source_name: string;
  source_url?: string | null;
  confidence?: number | null;
  captured_at: string;
  created_at: string;
}

export type ScanStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface DetectedTechnology {
  technology: string;
  confidence: number;
  evidence: string;
  source_url: string;
}

export interface WebsitePage {
  id: string;
  scan_id: string;
  url: string;
  final_url?: string | null;
  canonical_url?: string | null;
  status_code?: number | null;
  content_type?: string | null;
  title?: string | null;
  meta_description?: string | null;
  language?: string | null;
  word_count: number;
  depth: number;
  is_internal: boolean;
  is_homepage: boolean;
  is_canonical: boolean;
  discovered_from?: string | null;
  fetched_at: string;
  created_at: string;
  h1?: string | null;
  h2_text?: string | null;
  content_hash?: string | null;
  extracted_text?: string | null;
  html_snapshot?: string | null;
  meta_json?: string | null;
}

export interface WebsiteScan {
  id: string;
  company_id: string;
  target_url: string;
  status: ScanStatus;
  started_at: string;
  completed_at?: string | null;
  duration_ms?: number | null;
  pages_discovered: number;
  pages_fetched: number;
  http_status?: number | null;
  final_url?: string | null;
  error_message?: string | null;
  robots_txt_status?: string | null;
  sitemap_found: boolean;
  agent_run_id?: string | null;
  created_at: string;
  technologies: DetectedTechnology[];
}

export interface PaginatedWebsiteScans {
  items: WebsiteScan[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PaginatedWebsitePages {
  items: WebsitePage[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface Company {
  id: string;
  name: string;
  domain?: string | null;
  website_url: string;
  industry?: string | null;
  sub_industry?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  employee_range?: string | null;
  revenue_range?: string | null;
  description?: string | null;
  linkedin_url?: string | null;
  status: CompanyStatus;
  opportunity_level?: OpportunityLevel | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  activities?: Activity[];
  evidence_items?: Evidence[];
  website_scans?: WebsiteScan[];
}

export interface PaginatedCompanies {
  items: Company[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface DashboardStats {
  total_companies: number;
  new_companies: number;
  opportunities: number;
  needs_review: number;
}

export interface CompanyFormData {
  name: string;
  website_url: string;
  domain?: string;
  industry?: string;
  sub_industry?: string;
  country?: string;
  state?: string;
  city?: string;
  employee_range?: string;
  revenue_range?: string;
  description?: string;
  linkedin_url?: string;
  status?: CompanyStatus;
  opportunity_level?: OpportunityLevel | null;
}
