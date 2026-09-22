import { apiFetch, getApiUrl } from './api';

export interface GstAudit {
  id: number;
  user_id: number;
  client_id: number;
  gstin: string;
  financial_year: string;
  assessment_year?: string | null;
  audit_name: string;
  status: 'draft' | 'data_pending' | 'processing' | 'review_required' | 'in_progress' | 'completed';
  data_quality_score: number;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  client?: {
    id: number;
    trade_name: string;
    party_name: string;
    gstin: string;
    pan?: string;
    state?: string;
    filing_frequency?: string;
  };
}

export interface GstAuditMetrics {
  total_clients: number;
  active_audits: number;
  completed_audits: number;
  pending_data: number;
  critical_exceptions: number;
  warning_exceptions: number;
  reconciled_records: number;
  unreconciled_records: number;
}

export interface GstAuditFile {
  id: number;
  audit_id: number;
  category: 'gstr1' | 'gstr2b' | 'gstr3b' | 'gstr9' | 'sales_register' | 'purchase_register' | 'general_ledger' | 'e_way_bill' | 'other';
  file_type: string;
  original_filename: string;
  file_size: number;
  status: 'uploaded' | 'processing' | 'parsed' | 'failed';
  records_count: number;
  error_message?: string | null;
  created_at: string;
}

export interface GstAuditReconciliation {
  id: number;
  audit_id: number;
  recon_type: 'gstr1_vs_books' | 'gstr2b_vs_purchase' | 'gstr1_vs_gstr3b';
  source_record_id?: number | null;
  target_record_id?: number | null;
  match_status: 'Matched' | 'Partial Match' | 'Mismatch' | 'Missing in Source' | 'Missing in Target' | 'Missing in 2B' | 'Missing in Books' | 'Amount Mismatch' | 'Duplicate' | 'Review Required';
  match_type?: string | null;
  difference_taxable: number;
  difference_igst: number;
  difference_cgst: number;
  difference_sgst: number;
  difference_cess: number;
  confidence: number;
  reason?: string | null;
  ca_action?: string | null;
  ca_remarks?: string | null;
  source_record?: {
    id: number;
    record_type: string;
    invoice_number: string;
    invoice_date?: string;
    counterparty_gstin?: string;
    counterparty_name?: string;
    taxable_value: number;
    igst: number;
    cgst: number;
    sgst: number;
    cess: number;
    total_value: number;
    source: string;
  };
  target_record?: {
    id: number;
    record_type: string;
    invoice_number: string;
    invoice_date?: string;
    counterparty_gstin?: string;
    counterparty_name?: string;
    taxable_value: number;
    igst: number;
    cgst: number;
    sgst: number;
    cess: number;
    total_value: number;
    source: string;
  };
}

export interface GstAuditException {
  id: number;
  audit_id: number;
  rule_code: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
  status: 'Open' | 'Under Review' | 'Resolved' | 'Ignored' | 'Needs Client Clarification';
  description: string;
  source: string;
  record_reference?: string | null;
  financial_impact: number;
  ca_remark?: string | null;
  action_taken?: string | null;
  created_at: string;
}

export interface GstAuditChecklistItem {
  id: number;
  audit_id: number;
  category: string;
  item_code: string;
  description: string;
  status: 'Pending' | 'Completed' | 'Not Applicable' | 'Needs Review';
  ca_remarks?: string | null;
}

export interface GstAuditWorkingPaper {
  id: number;
  audit_id: number;
  user_id: number;
  section: string;
  title: string;
  observation?: string | null;
  explanation?: string | null;
  management_response?: string | null;
  conclusion?: string | null;
  follow_up_action?: string | null;
  reviewer_notes?: string | null;
  created_at: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface GstAuditSummaryReport {
  audit: {
    id: number;
    audit_name: string;
    status: string;
    financial_year: string;
    data_quality_score: number;
    started_at?: string;
    completed_at?: string;
    created_at: string;
  };
  client: {
    trade_name: string;
    party_name: string;
    gstin: string;
    pan?: string;
    state?: string;
    filing_frequency?: string;
  };
  outward_supplies: {
    books_taxable: number;
    books_tax: number;
    books_total: number;
    gstr1_taxable: number;
    gstr1_tax: number;
    taxable_difference: number;
    tax_difference: number;
  };
  inward_supplies: {
    purchase_taxable: number;
    purchase_tax: number;
    gstr2b_taxable: number;
    gstr2b_tax: number;
    taxable_difference: number;
    tax_difference: number;
  };
  reconciliations: {
    gstr1_vs_books: {
      total: number;
      matched: number;
      mismatch: number;
      missing_in_portal: number;
      missing_in_books: number;
    };
    gstr2b_vs_purchase: {
      total: number;
      matched: number;
      mismatch: number;
      missing_in_2b: number;
      missing_in_books: number;
    };
  };
  exceptions: {
    total: number;
    open: number;
    resolved: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    total_financial_impact: number;
  };
  exception_items: Array<{
    rule_code: string;
    severity: string;
    description: string;
    source: string;
    record_reference?: string;
    financial_impact: number;
    status: string;
    ca_remark?: string;
  }>;
  checklist: {
    total_items: number;
    completed_items: number;
    percentage: number;
  };
  working_papers: {
    total_papers: number;
  };
  disclaimer: string;
}

export const gstAuditService = {
  /**
   * List audits with search, filters & dashboard metrics
   */
  async getAudits(params?: {
    search?: string;
    status?: string;
    financial_year?: string;
    page?: number;
    per_page?: number;
  }): Promise<{
    data: GstAudit[];
    total: number;
    current_page: number;
    last_page: number;
    metrics: GstAuditMetrics;
  }> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (params?.financial_year) query.append('financial_year', params.financial_year);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.per_page) query.append('per_page', params.per_page.toString());

