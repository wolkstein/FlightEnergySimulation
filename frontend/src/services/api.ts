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

// Request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url, config.data);
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
};

export default apiService;
