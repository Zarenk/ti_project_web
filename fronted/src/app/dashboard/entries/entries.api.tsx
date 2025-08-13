import axios from 'axios';
import { getAuthHeaders } from '@/utils/auth-token';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

// Crear una nueva entrada
export async function createEntry(data: {
  storeId: number;
  userId: number;
  providerId: number;
  date: Date;
  description?: string;
  tipoMoneda?: string;
  tipoCambioId?: number;
  details: { productId: number; quantity: number; price: number; priceInSoles: number }[];
  invoice?: { serie: string; nroCorrelativo: string; comprobante: string; tipoMoneda: string; total: number; fechaEmision: Date; };
}) {
    try{
      const response = await fetch(`${BACKEND_URL}/api/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
    
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear la entrada');
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
    const response = await fetch(`${BACKEND_URL}/api/entries`, {
      method: 'GET',
    });
  
    if (!response.ok) {
      throw new Error('Error al obtener las entradas');
    }
  
    return await response.json();
  }catch(error) {
    console.error("Error al obtener las entradas:", error); 
  } 
}

// Obtener una entrada específica por ID
export async function getEntryById(id: string) {
  const response = await fetch(`${BACKEND_URL}/api/entries/${id}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Error al obtener la entrada');
  }

  return await response.json();
}

// Eliminar Entrada
export async function deleteEntry(id: number) {
  const response = await fetch(`${BACKEND_URL}/api/entries/${id}`, {
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
    const response = await fetch(`${BACKEND_URL}/api/entries`, {
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
export async function processPDF(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${BACKEND_URL}/api/entries/process-pdf`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Error al procesar el archivo PDF');
    }

    const data = await response.json();
    console.log('Texto extraído del PDF:', data.text);
    return data.text; // Devuelve el texto extraído
    
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
    const response = await fetch(`${BACKEND_URL}/api/entries/${entryId}/upload-pdf`, {
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
    const response = await fetch(`${BACKEND_URL}/api/entries/${entryId}/upload-pdf-guia`, {
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

// Verificar si una serie ya existe
export const checkSeries = async (serial: string): Promise<{ exists: boolean }> => {
  try {
    const response = await axios.post(`${BACKEND_URL}/api/series/check`, { serial });
    return response.data; // Retorna { exists: boolean }
  } catch (error: any) {
    console.error('Error al verificar la serie:', error);
    throw new Error(error.response?.data?.message || 'Error al verificar la serie.');
  }
};
//

export async function getRecentEntries(limit = 5) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}/api/entries/recent?limit=${limit}`, {
    cache: 'no-store',
    headers,
    credentials: 'include',
  });
  if (res.status === 401) {
    return [];
  }
  if (!res.ok) {
    let message = 'Error al obtener los últimos ingresos';
    try {
      message = await res.text();
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json();
}