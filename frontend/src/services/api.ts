import axios from 'axios';
import { VehicleInfo, SimulationRequest, SimulationResult, SimulationSession, WindData, RestoreSessionData } from '../types/simulation';

// Use relative URL for Docker container with nginx proxy, fallback to localhost for development
const API_BASE_URL = process.env.NODE_ENV === 'production' ? '' : (process.env.REACT_APP_API_URL || 'http://localhost:8000');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for debugging and authentication
api.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url, config.data);
    
    // Add authentication header if token is available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.data);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.status, error.response?.data || error.message);
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      // Clear auth data and redirect to login
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      // Force reload to reset app state
      window.location.reload();
    }
    
    return Promise.reject(error);
  }
);

export const apiService = {
  // Vehicle endpoints
  async getVehicleTypes(): Promise<VehicleInfo[]> {
    const response = await api.get('/api/vehicles');
    return response.data;
  },

  // Simulation endpoints
  async runSimulation(request: SimulationRequest): Promise<SimulationResult> {
    const response = await api.post('/api/simulation', request);
    return response.data;
  },

  // Wind data endpoints
  async getWindData(latitude: number, longitude: number, altitude: number): Promise<WindData> {
    const response = await api.get(`/api/wind/${latitude}/${longitude}/${altitude}`);
    return response.data;
  },

  // Session endpoints
  async createSession(name: string, description?: string): Promise<{ session_id: number; name: string }> {
    const response = await api.post('/api/sessions', null, {
      params: { name, description }
    });
    return response.data;
  },

  async getAllSessions(): Promise<SimulationSession[]> {
    const response = await api.get('/api/sessions');
    return response.data;
  },

  async getSession(sessionId: number): Promise<SimulationSession> {
    const response = await api.get(`/api/sessions/${sessionId}`);
    return response.data;
  },

  async restoreSession(sessionId: number): Promise<RestoreSessionData> {
    const response = await api.get(`/api/sessions/${sessionId}/restore`);
    return response.data;
  },

  async updateSessionName(sessionId: number, name: string): Promise<{ success: boolean; message: string }> {
    const response = await api.put(`/api/sessions/${sessionId}/name`, { name });
    return response.data;
  },

  async deleteSession(sessionId: number): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/api/sessions/${sessionId}`);
    return response.data;
  },

  // Health check
  async healthCheck(): Promise<{ message: string; version: string }> {
    const response = await api.get('/');
    return response.data;
  },

  // Authentication endpoints
  async register(userData: { username: string; email: string; password: string }): Promise<any> {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  async login(credentials: { username: string; password: string }): Promise<any> {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  async getCurrentUser(): Promise<any> {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Groups endpoints
  async getGroups(): Promise<any[]> {
    const response = await api.get('/groups/');
    return response.data;
  },

  async createGroup(groupData: { name: string; description?: string }): Promise<any> {
    const response = await api.post('/groups/', groupData);
    return response.data;
  },

  async joinGroup(groupName: string): Promise<any> {
    const response = await api.post('/groups/join', { group_name: groupName });
    return response.data;
  },

  async leaveGroup(groupId: number): Promise<any> {
    const response = await api.delete(`/groups/${groupId}`);
    return response.data;
  },
};

export default apiService;