    const res = await apiFetch(`api/gst-audits?${query.toString()}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch audits: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * Create new audit entity
   */
  async createAudit(data: {
    client_id: number;
    financial_year: string;
    assessment_year?: string;
    audit_name?: string;
  }): Promise<{ status: string; message: string; data: GstAudit }> {
    const res = await apiFetch('api/gst-audits', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.message || 'Failed to create audit.');
    }
    return result;
  },

  /**
   * Get single audit workspace details
   */
  async getAudit(id: number | string): Promise<{
    status: string;
    data: GstAudit;
    counts: {
      files: number;
      records: number;
      reconciliations: number;
      exceptions: number;
      open_exceptions: number;
      working_papers: number;
    };
  }> {
    const res = await apiFetch(`api/gst-audits/${id}`);
    if (!res.ok) {
      throw new Error('Audit workspace not found or access denied.');
    }
    return res.json();
  },

  /**
   * Update audit details/status
   */
  async updateAudit(
    id: number | string,
    data: { audit_name?: string; status?: string; assessment_year?: string }
  ): Promise<{ status: string; message: string; data: GstAudit }> {
    const res = await apiFetch(`api/gst-audits/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.message || 'Failed to update audit.');
    }
    return result;
  },

  /**
   * Delete audit workspace
   */
  async deleteAudit(id: number | string): Promise<{ status: string; message: string }> {
    const res = await apiFetch(`api/gst-audits/${id}`, {
      method: 'DELETE',
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.message || 'Failed to delete audit.');
    }
    return result;
  },

  /**
   * Upload file to audit data center
   */
  async uploadFile(
    id: number | string,
    file: File,
    category: string
  ): Promise<{ status: string; message: string; data: GstAuditFile }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    const res = await apiFetch(`api/gst-audits/${id}/files`, {
      method: 'POST',
      body: formData,
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.message || 'File upload and processing failed.');
    }
    return result;
  },

  /**
   * List files for audit
   */
  async getFiles(id: number | string): Promise<{ status: string; data: GstAuditFile[] }> {
    const res = await apiFetch(`api/gst-audits/${id}/files`);
    if (!res.ok) throw new Error('Failed to load audit files.');
    return res.json();
  },

  /**
   * Delete uploaded file
   */
  async deleteFile(id: number | string, fileId: number | string): Promise<{ status: string; message: string }> {
    const res = await apiFetch(`api/gst-audits/${id}/files/${fileId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete file.');
    return res.json();
  },

  /**
   * Trigger complete reconciliation and audit rule processing
   */
  async processAudit(id: number | string): Promise<{
    status: string;
    message: string;
    summary: {
      data_quality: {
        score: number;
        total_records: number;
        errors_count: number;
        warnings_count: number;
        checks: Record<string, number>;
      };
      reconciliations: Record<string, unknown>;
      exceptions: {
        total_exceptions_generated: number;
        critical: number;
        high: number;
        medium: number;
        low: number;
        info: number;
      };
    };
  }> {
    const res = await apiFetch(`api/gst-audits/${id}/process`, {
      method: 'POST',
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.message || 'Audit processing failed.');
    }
    return result;
  },

  /**
   * Get audit summary report data
   */
  async getSummary(id: number | string): Promise<{ status: string; data: GstAuditSummaryReport }> {
    const res = await apiFetch(`api/gst-audits/${id}/summary`);
    if (!res.ok) throw new Error('Failed to load audit summary.');
    return res.json();
  },

  /**
   * Get reconciliation items
   */
  async getReconciliations(
    id: number | string,
    params?: { recon_type?: string; match_status?: string; search?: string; page?: number; per_page?: number }
  ): Promise<{
    data: GstAuditReconciliation[];
    total: number;
    current_page: number;
    last_page: number;
  }> {
    const query = new URLSearchParams();
    if (params?.recon_type) query.append('recon_type', params.recon_type);
    if (params?.match_status) query.append('match_status', params.match_status);
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.per_page) query.append('per_page', params.per_page.toString());

    const res = await apiFetch(`api/gst-audits/${id}/reconciliation?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch reconciliation records.');
    return res.json();
  },

  /**
   * Get ITC Analysis metrics
   */
  async getItcAnalysis(id: number | string): Promise<{
    status: string;
    data: {
      books_itc: number;
      gstr2b_itc: number;
      matched_itc: number;
      missing_in_2b_itc: number;
      unclaimed_2b_itc: number;
      difference: number;
      records_count: {
        purchases: number;
        gstr2b: number;
        matched: number;
        missing_in_2b: number;
        missing_in_books: number;
        mismatch: number;
      };
    };
  }> {
    const res = await apiFetch(`api/gst-audits/${id}/itc`);
    if (!res.ok) throw new Error('Failed to fetch ITC analysis.');
    return res.json();
  },

  /**
   * Get audit exceptions with filters
   */
  async getExceptions(
    id: number | string,
    params?: { severity?: string; status?: string; rule_code?: string; source?: string; search?: string; page?: number; per_page?: number }
  ): Promise<{
    data: GstAuditException[];
    total: number;
    current_page: number;
    last_page: number;
    summary: {
      total: number;
      open: number;
      under_review: number;
      resolved: number;
      ignored: number;
      critical: number;
      high: number;
      medium: number;
      low: number;
      total_financial_impact: number;
    };
  }> {
    const query = new URLSearchParams();
    if (params?.severity) query.append('severity', params.severity);
    if (params?.status) query.append('status', params.status);
    if (params?.rule_code) query.append('rule_code', params.rule_code);
    if (params?.source) query.append('source', params.source);
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.per_page) query.append('per_page', params.per_page.toString());

    const res = await apiFetch(`api/gst-audits/${id}/exceptions?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch exceptions.');
    return res.json();
  },

  /**
   * Update single exception (CA Remark & Status)
   */
  async updateException(
    id: number | string,
    exceptionId: number | string,
    data: { status?: string; ca_remark?: string; action_taken?: string }
  ): Promise<{ status: string; message: string; data: GstAuditException }> {
    const res = await apiFetch(`api/gst-audits/${id}/exceptions/${exceptionId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to update exception.');
    return result;
  },

  /**
   * Bulk update exceptions
   */
  async bulkUpdateExceptions(
    id: number | string,
    data: { exception_ids: number[]; status?: string; ca_remark?: string; action_taken?: string }
  ): Promise<{ status: string; message: string }> {
    const res = await apiFetch(`api/gst-audits/${id}/exceptions/bulk`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Bulk update failed.');
    return result;
  },

  /**
   * Get 15-category checklist
   */
  async getChecklist(id: number | string): Promise<{ status: string; data: GstAuditChecklistItem[] }> {
    const res = await apiFetch(`api/gst-audits/${id}/checklist`);
    if (!res.ok) throw new Error('Failed to fetch checklist.');
    return res.json();
  },

  /**
   * Update checklist item
   */
  async updateChecklistItem(
    id: number | string,
    itemId: number | string,
    data: { status?: string; ca_remarks?: string }
  ): Promise<{ status: string; message: string; data: GstAuditChecklistItem }> {
    const res = await apiFetch(`api/gst-audits/${id}/checklist/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to update checklist item.');
    return result;
  },

  /**
   * Get CA Working Papers
   */
  async getWorkingPapers(id: number | string): Promise<{ status: string; data: GstAuditWorkingPaper[] }> {
    const res = await apiFetch(`api/gst-audits/${id}/working-papers`);
    if (!res.ok) throw new Error('Failed to fetch working papers.');
    return res.json();
  },

  /**
   * Create working paper entry
   */
  async createWorkingPaper(
    id: number | string,
    data: {
      section: string;
      title: string;
      observation?: string;
      explanation?: string;
      management_response?: string;
      conclusion?: string;
      follow_up_action?: string;
      reviewer_notes?: string;
    }
  ): Promise<{ status: string; message: string; data: GstAuditWorkingPaper }> {
    const res = await apiFetch(`api/gst-audits/${id}/working-papers`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to create working paper.');
    return result;
  },

  /**
   * Delete working paper
   */
  async deleteWorkingPaper(id: number | string, wpId: number | string): Promise<{ status: string; message: string }> {
    const res = await apiFetch(`api/gst-audits/${id}/working-papers/${wpId}`, {
      method: 'DELETE',
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to delete working paper.');
    return result;
  },

  /**
   * Trigger CSV Export download
   */
  downloadCsvUrl(id: number | string): string {
    return getApiUrl(`api/gst-audits/${id}/export/csv`);
  },
};
