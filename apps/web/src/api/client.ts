import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 30000,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────
export const authApi = {
  register: (name: string, email: string, password: string) =>
    api.post('/auth/register', { name, email, password }),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
};

// ── Dashboard ─────────────────────────────────────────────────
export const dashboardApi = {
  get: () => api.get('/dashboard'),
};

// ── Plans ─────────────────────────────────────────────────────
export const plansApi = {
  generate: (payload: {
    freeText?: string;
    energyLevel?: string;
    urgentDeadlines?: string[];
    unexpectedCommitments?: string[];
  }) => api.post('/plans/generate', payload),
  getToday: () => api.get('/plans/today'),
  getById: (id: string) => api.get(`/plans/${id}`),
};

// ── Tasks ─────────────────────────────────────────────────────
export const tasksApi = {
  updateStatus: (
    taskId: string,
    payload: {
      status: string;
      actualMinutes?: number;
      skipReason?: string;
      selfRating?: number;
      feedback?: string;
    }
  ) => api.patch(`/tasks/${taskId}/status`, payload),
  list: (params?: { status?: string; date?: string }) =>
    api.get('/tasks', { params }),
};

// ── Roadmap ───────────────────────────────────────────────────
export const roadmapApi = {
  getAll: () => api.get('/roadmap'),
  getProgress: () => api.get('/roadmap/progress'),
  getDueRevisions: () => api.get('/roadmap/due-revisions'),
};

// ── Profile ───────────────────────────────────────────────────
export const profileApi = {
  get: () => api.get('/profile'),
  updateConfig: (config: Record<string, unknown>) =>
    api.patch('/profile/config', config),
  getTimetable: () => api.get('/profile/timetable'),
  getNotifications: () => api.get('/profile/notifications'),
  updateNotifications: (n: Record<string, unknown>) =>
    api.patch('/profile/notifications', n),
};
