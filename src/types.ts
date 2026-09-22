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
