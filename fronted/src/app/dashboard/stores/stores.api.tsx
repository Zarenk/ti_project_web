import { getAuthHeaders } from "@/utils/auth-token";
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

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


export async function createStore(storeData: any){
    const res = await authorizedFetch(`${BACKEND_URL}/api/stores`,{
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',         
        },
        body: JSON.stringify(storeData)
    }) 

    if (!res.ok) {
        const errorData = await res.json();
        throw { response: { status: res.status, data: errorData } }; // Lanza un error con la estructura esperada
    }

    return await res.json(); // Devuelve la tienda creada
}

export async function getStores(){
    const data = await authorizedFetch(`${BACKEND_URL}/api/stores`, {
        'cache': 'no-store',
    });
    return data.json()
}

export async function getStore(id: string){
    const data = await authorizedFetch(`${BACKEND_URL}/api/stores/${id}`, {
        'cache': 'no-store',
    });

    const json = await data.json();

    // Convierte `createdAt` a un objeto `Date`
    const formattedStore = {
        ...json,
        createAt: new Date(json.createdAt), // Convierte la fecha
    };

    console.log("Tienda formateado:", formattedStore);
    return formattedStore;

    //return data.json()
}

// 
export async function checkStoreExists(name: string): Promise<boolean> {
  try {
    const response = await authorizedFetch(`${BACKEND_URL}/api/stores/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Error al verificar la tienda.");
    }

    const data = await response.json();
    return data.exists; // Devuelve `true` si el proveedor existe, `false` si no
  } catch (error) {
    console.error("Error en checkStoresExists:", error);
    throw error;
  }
}

export async function deleteStore(id: string){
    const res = await authorizedFetch(`${BACKEND_URL}/api/stores/${id}`, {
        method: 'DELETE',
    });
    return res.json()
}

export const deleteStores = async (ids: string[]) => {
    console.log("Enviando IDs al backend:", ids); // Verifica los datos enviados al backend
  
    try {

      // Convertir los IDs a números antes de enviarlos
      const numericIds = ids.map((id) => Number(id))

      const response = await authorizedFetch(`${BACKEND_URL}/api/stores/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: numericIds }), // Asegúrate de que el backend espera un objeto con `ids`
      });
  
      if (!response.ok) {
        throw new Error('Error eliminando tiendas');
      }
  
      return await response.json();
    } catch (error) {
      console.error("Error en deleteStores:", error);
      throw error;
    }
  };

export async function updateStore(id: string, newStore: any){
    const res = await authorizedFetch(`${BACKEND_URL}/api/stores/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(newStore),
        cache: 'no-store',
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw { response: { status: res.status, data: errorData } }; // Lanza un error con la estructura esperada
    }

    return await res.json()
}

export async function updateManyStores(stores: any[]) {
    console.log("Enviando tiendas al backend para actualización masiva:", stores); // Log para depuración
  
    try {
      const response = await authorizedFetch(`${BACKEND_URL}/api/stores`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stores), // Enviar el array de productos al backend
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error al actualizar tiendas:", errorData);
        throw { response: { status: response.status, data: errorData } }; // Lanza un error con la estructura esperada
      }
  
      const data = await response.json();
      console.log("Respuesta del backend:", data);
      return data; // Devuelve la respuesta del backend
    } catch (error) {
      console.error("Error en updateManyStores:", error);
      throw error; // Lanza el error para que pueda ser manejado en el frontend
    }
}