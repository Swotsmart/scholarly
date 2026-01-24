const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, ...fetchOptions } = options;

  // Build URL with query params
  let url = `${API_URL}/api/v1${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  // Get auth headers
  const token = typeof window !== 'undefined' ? localStorage.getItem('scholarly_token') : null;
  const tenantId = typeof window !== 'undefined' ? localStorage.getItem('scholarly_tenant_id') : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  if (token && tenantId) {
    (headers as Record<string, string>)['x-demo-user-id'] = token;
    (headers as Record<string, string>)['x-demo-tenant-id'] = tenantId;
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>) =>
    request<T>(endpoint, { method: 'GET', params }),

  post: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
};

// API hooks types
export interface PaginatedResponse<T> {
  data?: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// Tutor types
export interface Tutor {
  tutorId: string;
  profileId: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
  trustScore: number;
  subjects: {
    subjectId: string;
    subjectName: string;
    yearLevels: string[];
    confidenceLevel: number;
  }[];
  yearLevels: string[];
  sessionTypes: string[];
  pricing: {
    currency: string;
    hourlyRate1to1: number;
    hourlyRateGroup: number;
  };
  metrics: {
    averageRating: number;
    ratingCount: number;
    totalSessions: number;
  };
  matchScore: number;
  matchReasons: string[];
}

// Content types
export interface Content {
  id: string;
  title: string;
  description: string;
  type: string;
  thumbnailUrl?: string;
  subjects: string[];
  yearLevels: string[];
  curriculumCodes: string[];
  pricing: {
    type: 'free' | 'paid' | 'freemium';
    price?: number;
    currency?: string;
  };
  averageRating: number;
  reviewCount: number;
  downloadCount: number;
  purchaseCount: number;
  publishedAt?: string;
  creator: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
}

// Curriculum types
export interface CurriculumStandard {
  id: string;
  framework: string;
  code: string;
  type: string;
  learningArea: string;
  subject: string;
  strand?: string;
  substrand?: string;
  yearLevels: string[];
  title: string;
  description: string;
  generalCapabilities: string[];
  crossCurriculumPriorities: string[];
}

// Booking types
export interface Booking {
  id: string;
  tutorId: string;
  learnerIds: string[];
  scheduledStart: string;
  scheduledEnd: string;
  sessionType: string;
  subjectId: string;
  subjectName: string;
  status: string;
  pricing: {
    total: number;
    currency: string;
  };
  tutor: {
    user: {
      id: string;
      displayName: string;
      avatarUrl?: string;
    };
  };
}
