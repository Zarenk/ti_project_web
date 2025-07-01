export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export async function createProvider(providerData: any){
    const res = await fetch(`${BACKEND_URL}/api/providers`,{
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',         
        },
        body: JSON.stringify(providerData)
    }) 

    if (!res.ok) {
        const errorData = await res.json();
        throw { response: { status: res.status, data: errorData } }; // Lanza un error con la estructura esperada
    }

    return await res.json(); // Devuelve el proveedor creado
}

export async function getProviders(){
    const data = await fetch(`${BACKEND_URL}/api/providers`, {
        'cache': 'no-store',
    });
    return data.json()
}

export async function getProvider(id: string){
    const data = await fetch(`${BACKEND_URL}/api/providers/${id}`, {
        'cache': 'no-store',
    });

    const json = await data.json();

    // Convierte `createdAt` a un objeto `Date`
    const formattedStore = {
        ...json,
        createAt: new Date(json.createdAt), // Convierte la fecha
    };

    console.log("Proveedor formateado:", formattedStore);
    return formattedStore;

    //return data.json()
}

export async function checkProviderExists(documentNumber: string): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/providers/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ documentNumber }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Error al verificar el proveedor.");
    }

    const data = await response.json();
    return data.exists; // Devuelve `true` si el proveedor existe, `false` si no
  } catch (error) {
    console.error("Error en checkProviderExists:", error);
    throw error;
  }
}

export async function deleteProvider(id: string){
    const res = await fetch(`${BACKEND_URL}/api/providers/${id}`, {
        method: 'DELETE',
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Error al eliminar el proveedor.");
    }
    
    return res.json()
}

export async function deleteProviders(ids: string[]) {
    const res = await fetch(`${BACKEND_URL}/api/providers/`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids }),
    });
    
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Error eliminando proveedores.");
    }
}

export async function updateProvider(id: string, newStore: any){
    const res = await fetch(`${BACKEND_URL}/api/providers/${id}`, {
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

export async function updateManyProviders(providers: any[]) {
    console.log("Enviando tiendas al backend para actualización masiva:", providers); // Log para depuración
  
    try {
      const response = await fetch(`${BACKEND_URL}/api/providers`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(providers), // Enviar el array de productos al backend
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error al actualizar proveedores:", errorData);
        throw { response: { status: response.status, data: errorData } }; // Lanza un error con la estructura esperada
      }
  
      const data = await response.json();
      console.log("Respuesta del backend:", data);
      return data; // Devuelve la respuesta del backend
    } catch (error) {
      console.error("Error en updateManyProviders:", error);
      throw error; // Lanza el error para que pueda ser manejado en el frontend
    }
}