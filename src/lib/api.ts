import { Company, PaginatedCompanies, DashboardStats, CompanyFormData, User } from '../types';

const TOKEN_KEY = 'bdge_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.error?.message || data?.detail?.error?.message || response.statusText || 'An unexpected error occurred';
    const errorCode = data?.error?.code || 'REQUEST_FAILED';
    const error = new Error(errorMsg);
    (error as any).code = errorCode;
    (error as any).status = response.status;
    throw error;
  }

  return data as T;
}

export const api = {
  // Authentication
  async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
    const res = await request<{ access_token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setStoredToken(res.access_token);
    return res;
  },

  async getCurrentUser(): Promise<User> {
    return request<User>('/api/auth/me');
  },

  logout(): void {
    clearStoredToken();
  },

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    return request<DashboardStats>('/api/dashboard/stats');
  },

  async getRecentCompanies(limit: number = 8): Promise<Company[]> {
    return request<Company[]>(`/api/dashboard/recent?limit=${limit}`);
  },

  // Companies
  async getCompanies(params: {
    search?: string;
    industry?: string;
    city?: string;
    status?: string;
    include_archived?: boolean;
    page?: number;
    page_size?: number;
  } = {}): Promise<PaginatedCompanies> {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.industry) query.set('industry', params.industry);
    if (params.city) query.set('city', params.city);
    if (params.status) query.set('status', params.status);
    if (params.include_archived) query.set('include_archived', 'true');
    if (params.page) query.set('page', params.page.toString());
    if (params.page_size) query.set('page_size', params.page_size.toString());

    return request<PaginatedCompanies>(`/api/companies?${query.toString()}`);
  },

  async getCompany(id: string): Promise<Company> {
    return request<Company>(`/api/companies/${id}`);
  },

  async createCompany(data: CompanyFormData): Promise<Company> {
    return request<Company>('/api/companies', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateCompany(id: string, data: Partial<CompanyFormData>): Promise<Company> {
    return request<Company>(`/api/companies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  async archiveCompany(id: string): Promise<Company> {
    return request<Company>(`/api/companies/${id}/archive`, {
      method: 'POST'
    });
  },

  async unarchiveCompany(id: string): Promise<Company> {
    return request<Company>(`/api/companies/${id}/unarchive`, {
      method: 'POST'
    });
  },

  // Development Seed
  async seedDemoData(reset: boolean = false): Promise<{ message: string; newly_inserted: number }> {
    return request<{ message: string; newly_inserted: number }>('/api/seed', {
      method: 'POST',
      body: JSON.stringify({ reset })
    });
  }
};
