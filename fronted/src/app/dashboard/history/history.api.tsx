import { authFetch, UnauthenticatedError } from '@/utils/auth-fetch';

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

async function parseJsonResponse<T>(
  res: Response,
  fallback: T,
): Promise<T> {
  const body = await res.text();
  if (!body) return fallback;
  try {
    return JSON.parse(body) as T;
  } catch {
    return fallback;
  }
}

async function authFetchOrNull(input: RequestInfo | URL, init: RequestInit = {}) {
  try {
    return await authFetch(input, init)
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return null
    }
    throw error
  }
}


export async function getUserHistory(userId: number) {
  const res = await authFetchOrNull(
    `${BACKEND_URL}/api/inventory/history/users/${userId}`,
    {
      credentials: 'include',
    },
  );
  if (!res.ok) {
    throw new Error('Error al obtener el historial del usuario');
  }
  return parseJsonResponse(res, []);
}

export async function getUserActivity(userId: number) {
  const res = await authFetchOrNull(
    `${BACKEND_URL}/api/activity/users/${userId}`,
    {
      credentials: 'include',
    },
  );
  if (!res.ok) {
    throw new Error('Error al obtener la actividad del usuario');
  }
  return parseJsonResponse(res, []);
}

export async function getOrganizationHistory() {
  const res = await authFetchOrNull(
    `${BACKEND_URL}/api/inventory/history`,
    {
      credentials: 'include',
    },
  );
  if (!res.ok) {
    throw new Error('Error al obtener el historial de la organizacion');
  }
  return parseJsonResponse(res, []);
}

export async function getOrganizationActivity(params?: {
  q?: string;
  action?: string;
  entityType?: string;
  severity?: string;
  dateFrom?: string;
  dateTo?: string;
  excludeContextUpdates?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: string;
}) {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.action) search.set("action", params.action);
  if (params?.entityType) search.set("entityType", params.entityType);
  if (params?.severity) search.set("severity", params.severity);
  if (params?.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params?.dateTo) search.set("dateTo", params.dateTo);
  if (params?.excludeContextUpdates) search.set("excludeContextUpdates", "true");
  if (params?.page) search.set("page", String(params.page));
  if (params?.pageSize) search.set("pageSize", String(params.pageSize));
  if (params?.sortBy) search.set("sortBy", params.sortBy);
  if (params?.sortDir) search.set("sortDir", params.sortDir);

  const res = await authFetchOrNull(
    `${BACKEND_URL}/api/activity/users${search.toString() ? `?${search.toString()}` : ""}`,
    {
      credentials: 'include',
    },
  );

  if (!res) return []
  if (!res.ok) {
    throw new Error('Error al obtener la actividad de la organizacion');
  }

  return parseJsonResponse(res, []);
}

export async function getActivitySummary(params?: {
  dateFrom?: string;
  dateTo?: string;
  excludeContextUpdates?: boolean;
}) {
  const search = new URLSearchParams();
  if (params?.dateFrom) search.set('dateFrom', params.dateFrom);
  if (params?.dateTo) search.set('dateTo', params.dateTo);
  if (params?.excludeContextUpdates) search.set('excludeContextUpdates', 'true');
  const suffix = search.toString();

  const res = await authFetchOrNull(
    `${BACKEND_URL}/api/activity/summary${suffix ? `?${suffix}` : ''}`,
    {
      credentials: 'include',
    },
  );

  if (!res) return []
  if (!res.ok) {
    throw new Error('Error al obtener el resumen de actividad');
  }

  return parseJsonResponse(res, {});
}

export async function getGlobalActivity(params?: {
  page?: number;
  pageSize?: number;
  q?: string;
  actorId?: string;
  entityType?: string;
  action?: string;
  severity?: string;
  dateFrom?: string;
  dateTo?: string;
  excludeContextUpdates?: boolean;
  sortBy?: string;
  sortDir?: string;
}) {
  const search = new URLSearchParams();
  if (params?.page) search.set("page", String(params.page));
  if (params?.pageSize) search.set("pageSize", String(params.pageSize));
  if (params?.q) search.set("q", params.q);
  if (params?.actorId) search.set("actorId", params.actorId);
  if (params?.entityType) search.set("entityType", params.entityType);
  if (params?.action) search.set("action", params.action);
  if (params?.severity) search.set("severity", params.severity);
  if (params?.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params?.dateTo) search.set("dateTo", params.dateTo);
  if (params?.excludeContextUpdates) search.set("excludeContextUpdates", "true");
  if (params?.sortBy) search.set("sortBy", params.sortBy);
  if (params?.sortDir) search.set("sortDir", params.sortDir);

  const res = await authFetchOrNull(
    `${BACKEND_URL}/api/activity${search.toString() ? `?${search.toString()}` : ""}`,
    {
      credentials: "include",
    },
  );

  if (!res) return []
  if (!res.ok) {
    throw new Error("Error al obtener el historial global");
  }

  return parseJsonResponse(res, { items: [], total: 0 });
}

