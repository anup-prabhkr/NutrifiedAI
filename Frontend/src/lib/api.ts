import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface TokenStore {
    accessToken: string | null;
    refreshToken: string | null;
}

const tokens: TokenStore = {
    accessToken: localStorage.getItem('nv_access_token'),
    refreshToken: localStorage.getItem('nv_refresh_token'),
};

export function setTokens(access: string, refresh: string) {
    tokens.accessToken = access;
    tokens.refreshToken = refresh;
    localStorage.setItem('nv_access_token', access);
    localStorage.setItem('nv_refresh_token', refresh);
}

export function clearTokens() {
    tokens.accessToken = null;
    tokens.refreshToken = null;
    localStorage.removeItem('nv_access_token');
    localStorage.removeItem('nv_refresh_token');
}

export function getAccessToken() {
    return tokens.accessToken;
}

export function getRefreshToken() {
    return tokens.refreshToken;
}

async function refreshAccessToken(): Promise<boolean> {
    if (!tokens.refreshToken) return false;

    try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        });

        if (!res.ok) return false;

        const data = await res.json();
        setTokens(data.accessToken, data.refreshToken);
        return true;
    } catch {
        return false;
    }
}

async function apiFetch<T = any>(
    path: string,
    options: RequestInit = {},
): Promise<T> {
    const url = `${API_BASE}${path}`;

    const makeRequest = async (token: string | null) => {
        const headers: Record<string, string> = {
            ...((options.headers as Record<string, string>) || {}),
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        if (
            !headers['Content-Type'] &&
            options.body &&
            typeof options.body === 'string'
        ) {
            headers['Content-Type'] = 'application/json';
        }

        return fetch(url, { ...options, headers });
    };

    let res = await makeRequest(tokens.accessToken);

    // Auto-refresh on 401
    if (res.status === 401 && tokens.refreshToken) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
            res = await makeRequest(tokens.accessToken);
        } else {
            clearTokens();
            window.dispatchEvent(new Event('auth:session-expired'));
            throw new Error('Session expired');
        }
    }

    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: res.statusText }));
        const message = error.message || `Request failed: ${res.status}`;
        throw new Error(message);
    }

    // Handle empty responses (204 No Content)
    const text = await res.text();
    return text ? JSON.parse(text) : ({} as T);
}

// ─── Auth ──────────────────────────────────────────────────
export interface AuthResponse {
    user: UserData;
    accessToken: string;
    refreshToken: string;
}

export interface UserData {
    id: string;
    name: string;
    email: string;
    profile: {
        height?: number;
        weight?: number;
        age?: number;
        gender?: string;
        activityLevel?: string;
        goal?: string;
        calorieTarget?: number;
        macroTargets?: { protein: number; carbs: number; fats: number };
        profilePicture?: string;
    };
    subscription: {
        tier: 'free' | 'pro';
        status: string;
    };
}

export const authApi = {
    register: (data: { name: string; email: string; password: string }) =>
        apiFetch<AuthResponse>('/auth/register', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    login: (data: { email: string; password: string }) =>
        apiFetch<AuthResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    logout: () =>
        apiFetch('/auth/logout', { method: 'POST' }),
};

// ─── Profile ───────────────────────────────────────────────
export const profileApi = {
    get: () => apiFetch<UserData>('/profile'),

    update: (data: Record<string, any>) =>
        apiFetch<UserData>('/profile', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
};

// ─── Meals ─────────────────────────────────────────────────
export interface MealData {
    _id: string;
    userId: string;
    date: string;
    mealName: string;
    imageUrl?: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    aiConfidence?: number;
    source: 'ai' | 'manual';
    createdAt: string;
}

export interface AnalysisResult {
    mealName: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
    confidence: number;
    phase: 'flash' | 'verified';
    items: Array<{
        name: string;
        portion: string;
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
    }>;
    vitamins?: Record<string, string>;
}

export const mealsApi = {
    getByDate: (date: string) =>
        apiFetch<MealData[]>(`/meals?date=${date}`),

    create: (meal: {
        mealName: string;
        calories: number;
        protein?: number;
        carbs?: number;
        fats?: number;
        source?: string;
        aiConfidence?: number;
        date?: string;
    }) =>
        apiFetch<MealData>('/meals', {
            method: 'POST',
            body: JSON.stringify(meal),
        }),

    update: (id: string, meal: {
        mealName?: string;
        calories?: number;
        protein?: number;
        carbs?: number;
        fats?: number;
    }) =>
        apiFetch<MealData>(`/meals/${id}`, {
            method: 'PUT',
            body: JSON.stringify(meal),
        }),

    analyze: (data: { imageBase64?: string; description?: string }) =>
        apiFetch<AnalysisResult>('/meals/analyze', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    delete: (id: string) =>
        apiFetch(`/meals/${id}`, { method: 'DELETE' }),
};

// ─── Weight ────────────────────────────────────────────────
export interface WeightData {
    _id: string;
    date: string;
    weight: number;
}

export const weightApi = {
    log: (weight: number, date?: Date) =>
        apiFetch<WeightData>('/weight', {
            method: 'POST',
            body: JSON.stringify({ weight, date }),
        }),

    getHistory: (range: 'week' | 'month' | 'year' | 'all' = 'month') =>
        apiFetch<WeightData[]>(`/weight?range=${range}`),

    update: (id: string, weight: number, date?: Date) =>
        apiFetch<WeightData>(`/weight/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ weight, date }),
        }),

    delete: (id: string) =>
        apiFetch(`/weight/${id}`, { method: 'DELETE' }),
};

// ─── Supplements ───────────────────────────────────────────
export interface SupplementData {
    _id: string;
    name: string;
    dose?: string;
    frequency: string;
    takenDates: string[];
}

export const supplementsApi = {
    getAll: () => apiFetch<SupplementData[]>('/supplements'),

    create: (data: { name: string; dose?: string; frequency?: string }) =>
        apiFetch<SupplementData>('/supplements', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    update: (id: string, data: { name?: string; dose?: string; frequency?: string }) =>
        apiFetch<SupplementData>(`/supplements/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    toggleTaken: (id: string, date?: string) =>
        apiFetch<SupplementData>(
            `/supplements/${id}/toggle${date ? `?date=${date}` : ''}`,
            { method: 'PATCH' },
        ),

    delete: (id: string) =>
        apiFetch(`/supplements/${id}`, { method: 'DELETE' }),
};

// ─── Summary ───────────────────────────────────────────────
export interface WeeklySummary {
    period: { start: string; end: string };
    averages: { calories: number; protein: number; carbs: number; fats: number };
    totals: { calories: number; protein: number; carbs: number; fats: number; mealCount: number };
    daysLogged: number;
    dailyBreakdown: Array<{
        date: string;
        day: string;
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
        mealCount: number;
    }>;
}

export const summaryApi = {
    getWeekly: () => apiFetch<WeeklySummary>('/summary/weekly'),
};

// ─── Stripe ────────────────────────────────────────────────
export const stripeApi = {
    createCheckout: () =>
        apiFetch<{ url: string }>('/stripe/checkout', { method: 'POST' }),

    createPortal: () =>
        apiFetch<{ url: string }>('/stripe/portal', { method: 'POST' }),
};
