import { BACKEND_URL } from "@/lib/utils"
import { authFetch, UnauthenticatedError } from "@/utils/auth-fetch"

// Crear una nueva entrada
export async function createEntry(data: {
  storeId: number;
  userId: number;
  providerId: number;
  date: Date;
  description?: string;
  tipoMoneda?: string;
  tipoCambioId?: number;
  paymentMethod?: string;
  paymentTerm?: 'CASH' | 'CREDIT';
  details: { productId: number; quantity: number; price: number; priceInSoles: number; series?: string[] }[];
  invoice?: { serie: string; nroCorrelativo: string; tipoComprobante: string; tipoMoneda: string; total: number; fechaEmision: Date; };
  guide?: {
    serie?: string;
    correlativo?: string;
    fechaEmision?: string;
    fechaEntregaTransportista?: string;
    motivoTraslado?: string;
    puntoPartida?: string;
    puntoLlegada?: string;
    destinatario?: string;
    pesoBrutoUnidad?: string;
    pesoBrutoTotal?: string;
    transportista?: string;
  };
  referenceId?: string;
}) {
    try{
      const response = await authFetch(`${BACKEND_URL}/api/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
    
      if (!response.ok) {
        const errorData = await response.json();
        console.error("[createEntry] Validation errors:", JSON.stringify(errorData, null, 2));
        const msg = Array.isArray(errorData.message)
          ? errorData.message.join(', ')
          : errorData.message || 'Error al crear la entrada';
        throw new Error(msg);
      }
    
      return await response.json();
    }catch (error) {
      console.error("Error al crear la entrada:", error); 
      throw error;
    }
}

// Obtener todas las entradas
export async function getAllEntries() {
  try{
    const response = await authFetch(`${BACKEND_URL}/api/entries`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Error al obtener las entradas');
    }

    return await response.json();
  }catch(error) {
    if (error instanceof UnauthenticatedError) {
      return [];
    }
    console.error("Error al obtener las entradas:", error); 
    throw error;
  } 
}

// Obtener una entrada específica por ID
export async function getEntryById(id: string) {
  try {
    const response = await authFetch(`${BACKEND_URL}/api/entries/by-id/${id}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Error al obtener la entrada');
    }

    return await response.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return null;
    }
    throw error;
  }
}

// Eliminar Entrada
export async function deleteEntry(id: number) {
  const response = await authFetch(`${BACKEND_URL}/api/entries/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Error al eliminar la entrada');
  }

  return await response.json();
}

// Eliminar múltiples entradas
export async function deleteEntries(ids: number[]) {
  try {
    const response = await authFetch(`${BACKEND_URL}/api/entries`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids }), // Asegúrate de enviar los IDs en un objeto con la clave "ids"
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al eliminar las entradas');
    }

    return await response.json();
  } catch (error) {
    console.error('Error al eliminar las entradas:', error);
    throw error;
  }
}

// PDF EXTRAER TEXTO
export type ProcessPDFResult = { text: string; ocr?: boolean }

export async function processPDF(file: File): Promise<ProcessPDFResult> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await authFetch(`${BACKEND_URL}/api/entries/process-pdf`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Error al procesar el archivo PDF');
    }

    const data = await response.json();
    console.log('Texto extraído del PDF:', data.text);
    return { text: data.text, ocr: data.ocr ?? false };

  } catch (error) {
    console.error('Error al procesar el archivo PDF:', error);
    throw error;
  }
}
//

// Subir un PDF a una entrada existente
export async function uploadPdf(entryId: number, pdfFile: File): Promise<void> {
  const formData = new FormData();
  formData.append('file', pdfFile);

  try {
    const response = await authFetch(`${BACKEND_URL}/api/entries/${entryId}/upload-pdf`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al subir el archivo PDF');
    }

    console.log('PDF subido correctamente.');
  } catch (error) {
    console.error('Error al subir el archivo PDF:', error);
    throw error;
  }
}
//

// Obtener la URL del PDF
export function getPdfUrl(pdfPath: string): string {
  return `${BACKEND_URL}${pdfPath}`;
}
//

// Subir un PDF GUIA a una entrada existente
export async function uploadGuiaPdf(entryId: number, pdfFile: File): Promise<void> {
  const formData = new FormData();
  formData.append('file', pdfFile);

  try {
    const response = await authFetch(`${BACKEND_URL}/api/entries/${entryId}/upload-pdf-guia`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al subir el archivo PDF');
    }

    console.log('PDF subido correctamente.');
  } catch (error) {
    console.error('Error al subir el archivo PDF:', error);
    throw error;
  }
}
//

// Obtener la URL de la GUIA PDF
export function getPdfGuiaUrl(pdfPath: string): string {
  return `${BACKEND_URL}${pdfPath}`;
}
//

export async function uploadDraftGuiaPdf(pdfFile: File): Promise<{ draftId: string; url: string }> {
  const formData = new FormData();
  formData.append('file', pdfFile);

  try {
    const response = await authFetch(`${BACKEND_URL}/api/entries/draft/upload-pdf-guia`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al subir el archivo PDF');
    }

    return await response.json();
  } catch (error) {
    console.error('Error al subir el borrador de la guía PDF:', error);
    throw error;
  }
}

export async function attachDraftGuiaPdf(entryId: number, draftId: string): Promise<void> {
  try {
    const response = await authFetch(`${BACKEND_URL}/api/entries/${entryId}/attach-draft-pdf-guia`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ draftId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al adjuntar el borrador de guía');
    }
  } catch (error) {
    console.error('Error al adjuntar el borrador de guía PDF:', error);
    throw error;
  }
}

export async function uploadDraftPdf(pdfFile: File): Promise<{ draftId: string; url: string }> {
  const formData = new FormData();
  formData.append('file', pdfFile);

  try {
    const response = await authFetch(`${BACKEND_URL}/api/entries/draft/upload-pdf`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al subir el archivo PDF');
    }

    return await response.json();
  } catch (error) {
    console.error('Error al subir el borrador del PDF:', error);
    throw error;
  }
}

export async function attachDraftPdf(entryId: number, draftId: string): Promise<void> {
  try {
    const response = await authFetch(`${BACKEND_URL}/api/entries/${entryId}/attach-draft-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ draftId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al adjuntar el borrador PDF');
    }
  } catch (error) {
    console.error('Error al adjuntar el borrador PDF:', error);
    throw error;
  }
}