export async function exportGlobalActivity(params?: {
  q?: string;
  actorId?: string;
  entityType?: string;
  action?: string;
  severity?: string;
  dateFrom?: string;
  dateTo?: string;
  excludeContextUpdates?: boolean;
  sortBy?: string;
  sortDir?: string;
}) {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.actorId) search.set("actorId", params.actorId);
  if (params?.entityType) search.set("entityType", params.entityType);
  if (params?.action) search.set("action", params.action);
  if (params?.severity) search.set("severity", params.severity);
  if (params?.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params?.dateTo) search.set("dateTo", params.dateTo);
  if (params?.excludeContextUpdates) search.set("excludeContextUpdates", "true");
  if (params?.sortBy) search.set("sortBy", params.sortBy);
  if (params?.sortDir) search.set("sortDir", params.sortDir);

  const res = await authFetchOrNull(
    `${BACKEND_URL}/api/activity/export${search.toString() ? `?${search.toString()}` : ""}`,
    {
      credentials: "include",
    },
  );

  if (!res) return []
  if (!res.ok) {
    throw new Error("Error al exportar movimientos");
  }

  return res.blob();
}

export async function getActivityTimeSeries(params?: {
  dateFrom?: string;
  dateTo?: string;
  excludeContextUpdates?: boolean;
}) {
  const search = new URLSearchParams();
  if (params?.dateFrom) search.set('dateFrom', params.dateFrom);
  if (params?.dateTo) search.set('dateTo', params.dateTo);
  if (params?.excludeContextUpdates) search.set('excludeContextUpdates', 'true');
  const suffix = search.toString();

  const res = await authFetchOrNull(
    `${BACKEND_URL}/api/activity/timeseries${suffix ? `?${suffix}` : ''}`,
    {
      credentials: 'include',
    },
  );

  if (!res) return []
  if (!res.ok) {
    throw new Error('Error al obtener la serie temporal de actividad');
  }

  return parseJsonResponse(res, []);
}

export async function getActivityActors(params?: {
  dateFrom?: string;
  dateTo?: string;
  excludeContextUpdates?: boolean;
  action?: string;
  entityType?: string;
  severity?: string;
}) {
  const search = new URLSearchParams();
  if (params?.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params?.dateTo) search.set("dateTo", params.dateTo);
  if (params?.excludeContextUpdates) search.set("excludeContextUpdates", "true");
  if (params?.action) search.set("action", params.action);
  if (params?.entityType) search.set("entityType", params.entityType);
  if (params?.severity) search.set("severity", params.severity);

  const res = await authFetchOrNull(
    `${BACKEND_URL}/api/activity/actors${search.toString() ? `?${search.toString()}` : ""}`,
    {
      credentials: "include",
    },
  );

  if (!res) return []
  if (!res.ok) {
    throw new Error("Error al obtener usuarios con movimientos");
  }

  return parseJsonResponse(res, []);
}

export async function getUserActivitySummary(
  userId: number,
  params?: {
    dateFrom?: string;
    dateTo?: string;
    excludeContextUpdates?: boolean;
    severity?: string;
    action?: string;
    entityType?: string;
  },
) {
  const search = new URLSearchParams();
  if (params?.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params?.dateTo) search.set("dateTo", params.dateTo);
  if (params?.excludeContextUpdates) search.set("excludeContextUpdates", "true");
  if (params?.severity) search.set("severity", params.severity);
  if (params?.action) search.set("action", params.action);
  if (params?.entityType) search.set("entityType", params.entityType);

  const res = await authFetchOrNull(
    `${BACKEND_URL}/api/activity/users/${userId}/summary${search.toString() ? `?${search.toString()}` : ""}`,
    {
      credentials: "include",
    },
  );

  if (!res) return {}
  if (!res.ok) {
    throw new Error("Error al obtener el resumen del usuario");
  }

  return parseJsonResponse(res, {});
}

