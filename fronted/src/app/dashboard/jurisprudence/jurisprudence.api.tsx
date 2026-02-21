import { BACKEND_URL } from "@/lib/utils";
import { authFetch, UnauthenticatedError } from "@/utils/auth-fetch";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface JurisprudenceDocument {
  id: number;
  organizationId: number;
  companyId: number;
  title: string;
  court: string;
  chamber?: string;
  expediente: string;
  year: number;
  publishDate: string;
  sourceType: "SCRAPED" | "MANUAL" | "IMPORTED";
  sourceUrl?: string;
  pdfPath: string;
  fileName?: string;
  fileSize?: number;
  fileHash: string;
  processingStatus:
    | "PENDING"
    | "DOWNLOADING"
    | "EXTRACTING"
    | "OCR_REQUIRED"
    | "OCR_IN_PROGRESS"
    | "EMBEDDING"
    | "COMPLETED"
    | "COMPLETED_WITH_WARNINGS"
    | "FAILED"
    | "MANUAL_REQUIRED";
  processedAt?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Source {
  sourceId: string;
  documentId: number;
  title: string;
  court: string;
  expediente: string;
  year: number;
  section: string;
  pageNumbers: number[];
  excerpt: string;
  similarity: number;
  citedInAnswer: boolean;
}

export interface JurisprudenceQuery {
  id: number;
  organizationId: number;
  companyId: number;
  userId: number;
  legalMatterId?: number;
  query: string;
  answer: string;
  confidence: "ALTA" | "MEDIA" | "BAJA" | "NO_CONCLUYENTE";
  hasValidCitations: boolean;
  needsHumanReview: boolean;
  documentsUsed: Source[];
  userFeedback?: {
    helpful?: boolean;
    citationsCorrect?: boolean;
    notes?: string;
  };
  tokensUsed: number;
  costUsd: number;
  responseTime: number;
  createdAt: string;
  user?: {
    id: number;
    username: string;
    email: string;
  };
  legalMatter?: {
    id: number;
    title: string;
    internalCode: string;
  };
}

export interface JurisprudenceStats {
  totalDocuments: number;
  pending: number;
  completed: number;
  failed: number;
  totalQueries: number;
}

export interface RagResponse {
  answer: string;
  confidence: "ALTA" | "MEDIA" | "BAJA" | "NO_CONCLUYENTE";
  sources: Source[];
  metadata: {
    queryType: string;
    filters: {
      organizationId: number;
      companyId: number;
      courts?: string[];
      minYear?: number;
      areas?: string[];
    };
    needsHumanReview: boolean;
  };
  tokensUsed: number;
  costUsd: number;
  responseTime: number;
}

export interface CoverageStats {
  totalDocuments: number;
  withText: number;
  withTextPercentage: number;
  withoutText: number;
  withoutTextPercentage: number;
  withEmbeddings: number;
  withEmbeddingsPercentage: number;
  withoutEmbeddings: number;
  withoutEmbeddingsPercentage: number;
  failed: number;
  failedPercentage: number;
  byYear: Record<string, any>;
  byCourt: Record<string, any>;
}

// ============================================================================
// DOCUMENT MANAGEMENT
// ============================================================================

export async function getJurisprudenceDocuments(filters?: {
  page?: number;
  limit?: number;
  court?: string;
  year?: number;
  status?: string;
}): Promise<{ documents: JurisprudenceDocument[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  try {
    const params = new URLSearchParams();
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.limit) params.set("limit", String(filters.limit));
    if (filters?.court) params.set("court", filters.court);
    if (filters?.year) params.set("year", String(filters.year));
    if (filters?.status) params.set("status", filters.status);

    const qs = params.toString();
    const url = `${BACKEND_URL}/jurisprudence-documents${qs ? `?${qs}` : ""}`;

    const res = await authFetch(url, { cache: "no-store" });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error?.message || "Error al obtener documentos");
    }
    const data = await res.json();
    return {
      documents: data.success ? data.documents : [],
      pagination: data.success ? data.pagination : { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return {
        documents: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };
    }
    throw error;
  }
}

export async function getJurisprudenceDocument(id: number): Promise<JurisprudenceDocument | null> {
  try {
    const res = await authFetch(`${BACKEND_URL}/jurisprudence-documents/${id}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      if (res.status === 404) return null;
      const error = await res.json().catch(() => ({}));
      throw new Error(error?.message || "Error al obtener documento");
    }
    const data = await res.json();
    return data.success ? data.document : null;
  } catch (error) {
    if (error instanceof UnauthenticatedError) return null;
    throw error;
  }
}

export async function uploadJurisprudenceDocument(formData: FormData): Promise<JurisprudenceDocument> {
  const res = await authFetch(`${BACKEND_URL}/jurisprudence-documents/upload`, {
    method: "POST",
    body: formData,
    // No Content-Type header - browser sets multipart/form-data automatically
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.message || "Error al subir documento");
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || "Error al subir documento");
  }
  return data.document;
}

export async function deleteJurisprudenceDocument(id: number): Promise<void> {
  const res = await authFetch(`${BACKEND_URL}/jurisprudence-documents/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.message || "Error al eliminar documento");
  }
}

