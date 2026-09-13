export interface Client {
  id: number;
  user_id: number;
  trade_name: string;
  party_name: string;
  gstin: string;
  pan: string;
  mobile: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  state_code: string | null;
  pincode: string | null;
  filing_frequency: 'monthly' | 'quarterly';
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface ClientListResponse {
  status: string;
  data: Client[];
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
  summary: {
    total_clients: number;
    active_clients: number;
    monthly_filers: number;
    quarterly_filers: number;
  };
}

export interface BulkUploadResponse {
  status: string;
  message: string;
  summary: {
    total_records: number;
    inserted_count: number;
    invalid_count: number;
    duplicate_count: number;
  };
  import_errors?: string[];
}

export const clientService = {
  /**
   * Fetch paginated & filtered client records
   */
  async getClients(params?: {
    search?: string;
    status?: string;
    filing_frequency?: string;
    page?: number;
    per_page?: number;
  }): Promise<ClientListResponse> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (params?.filing_frequency) query.append('filing_frequency', params.filing_frequency);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.per_page) query.append('per_page', params.per_page.toString());

    const token = localStorage.getItem('gst_token');
    const res = await fetch(`/api/clients?${query.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to load client records.' }));
      throw new Error(err.message || 'Failed to load client records.');
    }

    return res.json();
  },

  /**
   * Fetch single client details
   */
  async getClient(id: number): Promise<Client> {
    const token = localStorage.getItem('gst_token');
    const res = await fetch(`/api/clients/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Client not found or access denied.' }));
      throw new Error(err.message || 'Client not found or access denied.');
    }

    const json = await res.json();
    return json.data;
  },

  /**
   * Create a new client
   */
  async createClient(data: Partial<Client>): Promise<Client> {
    const token = localStorage.getItem('gst_token');
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) {
      throw json;
    }

    return json.data;
  },

  /**
   * Update an existing client
   */
  async updateClient(id: number, data: Partial<Client>): Promise<Client> {
    const token = localStorage.getItem('gst_token');
    const res = await fetch(`/api/clients/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) {
      throw json;
    }

    return json.data;
  },

  /**
   * Delete (Soft Delete) a client
   */
  async deleteClient(id: number): Promise<void> {
    const token = localStorage.getItem('gst_token');
    const res = await fetch(`/api/clients/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to delete client.' }));
      throw new Error(err.message || 'Failed to delete client.');
    }
  },

  /**
   * Bulk upload clients via CSV / TXT / Excel
   */
  async bulkUploadClients(file: File): Promise<BulkUploadResponse> {
    const token = localStorage.getItem('gst_token');
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/clients/bulk-upload', {
      method: 'POST',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: formData,
    });

    const json = await res.json();
    if (!res.ok) {
      throw json;
    }

    return json;
  },
};