export interface InvoiceExtractionLog {
  id: number;
  level: string;
  message: string;
  context?: Record<string, unknown> | null;
  createdAt: string;
}

export interface ExtractionResultPayload {
  textPreview?: string;
  templateId?: number;
  templateVersion?: number;
  fields?: Record<string, string | null>;
  score?: number;
  manualAssignment?: boolean;
}

export interface InvoiceSample {
  id: number;
  extractionStatus: string;
  createdAt: string;
  originalFilename: string;
  storagePath: string;
  invoiceTemplateId?: number | null;
  extractionResult?: ExtractionResultPayload | null;
  logs?: InvoiceExtractionLog[];
}

export interface InvoiceTemplateSummary {
  id: number;
  documentType: string;
  providerName?: string | null;
  version: number;
}

export async function getInvoiceSamples(
  entryId: number,
  includeLogs = false,
): Promise<InvoiceSample[]> {
  try {
    const response = await authFetch(
      `${BACKEND_URL}/api/invoice-samples/entry/${entryId}?includeLogs=${includeLogs}`,
      { method: 'GET' },
    );

    if (!response.ok) {
      throw new Error('Error al obtener las muestras de facturas');
    }

    return await response.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return [];
    }
    console.error('Error al obtener las muestras de facturas:', error);
    throw error;
  }
}
//

export async function getInvoiceTemplates(): Promise<
  InvoiceTemplateSummary[]
> {
  try {
    const response = await authFetch(`${BACKEND_URL}/api/invoice-templates`, {
      method: 'GET',
    });
    if (!response.ok) {
      throw new Error('Error al obtener las plantillas');
    }
    return await response.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return [];
    }
    console.error('Error al obtener las plantillas:', error);
    throw error;
  }
}

export async function assignInvoiceTemplate(
  sampleId: number,
  templateId: number,
  reprocess = true,
) {
  const response = await authFetch(
    `${BACKEND_URL}/api/invoice-samples/${sampleId}/template`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ templateId, reprocess }),
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.message || 'Error al asignar la plantilla manualmente',
    );
  }

  return response.json();
}
//

// Verificar si una serie ya existe
export const checkSeries = async (serial: string): Promise<{ exists: boolean }> => {
  try {
    const response = await authFetch(`${BACKEND_URL}/api/series/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ serial }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || 'Error al verificar la serie.');
    }

    return (await response.json()) as { exists: boolean };
  } catch (error: any) {
    if (error instanceof UnauthenticatedError) {
      return { exists: false };
    }
    console.error('Error al verificar la serie:', error);
    throw error;
  }
};
//

// Verificar múltiples series de una vez
export const batchCheckSeries = async (
  serials: string[],
): Promise<{ serial: string; exists: boolean }[]> => {
  if (!serials.length) return []

  try {
    const response = await authFetch(`${BACKEND_URL}/api/series/batch-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serials }),
    })

    if (!response.ok) {
      throw new Error('Error al verificar series en lote.')
    }

    return (await response.json()) as { serial: string; exists: boolean }[]
  } catch (error: any) {
    if (error instanceof UnauthenticatedError) {
      return serials.map((serial) => ({ serial, exists: false }))
    }
    console.error('Error al verificar series en lote:', error)
    throw error
  }
}

