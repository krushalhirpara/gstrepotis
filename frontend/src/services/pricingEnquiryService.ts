import { apiFetch } from './api';

export interface PricingEnquiryPayload {
  first_name: string;
  last_name: string;
  contact_number: string;
  email: string;
  message: string;
  selected_plan: string;
}

export interface PricingEnquiryRecord {
  id: number;
  first_name: string;
  last_name: string;
  full_name?: string;
  contact_number: string;
  email: string;
  message: string;
  selected_plan: string;
  status: 'new' | 'contacted' | 'in_discussion' | 'converted' | 'closed';
  created_at: string;
  updated_at: string;
}

export interface PricingEnquiryMetrics {
  total: number;
  new: number;
  contacted: number;
  in_discussion: number;
  converted: number;
  closed: number;
  plans: {
    free_trial: number;
    professional: number;
    business: number;
    enterprise: number;
  };
}

export interface PricingEnquiryListResponse {
  status: string;
  data: PricingEnquiryRecord[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    has_more: boolean;
  };
  metrics: PricingEnquiryMetrics;
}

/**
 * Submit public pricing plan sales enquiry
 */
export async function submitPricingEnquiry(payload: PricingEnquiryPayload): Promise<{
  status: string;
  success: boolean;
  message: string;
  data?: { id: number; name?: string; selected_plan: string };
  errors?: Record<string, string[]>;
}> {
  const response = await apiFetch('/api/pricing-enquiries', {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuth: true,
  });

  const data = await response.json();
  if (!response.ok) {
    throw data;
  }
  return data;
}

/**
 * Admin: Get paginated list of pricing enquiries with filters & metrics
 */
export async function getPricingEnquiries(params: {
  search?: string;
  status?: string;
  plan?: string;
  sort?: string;
  page?: number;
  per_page?: number;
} = {}): Promise<PricingEnquiryListResponse> {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.status && params.status !== 'all') query.append('status', params.status);
  if (params.plan && params.plan !== 'all') query.append('plan', params.plan);
  if (params.sort) query.append('sort', params.sort);
  if (params.page) query.append('page', params.page.toString());
  if (params.per_page) query.append('per_page', params.per_page.toString());

  const response = await apiFetch(`/api/admin/pricing-enquiries?${query.toString()}`, {
    method: 'GET',
  });

  const data = await response.json();
  if (!response.ok) {
    throw data;
  }
  return data;
}

/**
 * Admin: Get specific pricing enquiry details
 */
export async function getPricingEnquiry(id: number): Promise<{
  status: string;
  data: PricingEnquiryRecord;
}> {
  const response = await apiFetch(`/api/admin/pricing-enquiries/${id}`, {
    method: 'GET',
  });

  const data = await response.json();
  if (!response.ok) {
    throw data;
  }
  return data;
}

/**
 * Admin: Update enquiry status
 */
export async function updatePricingEnquiryStatus(
  id: number,
  status: 'new' | 'contacted' | 'in_discussion' | 'converted' | 'closed'
): Promise<{
  status: string;
  message: string;
  data: { id: number; status: string; updated_at: string };
}> {
  const response = await apiFetch(`/api/admin/pricing-enquiries/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw data;
  }
  return data;
}

/**
 * Admin: Delete enquiry
 */
export async function deletePricingEnquiry(id: number): Promise<{
  status: string;
  message: string;
}> {
  const response = await apiFetch(`/api/admin/pricing-enquiries/${id}`, {
    method: 'DELETE',
  });

  const data = await response.json();
  if (!response.ok) {
    throw data;
  }
  return data;
}
