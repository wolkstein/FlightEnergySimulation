import { ElevationSettings } from '../types/simulation';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface SettingsResponse {
  status: string;
  settings: {
    elevation: ElevationSettings;
  };
}

export class SettingsService {
  static async getUserSettings(token: string): Promise<ElevationSettings> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/user/settings`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: SettingsResponse = await response.json();
      return data.settings.elevation;
    } catch (error) {
      console.error('Error loading user settings:', error);
      // Fallback zu Default-Settings
      return {
        enabled: false,
        opentopo_server: '192.168.71.250:5000',
        dataset: 'eudem25m',
        safety_margin_m: 30,
        interpolation_distance_m: 50
      };
    }
  }

  static async updateUserSettings(token: string, elevationSettings: ElevationSettings): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/user/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          elevation: elevationSettings
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.status === 'success';
    } catch (error) {
      console.error('Error saving user settings:', error);
      return false;
    }
  }
}