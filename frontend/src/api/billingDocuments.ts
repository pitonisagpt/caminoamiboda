import type {
  BillingDocument,
  BillingDocumentFormData,
  BillingDocumentListItem,
  DocumentStatus,
  DocumentType,
} from "../types";
import { api } from "./index";

export const billingDocumentsApi = {
  list(params?: { status?: DocumentStatus; document_type?: DocumentType; reservation_id?: number }) {
    return api.get<BillingDocumentListItem[]>("/billing-documents", { params });
  },

  get(id: number) {
    return api.get<BillingDocument>(`/billing-documents/${id}`);
  },

  create(data: BillingDocumentFormData & { reservation_id?: number | null }) {
    return api.post<BillingDocument>("/billing-documents", data);
  },

  update(id: number, data: Partial<BillingDocumentFormData> & { status?: DocumentStatus }) {
    return api.put<BillingDocument>(`/billing-documents/${id}`, data);
  },

  delete(id: number) {
    return api.delete(`/billing-documents/${id}`);
  },

  generatePdf(id: number) {
    return api.post<{ document_number: string; pdf_url: string }>(
      `/billing-documents/${id}/generate-pdf`
    );
  },

  async fetchPdfBlob(id: number): Promise<string> {
    const res = await api.get(`/billing-documents/${id}/pdf`, { responseType: "blob" });
    return URL.createObjectURL(res.data as Blob);
  },

  async downloadPdf(id: number, filename: string): Promise<void> {
    const blobUrl = await billingDocumentsApi.fetchPdfBlob(id);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(blobUrl);
  },
};
