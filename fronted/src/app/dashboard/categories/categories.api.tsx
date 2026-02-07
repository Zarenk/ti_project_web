import { getAuthHeaders } from "@/utils/auth-token";

export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

async function authorizedFetch(url: string, init: RequestInit = {}) {
  const auth = await getAuthHeaders();
  const headers = new Headers(init.headers ?? {});

  for (const [key, value] of Object.entries(auth)) {
    if (value != null && value !== "") {
      headers.set(key, value);
    }
  }

  return fetch(url, { ...init, headers });
}

async function publicFetch(url: string, init: RequestInit = {}) {
  const auth = await getAuthHeaders();
  const headers = new Headers(init.headers ?? {});

  for (const [key, value] of Object.entries(auth)) {
    if (value != null && value !== "") {
      headers.set(key, value);
    }
  }

  return fetch(url, { ...init, headers });
}

export async function createCategory(categoryData: any) {
  const res = await authorizedFetch(`${BACKEND_URL}/api/category`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(categoryData),
  });

  if (!res.ok) {
    let errorData: any = null;
    try {
      errorData = await res.json();
    } catch {
      /* ignore */
    }
    throw { response: { status: res.status, data: errorData } };
  }

  return res.json();
}

export async function createCategoryDefault() {
  try {
    const response = await authorizedFetch(`${BACKEND_URL}/api/categories/verify-or-create-default`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error('Error al verificar o crear la categoria "Sin categoria".');
    }

    const defaultCategory = await response.json();
    console.log("Categoria predeterminada:", defaultCategory);
  } catch (error) {
    console.error("Error al verificar o crear la categoria predeterminada:", error);
  }
}

export async function getCategories() {
  try {
    const response = await authorizedFetch(`${BACKEND_URL}/api/category`, {
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn("No se encontraron categorias.");
        return [];
      }

      throw new Error(`Error al obtener categorias: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error al obtener categorias:", error);
    return [];
  }
}

export async function getCategory(id: string) {
  const data = await authorizedFetch(`${BACKEND_URL}/api/category/${id}`, {
    cache: "no-store",
  });

  const json = await data.json();

  const formattedProduct = {
    ...json,
    createAt: new Date(json.createdAt),
  };

  console.log("Categoria formateada:", formattedProduct);
  return formattedProduct;
}

export async function verifyCategories(categories: { name: string }[]) {
  try {
    const response = await authorizedFetch(`${BACKEND_URL}/api/category/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(categories),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Error al verificar categorias");
    }

    return await response.json();
  } catch (error) {
    console.error("Error en verifyCategories:", error);
    throw error;
  }
}

export async function deleteCategory(id: string) {
  const res = await authorizedFetch(`${BACKEND_URL}/api/category/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Error al eliminar la categoria.");
  }

  return res.json();
}

export async function deleteCategories(ids: string[]) {
  const res = await authorizedFetch(`${BACKEND_URL}/api/category/`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ids }),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Error eliminando categorias.");
  }
}

export async function updateCategory(id: string, newCategory: any) {
  const res = await authorizedFetch(`${BACKEND_URL}/api/category/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(newCategory),
    cache: "no-store",
  });

  if (!res.ok) {
    let errorData: any = null;
    try {
      errorData = await res.json();
    } catch {
      /* ignore */
    }
    throw { response: { status: res.status, data: errorData } };
  }

  return res.json();
}

export async function getCategoriesWithCount() {
  try {
    const response = await authorizedFetch(`${BACKEND_URL}/api/category/with-count`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("Error al obtener las categorias con conteo");
    }
    return await response.json();
  } catch (error) {
    console.error("Error al obtener las categorias con conteo:", error);
    return [];
  }
}

export async function getPublicCategoriesWithCount() {
  try {
    const response = await publicFetch(`${BACKEND_URL}/api/public/category/with-count`, {
      cache: "no-store",
    });
    if (!response.ok) {
      if (response.status === 400) {
        return [];
      }
      throw new Error("Error al obtener las categorias con conteo");
    }
    return await response.json();
  } catch (error) {
    console.error("Error al obtener las categorias con conteo:", error);
    return [];
  }
}
