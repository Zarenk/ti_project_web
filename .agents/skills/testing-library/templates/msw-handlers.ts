/**
 * MSW Handlers Template
 * Location: src/test/mocks/handlers.ts
 *
 * Define API mock handlers for testing
 */
import { http, HttpResponse, delay } from 'msw';

// Base URL for API calls
const API_BASE = '/api';

// Mock data
const mockUser = {
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
};

const mockItems = [
  { id: '1', title: 'Item 1', completed: false },
  { id: '2', title: 'Item 2', completed: true },
];

export const handlers = [
  // GET /api/user - Return current user
  http.get(`${API_BASE}/user`, async () => {
    await delay(100); // Simulate network delay
    return HttpResponse.json(mockUser);
  }),

  // GET /api/items - Return list of items
  http.get(`${API_BASE}/items`, () => {
    return HttpResponse.json(mockItems);
  }),

  // POST /api/items - Create new item
  http.post(`${API_BASE}/items`, async ({ request }) => {
    const body = (await request.json()) as { title: string };
    const newItem = {
      id: String(Date.now()),
      title: body.title,
      completed: false,
    };
    return HttpResponse.json(newItem, { status: 201 });
  }),

  // PUT /api/items/:id - Update item
  http.put(`${API_BASE}/items/:id`, async ({ params, request }) => {
    const { id } = params;
    const updates = await request.json();
    const item = mockItems.find((i) => i.id === id);

    if (!item) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return HttpResponse.json({ ...item, ...updates });
  }),

  // DELETE /api/items/:id - Delete item
  http.delete(`${API_BASE}/items/:id`, ({ params }) => {
    const { id } = params;
    const index = mockItems.findIndex((i) => i.id === id);

    if (index === -1) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return HttpResponse.json({ success: true });
  }),

  // POST /api/login - Authentication
  http.post(`${API_BASE}/login`, async ({ request }) => {
    const { email, password } = (await request.json()) as {
      email: string;
      password: string;
    };

    if (email === 'test@example.com' && password === 'password123') {
      return HttpResponse.json({
        token: 'mock-jwt-token',
        user: mockUser,
      });
    }

    return HttpResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  // Error response example
  http.get(`${API_BASE}/error`, () => {
    return HttpResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }),
];

/**
 * Server setup (src/test/mocks/server.ts)
 *
 * import { setupServer } from 'msw/node';
 * import { handlers } from './handlers';
 * export const server = setupServer(...handlers);
 */

/**
 * Test setup (src/test/setup.ts)
 *
 * import { server } from './mocks/server';
 *
 * beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
 * afterEach(() => server.resetHandlers());
 * afterAll(() => server.close());
 */
