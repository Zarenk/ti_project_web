export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export async function createCategory(categoryData: any){
    const res = await fetch(`${BACKEND_URL}/api/category`,{
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',         
        },
        body: JSON.stringify(categoryData)
    }) 

    if (!res.ok) {
        const errorData = await res.json();
        throw { response: { status: res.status, data: errorData } }; // Lanza un error con la estructura esperada
    }

    return await res.json(); // Asegúrate de que el backend devuelva un objeto con `id`
}

export async function createCategoryDefault(){
    try {
        const response = await fetch(`${BACKEND_URL}/api/categories/verify-or-create-default`, {
          method: 'POST',
        });
  
        if (!response.ok) {
          throw new Error('Error al verificar o crear la categoría "Sin categoría".');
        }
  
        const defaultCategory = await response.json();
        console.log("Categoría predeterminada:", defaultCategory);
      } catch (error) {
        console.error("Error al verificar o crear la categoría predeterminada:", error);
    }
}

export async function getCategories(){
    const data = await fetch(`${BACKEND_URL}/api/category`, {
        'cache': 'no-store',
    });
    return data.json()
}

export async function getCategory(id: string){
    const data = await fetch(`${BACKEND_URL}/api/category/${id}`, {
        'cache': 'no-store',
    });

    const json = await data.json();

    // Convierte `createdAt` a un objeto `Date`
    const formattedProduct = {
        ...json,
        createAt: new Date(json.createdAt), // Convierte la fecha
    };

    console.log("Categoria formateado:", formattedProduct);
    return formattedProduct;

    //return data.json()
}

// Verifica o crea una categoría
export async function verifyCategories(categories: { name: string }[]) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/category/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categories),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al verificar categorías');
      }
  
      return await response.json();
    } catch (error) {
      console.error('Error en verifyCategories:', error);
      throw error;
    }
  }
//

export async function deleteCategory(id: string){
    const res = await fetch(`${BACKEND_URL}/api/category/${id}`, {
        method: 'DELETE',
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Error al eliminar la categoría.");
    }

    return res.json()
}

export async function deleteCategories(ids: string[]) {
    const res = await fetch(`${BACKEND_URL}/api/category/`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids }),
    });
    
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Error eliminando categorias.");
    }
}

export async function updateCategory(id: string, newCategory: any){
    const res = await fetch(`${BACKEND_URL}/api/category/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCategory),
        cache: 'no-store',
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw { response: { status: res.status, data: errorData } }; // Lanza un error con la estructura esperada
    }

    return await res.json()
}