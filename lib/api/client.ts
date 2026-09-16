/**
 * Bisheshoggo AI - API Client
 * বিশেষজ্ঞ AI - API Client for FastAPI Backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Token storage
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('bisheshoggo_token', token);
    } else {
      localStorage.removeItem('bisheshoggo_token');
    }
  }
}

export function getAuthToken(): string | null {
  if (authToken) return authToken;
  if (typeof window !== 'undefined') {
    authToken = localStorage.getItem('bisheshoggo_token');
  }
  return authToken;
}

// API Request helper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || error.error || 'Request failed');
  }
  
  return response.json();
}

// Auth API
export const authApi = {
  async register(data: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    role?: string;
  }) {
    const result = await apiRequest<{
      access_token: string;
      token_type: string;
      user: User;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setAuthToken(result.access_token);
    return result;
  },
  
  async login(email: string, password: string) {
    const result = await apiRequest<{
      access_token: string;
      token_type: string;
      user: User;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(result.access_token);
    return result;
  },
  
  async logout() {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
      setAuthToken(null);
    }
  },
  
  async getCurrentUser() {
    return apiRequest<User>('/auth/me');
  },
};

// Profile API
export const profileApi = {
  async getProfile() {
    return apiRequest<{ profile: User; additionalData: any }>('/profile');
  },
  
  async updateProfile(data: any) {
    return apiRequest<{ success: boolean }>('/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// Consultations API
export const consultationsApi = {
  async create(data: {
    provider_id?: string;
    consultation_type: string;
    scheduled_at?: string;
    symptoms?: string;
    notes?: string;
  }) {
    return apiRequest<{ success: boolean; data: Consultation }>('/consultations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  async getAll() {
    return apiRequest<{ data: Consultation[] }>('/consultations');
  },
  
  async getById(id: string) {
    return apiRequest<Consultation>(`/consultations/${id}`);
  },
};

// Emergency API
export const emergencyApi = {
  async create(data: {
    latitude: number;
    longitude: number;
    location?: string;
    emergency_type?: string;
    description?: string;
  }) {
    return apiRequest<{ success: boolean; data: any }>('/emergency', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  async getAll() {
    return apiRequest<{ data: any[] }>('/emergency');
  },
};

// Facilities API
export const facilitiesApi = {
  async getAll(type?: string, district?: string) {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (district) params.set('district', district);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<{ data: MedicalFacility[] }>(`/facilities${query}`);
  },
};

// Providers API
export const providersApi = {
  async getAll(specialization?: string) {
    const params = specialization ? `?specialization=${specialization}` : '';
    return apiRequest<{ data: any[] }>(`/providers${params}`);
  },
};

// Medical Records API
export const medicalRecordsApi = {
  async create(data: {
    record_type: string;
    title: string;
    description?: string;
    diagnosis?: string;
    prescriptions?: any;
    attachments?: string[];
  }) {
    return apiRequest<{ success: boolean; data: any }>('/medical-records', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  async getAll() {
    return apiRequest<{ data: any[] }>('/medical-records');
  },
};

// Symptom Check API
export const symptomCheckApi = {
  async create(data: {
    symptoms: string;
    severity: string;
    duration?: string;
    additional_notes?: string;
    diagnosis?: string;
    recommendations?: string;
  }) {
    return apiRequest<{ success: boolean; data: any }>('/symptom-check', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  async getAll() {
    return apiRequest<{ data: any[] }>('/symptom-check');
  },
};

// AI API
export const aiApi = {
  async chat(messages: Array<{ role: string; content: string }>) {
    return apiRequest<{ content: string; role: string }>('/ai/chat/simple', {
      method: 'POST',
      body: JSON.stringify({ messages }),
    });
  },
  
  async getMedicineSuggestions(data: {
    prescriptions: any;
    diagnosis?: string;
    patientHistory?: string;
  }) {
    return apiRequest<{
      suggestions: any[];
      overallRecommendation: string;
      warnings: string[];
    }>('/ai/medicine-suggestions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// OCR API
export const ocrApi = {
  async processImage(image: string) {
    return apiRequest<{
      doctorName: string;
      date: string;
      diagnosis: string;
      medicines: Array<{
        name: string;
        dosage: string;
        frequency: string;
        duration: string;
      }>;
      rawText: string;
    }>('/ocr/process', {
      method: 'POST',
      body: JSON.stringify({ image }),
    });
  },
};

// Types
export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: 'patient' | 'doctor' | 'community_health_worker' | 'pharmacy' | 'clinic';
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface Consultation {
  id: string;
  patient_id: string;
  provider_id?: string;
  consultation_type: string;
  status: string;
  symptoms?: string;
  diagnosis?: string;
  prescription?: string;
  notes?: string;
  scheduled_at?: string;
  created_at: string;
  patient?: User;
  provider?: User;
}

export interface MedicalFacility {
  id: string;
  name: string;
  facility_type: string;
  phone?: string;
  address: string;
  village?: string;
  district: string;
  division: string;
  latitude?: number;
  longitude?: number;
  operating_hours?: string;
  services_offered?: string[];
  has_ambulance: boolean;
  has_emergency: boolean;
  is_active: boolean;
}

export default {
  auth: authApi,
  profile: profileApi,
  consultations: consultationsApi,
  emergency: emergencyApi,
  facilities: facilitiesApi,
  providers: providersApi,
  medicalRecords: medicalRecordsApi,
  symptomCheck: symptomCheckApi,
  ai: aiApi,
  ocr: ocrApi,
};