// ── Draft System API ──

export async function createDraftEntry(data: Parameters<typeof createEntry>[0]) {
  try {
    const response = await authFetch(`${BACKEND_URL}/api/entries/draft/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const msg = Array.isArray(errorData.message)
        ? errorData.message.join(', ')
        : errorData.message || 'Error al crear el borrador';
      throw new Error(msg);
    }

    return await response.json();
  } catch (error) {
    console.error('Error al crear el borrador:', error);
    throw error;
  }
}

export async function updateDraftEntry(id: number, data: Parameters<typeof createEntry>[0]) {
  try {
    const response = await authFetch(`${BACKEND_URL}/api/entries/draft/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const msg = Array.isArray(errorData.message)
        ? errorData.message.join(', ')
        : errorData.message || 'Error al actualizar el borrador';
      throw new Error(msg);
    }

    return await response.json();
  } catch (error) {
    console.error('Error al actualizar el borrador:', error);
    throw error;
  }
}

export async function postDraftEntry(id: number) {
  try {
    const response = await authFetch(`${BACKEND_URL}/api/entries/draft/${id}/post`, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorData = await response.json();
      const msg = Array.isArray(errorData.message)
        ? errorData.message.join(', ')
        : errorData.message || 'Error al confirmar el borrador';
      throw new Error(msg);
    }

    return await response.json();
  } catch (error) {
    console.error('Error al confirmar el borrador:', error);
    throw error;
  }
}

export async function cancelEntry(id: number) {
  try {
    const response = await authFetch(`${BACKEND_URL}/api/entries/${id}/cancel`, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorData = await response.json();
      const msg = Array.isArray(errorData.message)
        ? errorData.message.join(', ')
        : errorData.message || 'Error al anular la entrada';
      throw new Error(msg);
    }

    return await response.json();
  } catch (error) {
    console.error('Error al anular la entrada:', error);
    throw error;
  }
}

export async function getRecentEntries(limit = 5) {
  try {
    const res = await authFetch(`${BACKEND_URL}/api/entries/recent?limit=${limit}`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      if (res.status === 401) {
        return [];
      }

      let message = 'Error al obtener los últimos ingresos';
      try {
        message = await res.text();
      } catch {
        /* ignore */
      }
      throw new Error(message);
    }

    return res.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return [];
    }
    throw error;
  }
}

// ── Document Search API ──

export interface EntryDocument {
  id: number;
  date: string;
  createdAt: string;
  pdfUrl: string | null;
  guiaUrl: string | null;
  tipoMoneda: string | null;
  description: string | null;
  provider: { id: number; name: string } | null;
  store: { id: number; name: string } | null;
  invoice: {
    serie: string;
    nroCorrelativo: string;
    tipoComprobante: string | null;
    total: number | null;
    fechaEmision: string | null;
  } | null;
}

export interface EntryDocumentsResponse {
  items: EntryDocument[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getEntryDocuments(params: {
  search?: string;
  type?: 'invoice' | 'guide' | 'all';
  providerId?: number;
  storeId?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}): Promise<EntryDocumentsResponse> {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.type && params.type !== 'all') qs.set('type', params.type);
  if (params.providerId) qs.set('providerId', String(params.providerId));
  if (params.storeId) qs.set('storeId', String(params.storeId));
  if (params.dateFrom) qs.set('dateFrom', params.dateFrom);
  if (params.dateTo) qs.set('dateTo', params.dateTo);
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));

  const response = await authFetch(
    `${BACKEND_URL}/api/entries/documents${qs.toString() ? `?${qs}` : ''}`,
    { method: 'GET' },
  );

  if (!response.ok) {
    throw new Error('Error al buscar documentos');
  }

  return response.json();
}

/**
 * Build a PDF URL that works in both local and production.
 * In production, uses the Next.js proxy at /api/entries/pdf/...
 * Locally, links directly to the backend.
 */
export function getDocumentPdfUrl(pdfPath: string): string {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    return `/api/entries/pdf${pdfPath}`;
  }
  return `${BACKEND_URL}${pdfPath}`;
}
