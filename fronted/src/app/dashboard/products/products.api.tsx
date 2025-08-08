export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export async function getProducts(){
  const data = await fetch(`${BACKEND_URL}/api/products`, {
      'cache': 'no-store',
  });
  return data.json()
}

export async function getProduct(id: string){
  const data = await fetch(`${BACKEND_URL}/api/products/${id}`, {
      'cache': 'force-cache',
  });

  const json = await data.json();

  // Convierte `createdAt` a un objeto `Date`
  const formattedProduct = {
      ...json,
      createAt: new Date(json.createdAt), // Convierte la fecha
  };

  console.log("Producto formateado:", formattedProduct);
  return formattedProduct;

  //return data.json()
}

export async function createProduct(productData: any){
    const res = await fetch(`${BACKEND_URL}/api/products`,{
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',         
        },
        body: JSON.stringify(productData)
    }) 

    if (!res.ok) {
        let errorData: any = null
        try {
            errorData = await res.json()
        } catch (err) {
            // Si la respuesta no es JSON, mantenemos errorData como null
        }
        const message = errorData?.message || 'Error al crear el producto'
        throw { message, response: { status: res.status, data: errorData } }
    }

    const data = await res.json();
    console.log(data);
    return data; // Asegúrate de que el backend devuelva un objeto con `id`, `name`, y `price`
}

export async function verifyOrCreateProducts(products: { name: string; price: number; description?: string; brand?: string; categoryId?: number }[]){
  try{ 
    const res = await fetch(`${BACKEND_URL}/api/products/verify-or-create-products`,{
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',         
      },
      body: JSON.stringify(products)
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

export async function deleteProduct(id: string){
    const res = await fetch(`${BACKEND_URL}/api/products/${id}`, {
        method: 'DELETE',
    });
    return res.json()
}

export async function updateProduct(id: string, newProduct: any){
    const res = await fetch(`${BACKEND_URL}/api/products/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(newProduct),
        cache: 'no-store',
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw { response: { status: res.status, data: errorData } }; // Lanza un error con la estructura esperada
    }

    return await res.json()
}

export async function updateManyProducts(products: any[]) {
    console.log("Enviando productos al backend para actualización masiva:", products); // Log para depuración
  
    try {
      const response = await fetch(`${BACKEND_URL}/api/products`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(products), // Enviar el array de productos al backend
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error al actualizar productos:", errorData);
        throw { response: { status: response.status, data: errorData } }; // Lanza un error con la estructura esperada
      }
  
      const data = await response.json();
      console.log("Respuesta del backend:", data);
      return data; // Devuelve la respuesta del backend
    } catch (error) {
      console.error("Error en updateManyProducts:", error);
      throw error; // Lanza el error para que pueda ser manejado en el frontend
    }
}

export const deleteProducts = async (ids: string[]) => {
  console.log("Enviando IDs al backend:", ids); // Verifica los datos enviados al backend

  try {

    // Convertir los IDs a números antes de enviarlos
    const numericIds = ids.map((id) => Number(id))

    const response = await fetch(`${BACKEND_URL}/api/products/`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: numericIds }), // Asegúrate de que el backend espera un objeto con `ids`
    });

    if (!response.ok) {
      throw new Error('Error eliminando productos');
    }

    return await response.json();
  } catch (error) {
    console.error("Error en deleteProducts:", error);
    throw error;
  }
};

export async function uploadProductImage(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${BACKEND_URL}/api/products/upload-image`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error('Error al subir la imagen');
  }

  return res.json() as Promise<{ url: string }>;
}