export type ActivityItem = {
  id: number;
  type: string;
  amount: number;
  date: string; // ISO date string
  description: string;
};

export type ActivityPayload = {
  items: ActivityItem[];
  page: number;
  pageSize: number;
  total: number;
  summary: {
    totalAmount: number;
  };
};

export type ActivityParams = {
  page?: number;
  pageSize?: number;
  type?: string;
  sortBy?: keyof ActivityItem;
  sortOrder?: 'asc' | 'desc';
};

const mockData: ActivityItem[] = [
  { id: 1, type: 'deposit', amount: 500, date: '2024-01-01', description: 'Initial deposit' },
  { id: 2, type: 'withdrawal', amount: 50, date: '2024-01-05', description: 'Groceries' },
  { id: 3, type: 'deposit', amount: 200, date: '2024-01-10', description: 'Salary' },
  { id: 4, type: 'withdrawal', amount: 30, date: '2024-01-12', description: 'Cinema' },
  { id: 5, type: 'deposit', amount: 150, date: '2024-02-02', description: 'Freelance' },
  { id: 6, type: 'withdrawal', amount: 20, date: '2024-02-14', description: 'Gift' },
  { id: 7, type: 'deposit', amount: 300, date: '2024-02-20', description: 'Bonus' },
  { id: 8, type: 'withdrawal', amount: 100, date: '2024-03-03', description: 'Restaurant' },
  { id: 9, type: 'deposit', amount: 250, date: '2024-03-10', description: 'Sold item' },
  { id: 10, type: 'withdrawal', amount: 80, date: '2024-03-18', description: 'Gas' },
];

export async function fetchAccountActivity(params: ActivityParams = {}): Promise<ActivityPayload> {
  const {
    page = 1,
    pageSize = 5,
    type,
    sortBy = 'date',
    sortOrder = 'desc',
  } = params;

  let data = [...mockData];

  if (type) {
    data = data.filter((item) => item.type === type);
  }

  data.sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];

    if (aVal === bVal) return 0;
    const comparison = aVal > bVal ? 1 : -1;
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const total = data.length;
  const start = (page - 1) * pageSize;
  const items = data.slice(start, start + pageSize);
  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);

  return {
    items,
    page,
    pageSize,
    total,
    summary: {
      totalAmount,
    },
  };
}
