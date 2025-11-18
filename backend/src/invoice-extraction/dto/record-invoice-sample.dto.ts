export interface RecordInvoiceSampleDto {
  entryId?: number | null;
  invoiceTemplateId?: number | null;
  originalFilename: string;
  storagePath: string;
  mimeType?: string | null;
  fileSize?: number | null;
  sha256: string;
}

export interface ExtractionResultPayload {
  status?: string;
  data?: Record<string, any> | null;
}
