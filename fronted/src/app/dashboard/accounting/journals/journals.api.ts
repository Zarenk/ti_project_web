import axios from "axios";
import { BACKEND_URL } from "@/lib/utils";
import { getAuthHeaders } from "@/utils/auth-token";

export interface Journal {
  id: string;
  date: string;
  description: string;
  amount: number;
  series?: string[];
}

export async function fetchJournals(): Promise<Journal[]> {
  const headers = await getAuthHeaders();
  const res = await axios.get(`${BACKEND_URL}/api/accounting/journals`, {
    headers,
  });
  const data = res.data as Journal[];
  return data.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export async function createJournal(data: Omit<Journal, "id">) {
  try {
    const headers = await getAuthHeaders();
    const res = await axios.post(`${BACKEND_URL}/api/accounting/journals`, data, { headers });
    return res.data as Journal;
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      throw error.response.data.errors as Record<string, string>;
    }
    throw error;
  }
}

export async function updateJournal(id: string, data: Omit<Journal, "id">) {
  try {
    const headers = await getAuthHeaders();
    const res = await axios.put(`${BACKEND_URL}/api/accounting/journals/${id}`, data, { headers });
    return res.data as Journal;
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      throw error.response.data.errors as Record<string, string>;
    }
    throw error;
  }
}

export async function deleteJournal(id: string) {
   const headers = await getAuthHeaders();
  await axios.delete(`${BACKEND_URL}/api/accounting/journals/${id}`, { headers });
}
