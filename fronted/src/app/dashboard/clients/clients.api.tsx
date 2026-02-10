import { authFetch, UnauthenticatedError } from "@/utils/auth-fetch";

export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export async function getClients(){
  try {
    const data = await authFetch(`/clients`, {
      cache: 'no-store',
    });
    return data.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return [];
    }
    throw error;
  }
}

export async function getRegisteredClients(){
  try {
    const data = await authFetch(`/clients/registered`, {
      cache: 'no-store',
    });
    return data.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return [];
    }
    throw error;
  }
}

export async function getClient(id: string){
  let data: Response;
  try {
    data = await authFetch(`/clients/${id}`, {
      cache: 'force-cache',
    });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return null;
    }
    throw error;
  }

  const json = await data.json();

  // Convierte `createdAt` a un objeto `Date`
  const formattedProduct = {
      ...json,
      createAt: new Date(json.createdAt), // Convierte la fecha
  };

  console.log("Cliente formateado:", formattedProduct);
  return formattedProduct;

  //return data.json()
}

export async function createClient(productData: any){
    const res = await authFetch(`/clients`,{
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',         
        },
        body: JSON.stringify(productData)
    }) 

    if (!res.ok) {
        const errorData = await res.json();
        throw { response: { status: res.status, data: errorData } }; // Lanza un error con la estructura esperada
    }

    const data = await res.json();
    console.log(data);
    return data;
}

// Registro de cliente vinculado a un usuario existente. Si el usuario ya tiene
// cliente simplemente se devuelve el registrado.
export async function selfRegisterClient(data: {
  name: string
  userId: number
  type?: string
  typeNumber?: string
  image?: string
}) {
  const res = await authFetch(`/clients/self-register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const errorData = await res.json()
    throw { response: { status: res.status, data: errorData } }
  }

  return res.json()
}

export async function verifyOrCreateClients(clients: { name: string; type: string; typeNumber: string; idUser: number }[]){
  try{
    const res = await authFetch(`/clients/verify-or-create-clients`,{
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',         
      },
      body: JSON.stringify(clients)
    }) 

    if (!res.ok) {
        const errorData = await res.json();
        throw { response: { status: res.status, data: errorData } }; // Lanza un error con la estructura esperada
    }

    const data = await res.json()
    console.log("Respuesta del backend:", data);
    return data; // Asegúrate de que el backend devuelva los productos creados/verificados
  }
  catch(error){
    console.error('Error al verificar o crear productos:', error);
    throw error;
  }
}

export async function checkClientExists(typeNumber: string): Promise<boolean> {
  try {
    const response = await authFetch(`/clients/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ typeNumber }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Error al verificar el cliente.");
    }

    const data = await response.json();
    return data.exists; // Devuelve `true` si el cliente existe, `false` si no
  } catch (error) {
    console.error("Error en checkClientsExists:", error);
    throw error;
  }
}


export async function deleteClient(id: string){
    const res = await authFetch(`/clients/${id}`, {
        method: 'DELETE',
    });
    return res.json()
}

export async function updateClient(id: string, newClient: any){
    const res = await authFetch(`/clients/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(newClient),
        cache: 'no-store',
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw { response: { status: res.status, data: errorData } }; // Lanza un error con la estructura esperada
    }

    return await res.json()
}

export async function updateManyClients(clients: any[]) {
    console.log("Enviando clientes al backend para actualización masiva:", clients); // Log para depuración
  
    try {
      const response = await authFetch(`/clients`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clients),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error al actualizar clientes:", errorData);
        throw { response: { status: response.status, data: errorData } }; // Lanza un error con la estructura esperada
      }
  
      const data = await response.json();
      console.log("Respuesta del backend:", data);
      return data; // Devuelve la respuesta del backend
    } catch (error) {
      console.error("Error en updateManyClients:", error);
      throw error; // Lanza el error para que pueda ser manejado en el frontend
    }
}

export const deleteClients = async (ids: string[]) => {
  console.log("Enviando IDs al backend:", ids); // Verifica los datos enviados al backend

  try {

    // Convertir los IDs a números antes de enviarlos
    const numericIds = ids.map((id) => Number(id))

    const response = await authFetch(`/clients/`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: numericIds }), // Asegúrate de que el backend espera un objeto con `ids`
    });

    if (!response.ok) {
      throw new Error('Error eliminando clientes');
    }

    return await response.json();
  } catch (error) {
    console.error("Error en deleteClients:", error);
    throw error;
  }
};

export async function uploadClientImage(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await authFetch(`/clients/upload-image`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error('Error al subir la imagen');
  }

  return res.json() as Promise<{ url: string }>;
}
