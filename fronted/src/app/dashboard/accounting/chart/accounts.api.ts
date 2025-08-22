import axios from "axios";

export interface Account {
  id: string;
  code: string;
  name: string;
  parentId?: string | null;
  children?: Account[];
}

export async function fetchAccounts(): Promise<Account[]> {
  const res = await axios.get("/api/accounting/accounts");
  return res.data;
}

export async function createAccount(data: Omit<Account, "id" | "children">) {
  try {
    const res = await axios.post("/api/accounting/accounts", data);
    return res.data as Account;
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      throw error.response.data.errors as Record<string, string>;
    }
    throw error;
  }
}

export async function updateAccount(id: string, data: Omit<Account, "id" | "children">) {
  try {
    const res = await axios.put(`/api/accounting/accounts/${id}`, data);
    return res.data as Account;
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      throw error.response.data.errors as Record<string, string>;
    }
    throw error;
  }
}