export async function getUserActivityTimeSeries(
  userId: number,
  params?: {
    dateFrom?: string;
    dateTo?: string;
    excludeContextUpdates?: boolean;
    severity?: string;
    action?: string;
    entityType?: string;
  },
) {
  const search = new URLSearchParams();
  if (params?.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params?.dateTo) search.set("dateTo", params.dateTo);
  if (params?.excludeContextUpdates) search.set("excludeContextUpdates", "true");
  if (params?.severity) search.set("severity", params.severity);
  if (params?.action) search.set("action", params.action);
  if (params?.entityType) search.set("entityType", params.entityType);

  const res = await authFetchOrNull(
    `${BACKEND_URL}/api/activity/users/${userId}/timeseries${search.toString() ? `?${search.toString()}` : ""}`,
    {
      credentials: "include",
    },
  );

  if (!res) return []
  if (!res.ok) {
    throw new Error("Error al obtener la serie temporal del usuario");
  }

  return parseJsonResponse(res, []);
}

export async function getUserActivityHeatmap(
  userId: number,
  params?: {
    dateFrom?: string;
    dateTo?: string;
    excludeContextUpdates?: boolean;
    severity?: string;
    action?: string;
    entityType?: string;
  },
) {
  const search = new URLSearchParams();
  if (params?.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params?.dateTo) search.set("dateTo", params.dateTo);
  if (params?.excludeContextUpdates) search.set("excludeContextUpdates", "true");
  if (params?.severity) search.set("severity", params.severity);
  if (params?.action) search.set("action", params.action);
  if (params?.entityType) search.set("entityType", params.entityType);

  const res = await authFetchOrNull(
    `${BACKEND_URL}/api/activity/users/${userId}/heatmap${search.toString() ? `?${search.toString()}` : ""}`,
    {
      credentials: "include",
    },
  );

  if (!res) return []
  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error("Error al obtener el mapa de calor del usuario");
  }

  return parseJsonResponse(res, []);
}

export async function getUserActivityBreakdown(
  userId: number,
  params?: {
    dateFrom?: string;
    dateTo?: string;
    excludeContextUpdates?: boolean;
    severity?: string;
    action?: string;
    entityType?: string;
  },
) {
  const search = new URLSearchParams();
  if (params?.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params?.dateTo) search.set("dateTo", params.dateTo);
  if (params?.excludeContextUpdates) search.set("excludeContextUpdates", "true");
  if (params?.severity) search.set("severity", params.severity);
  if (params?.action) search.set("action", params.action);
  if (params?.entityType) search.set("entityType", params.entityType);

  const res = await authFetchOrNull(
    `${BACKEND_URL}/api/activity/users/${userId}/breakdown${search.toString() ? `?${search.toString()}` : ""}`,
    {
      credentials: "include",
    },
  );

  if (!res) return { actions: [], entities: [] }
  if (!res.ok) {
    throw new Error("Error al obtener el desglose del usuario");
  }

  return parseJsonResponse(res, { actions: [], entities: [] });
}

export async function getUserActivityOptions(
  userId: number,
  params?: {
    dateFrom?: string;
    dateTo?: string;
    excludeContextUpdates?: boolean;
    actionLimit?: number;
    entityLimit?: number;
  },
) {
  const search = new URLSearchParams();
  if (params?.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params?.dateTo) search.set("dateTo", params.dateTo);
  if (params?.excludeContextUpdates) search.set("excludeContextUpdates", "true");
  if (params?.actionLimit) search.set("actionLimit", String(params.actionLimit));
  if (params?.entityLimit) search.set("entityLimit", String(params.entityLimit));

  const res = await authFetchOrNull(
    `${BACKEND_URL}/api/activity/users/${userId}/options${search.toString() ? `?${search.toString()}` : ""}`,
    {
      credentials: "include",
    },
  );

  if (!res) return { actions: [], entities: [] }
  if (!res.ok) {
    throw new Error("Error al obtener opciones de filtros del usuario");
  }

  return parseJsonResponse(res, { actions: [], entities: [] });
}

export async function getOrganizationActivitySummary(params?: {
  dateFrom?: string;
  dateTo?: string;
  excludeContextUpdates?: boolean;
  severity?: string;
  action?: string;
  entityType?: string;
}) {
  const search = new URLSearchParams();
  if (params?.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params?.dateTo) search.set("dateTo", params.dateTo);
  if (params?.excludeContextUpdates) search.set("excludeContextUpdates", "true");
  if (params?.severity) search.set("severity", params.severity);
  if (params?.action) search.set("action", params.action);
  if (params?.entityType) search.set("entityType", params.entityType);

  const res = await authFetchOrNull(
    `${BACKEND_URL}/api/activity/users/summary${search.toString() ? `?${search.toString()}` : ""}`,
    {
      credentials: "include",
    },
  );

  if (!res) return []
  if (!res.ok) {
    throw new Error("Error al obtener el resumen de la organizacion");
  }

  return parseJsonResponse(res, {});
}

