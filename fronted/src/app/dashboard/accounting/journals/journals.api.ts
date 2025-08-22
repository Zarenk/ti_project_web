import axios from "axios";
import { BACKEND_URL } from "@/lib/utils";

export interface Journal {
  id: string;
  date: string;
  description: string;
  amount: number;
}

export async function fetchJournals(): Promise<Journal[]> {
  const res = await axios.get(`${BACKEND_URL}/api/accounting/journals`);
  return res.data;
}

export async function createJournal(data: Omit<Journal, "id">) {
  try {
    const res = await axios.post(`${BACKEND_URL}/api/accounting/journals`, data);
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
    const res = await axios.put(`${BACKEND_URL}/api/accounting/journals/${id}`, data);
    return res.data as Journal;
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      throw error.response.data.errors as Record<string, string>;
    }
    throw error;
  }
}

export async function deleteJournal(id: string) {
  await axios.delete(`${BACKEND_URL}/api/accounting/journals/${id}`);
}