export async function processJurisprudenceDocument(id: number): Promise<void> {
  const res = await authFetch(`${BACKEND_URL}/jurisprudence-documents/${id}/process`, {
    method: "POST",
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.message || "Error al procesar documento");
  }
}

// ============================================================================
// ASSISTANT (RAG)
// ============================================================================

export async function queryJurisprudence(
  query: string,
  options?: {
    legalMatterId?: number;
    courts?: string[];
    minYear?: number;
    areas?: string[];
  }
): Promise<RagResponse> {
  const res = await authFetch(`${BACKEND_URL}/jurisprudence-assistant/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      legalMatterId: options?.legalMatterId,
      courts: options?.courts,
      minYear: options?.minYear,
      areas: options?.areas,
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.message || "Error al consultar jurisprudencia");
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || "Error al consultar jurisprudencia");
  }

  return {
    answer: data.answer,
    confidence: data.confidence,
    sources: data.sources,
    metadata: data.metadata,
    tokensUsed: data.tokensUsed,
    costUsd: data.costUsd,
    responseTime: data.responseTime,
  };
}

export async function getQueryHistory(
  legalMatterId?: number,
  limit?: number
): Promise<JurisprudenceQuery[]> {
  try {
    const params = new URLSearchParams();
    if (legalMatterId) params.set("legalMatterId", String(legalMatterId));
    if (limit) params.set("limit", String(limit));

    const qs = params.toString();
    const url = `${BACKEND_URL}/jurisprudence-assistant/queries${qs ? `?${qs}` : ""}`;

    const res = await authFetch(url, { cache: "no-store" });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error?.message || "Error al obtener historial");
    }

    const data = await res.json();
    return data.success ? data.queries : [];
  } catch (error) {
    if (error instanceof UnauthenticatedError) return [];
    throw error;
  }
}

export async function updateQueryFeedback(
  queryId: number,
  feedback: {
    helpful?: boolean;
    citationsCorrect?: boolean;
    notes?: string;
  }
): Promise<void> {
  const res = await authFetch(
    `${BACKEND_URL}/jurisprudence-assistant/queries/${queryId}/feedback`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(feedback),
    }
  );

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.message || "Error al actualizar feedback");
  }
}

// ============================================================================
// ADMIN / STATS
// ============================================================================

export async function getJurisprudenceStats(): Promise<JurisprudenceStats> {
  try {
    const res = await authFetch(`${BACKEND_URL}/jurisprudence-admin/stats/queries`, {
      cache: "no-store",
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error?.message || "Error al obtener estadísticas");
    }

    const data = await res.json();
    return {
      totalDocuments: 0, // This endpoint doesn't provide this, we'll get it from coverage
      pending: 0,
      completed: 0,
      failed: 0,
      totalQueries: data.success ? data.stats.totalQueries : 0,
    };
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return { totalDocuments: 0, pending: 0, completed: 0, failed: 0, totalQueries: 0 };
    }
    throw error;
  }
}

export async function getCoverageStats(): Promise<CoverageStats> {
  try {
    const res = await authFetch(`${BACKEND_URL}/jurisprudence-admin/coverage`, {
      cache: "no-store",
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error?.message || "Error al obtener estadísticas de cobertura");
    }

    const data = await res.json();
    return data.success ? data.coverage : {
      totalDocuments: 0,
      withText: 0,
      withTextPercentage: 0,
      withoutText: 0,
      withoutTextPercentage: 0,
      withEmbeddings: 0,
      withEmbeddingsPercentage: 0,
      withoutEmbeddings: 0,
      withoutEmbeddingsPercentage: 0,
      failed: 0,
      failedPercentage: 0,
      byYear: {},
      byCourt: {},
    };
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return {
        totalDocuments: 0,
        withText: 0,
        withTextPercentage: 0,
        withoutText: 0,
        withoutTextPercentage: 0,
        withEmbeddings: 0,
        withEmbeddingsPercentage: 0,
        withoutEmbeddings: 0,
        withoutEmbeddingsPercentage: 0,
        failed: 0,
        failedPercentage: 0,
        byYear: {},
        byCourt: {},
      };
    }
    throw error;
  }
}

export async function getSystemHealth(): Promise<any> {
  try {
    const res = await authFetch(`${BACKEND_URL}/jurisprudence-admin/health`, {
      cache: "no-store",
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error?.message || "Error al obtener estado del sistema");
    }

    const data = await res.json();
    return data.success ? data : { health: "UNKNOWN", documents: {}, queries: {} };
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return { health: "UNKNOWN", documents: {}, queries: {} };
    }
    throw error;
  }
}