export async function getOrganizationActivityTimeSeries(params?: {
  dateFrom?: string;
  dateTo?: string;
  excludeContextUpdates?: boolean;
  severity?: string;
  action?: string;
  entityType?: string;
}) {
  const search = new URLSearchParams();
  if (params?.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params?.dateTo) search.set("dateTo", params.dateTo);
  if (params?.excludeContextUpdates) search.set("excludeContextUpdates", "true");
  if (params?.severity) search.set("severity", params.severity);
  if (params?.action) search.set("action", params.action);
  if (params?.entityType) search.set("entityType", params.entityType);

  const res = await authFetchOrNull(
    `${BACKEND_URL}/api/activity/users/timeseries${search.toString() ? `?${search.toString()}` : ""}`,
    {
      credentials: "include",
    },
  );

  if (!res) return []
  if (!res.ok) {
    throw new Error("Error al obtener la serie temporal de la organizacion");
  }

  return parseJsonResponse(res, []);
}

export async function getOrganizationActivityHeatmap(params?: {
  dateFrom?: string;
  dateTo?: string;
  excludeContextUpdates?: boolean;
  severity?: string;
  action?: string;
  entityType?: string;
}) {
  const search = new URLSearchParams();
  if (params?.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params?.dateTo) search.set("dateTo", params.dateTo);
  if (params?.excludeContextUpdates) search.set("excludeContextUpdates", "true");
  if (params?.severity) search.set("severity", params.severity);
  if (params?.action) search.set("action", params.action);
  if (params?.entityType) search.set("entityType", params.entityType);

  const res = await authFetchOrNull(
    `${BACKEND_URL}/api/activity/users/heatmap${search.toString() ? `?${search.toString()}` : ""}`,
    {
      credentials: "include",
    },
  );

  if (!res) return []
  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error("Error al obtener el mapa de calor de la organizacion");
  }

  return parseJsonResponse(res, []);
}

export async function getOrganizationActivityBreakdown(params?: {
  dateFrom?: string;
  dateTo?: string;
  excludeContextUpdates?: boolean;
  severity?: string;
  action?: string;
  entityType?: string;
}) {
  const search = new URLSearchParams();
  if (params?.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params?.dateTo) search.set("dateTo", params.dateTo);
  if (params?.excludeContextUpdates) search.set("excludeContextUpdates", "true");
  if (params?.severity) search.set("severity", params.severity);
  if (params?.action) search.set("action", params.action);
  if (params?.entityType) search.set("entityType", params.entityType);

  const res = await authFetchOrNull(
    `${BACKEND_URL}/api/activity/users/breakdown${search.toString() ? `?${search.toString()}` : ""}`,
    {
      credentials: "include",
    },
  );

  if (!res) return []
  if (!res.ok) {
    throw new Error("Error al obtener el desglose de la organizacion");
  }

  return parseJsonResponse(res, { actions: [], entities: [] });
}

export async function getOrganizationActivityOptions(params?: {
  dateFrom?: string;
  dateTo?: string;
  excludeContextUpdates?: boolean;
  actionLimit?: number;
  entityLimit?: number;
}) {
  const search = new URLSearchParams();
  if (params?.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params?.dateTo) search.set("dateTo", params.dateTo);
  if (params?.excludeContextUpdates) search.set("excludeContextUpdates", "true");
  if (params?.actionLimit) search.set("actionLimit", String(params.actionLimit));
  if (params?.entityLimit) search.set("entityLimit", String(params.entityLimit));

  const res = await authFetchOrNull(
    `${BACKEND_URL}/api/activity/users/options${search.toString() ? `?${search.toString()}` : ""}`,
    {
      credentials: "include",
    },
  );

  if (!res) return []
  if (!res.ok) {
    throw new Error("Error al obtener opciones de filtros de la organizacion");
  }

  return parseJsonResponse(res, { actions: [], entities: [] });
}

export async function getUserActivityActors(
  params?: {
    q?: string;
    excludeContextUpdates?: boolean;
  },
  signal?: AbortSignal,
) {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.excludeContextUpdates) search.set("excludeContextUpdates", "true");

  const res = await authFetchOrNull(
    `${BACKEND_URL}/api/activity/users/actors${search.toString() ? `?${search.toString()}` : ""}`,
    {
      credentials: "include",
      signal,
    },
  );

  if (!res) return []
  if (!res.ok) {
    throw new Error("Error al obtener usuarios con movimientos");
  }

  return parseJsonResponse(res, []);
}
