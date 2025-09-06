import { Waypoint } from '../types/simulation';

// QGroundControl .plan file format
interface QGCPlanFile {
  fileType: string;
  geoFence?: any;
  groundStation: string;
  mission: {
    cruiseSpeed: number;
    firmwareType: number;
    globalPlanAltitudeMode: number;
    hoverSpeed: number;
    items: QGCMissionItem[];
    plannedHomePosition: [number, number, number];
    vehicleType: number;
    version: number;
  };
  rallyPoints?: any;
  version: number;
}

interface QGCMissionItem {
  AMSLAltAboveTerrain?: number;
  Altitude?: number;
  AltitudeMode?: number;
  autoContinue?: boolean;
  command?: number;
  coordinate?: [number, number, number];
  doJumpId?: number;
  frame?: number;
  params?: [number, number, number, number, number, number, number];
  type?: string;
}

// MissionPlanner .waypoints format (simplified)
interface MPWaypoint {
  index: number;
  currentWP: number;
  coordFrame: number;
  command: number;
  param1: number;
  param2: number;
  param3: number;
  param4: number;
  x: number; // latitude
  y: number; // longitude  
  z: number; // altitude
  autocontinue: number;
}

export class MissionImportService {
  
  /**
   * Import QGroundControl .plan file
   */
  static async importQGCPlan(file: File): Promise<Waypoint[]> {
    try {
      const content = await this.readFileContent(file);
      const planData: QGCPlanFile = JSON.parse(content);
      
      if (planData.fileType !== 'Plan') {
        throw new Error('Invalid QGroundControl plan file format');
      }

      const waypoints: Waypoint[] = [];
      let waypointIndex = 0;

      for (const item of planData.mission.items) {
        // Skip non-navigation commands (DO_CHANGE_SPEED, etc.)
        if (!this.isNavWaypoint(item.command)) {
          continue;
        }

        let lat, lon, alt;

        // Handle different QGC formats - real QGC files use params[4,5,6] for coordinates
        if (item.params && item.params.length >= 7) {
          // Real QGC format with params array
          lat = item.params[4];
          lon = item.params[5]; 
          alt = item.params[6];
          // If params[6] is null/0, try Altitude property
          if (alt == null || alt === 0) {
            alt = item.Altitude || 0;
          }
        } else if (item.coordinate && Array.isArray(item.coordinate)) {
          // Legacy format with coordinate array (rarely used)
          [lat, lon, alt] = item.coordinate;
        } else {
          // Fallback
          lat = item.params?.[4];
          lon = item.params?.[5];
          alt = item.Altitude || item.params?.[6] || 0;
        }

        // Skip items without valid coordinates
        if (lat == null || lon == null || typeof lat !== 'number' || typeof lon !== 'number' || lat === 0 || lon === 0) {
          console.warn('Skipping item with invalid coordinates:', { lat, lon, alt, command: item.command });
          continue;
        }

        // Enhanced validation with proper error handling
        if (!this.validateCoordinates(lat, lon, alt)) {
          console.warn('Invalid coordinates found, skipping waypoint:', { lat, lon, alt, command: item.command });
          continue;
        }

        waypoints.push({
          latitude: lat,
          longitude: lon,
          altitude: alt || 0,
          speed: planData.mission.cruiseSpeed || 15.0,
          hover_time: this.extractHoverTime(item) || 0
        });
      }

      console.log(`Imported ${waypoints.length} waypoints from QGroundControl plan`);
      return waypoints;
      
    } catch (error) {
      console.error('Error importing QGroundControl plan:', error);
      throw new Error(`Failed to import QGC plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Import MissionPlanner .waypoints file
   */
  static async importMissionPlannerWaypoints(file: File): Promise<Waypoint[]> {
    try {
      const content = await this.readFileContent(file);
      const lines = content.split('\n').filter(line => line.trim());
      
      // Skip header line if present
      const dataLines = lines.filter(line => !line.startsWith('QGC') && line.trim());
      
      const waypoints: Waypoint[] = [];
      let waypointIndex = 0;

      for (const line of dataLines) {
        const parts = line.split('\t');
        if (parts.length < 12) continue;

        const waypoint: MPWaypoint = {
          index: parseInt(parts[0]),
          currentWP: parseInt(parts[1]),
          coordFrame: parseInt(parts[2]),
          command: parseInt(parts[3]),
          param1: parseFloat(parts[4]),
          param2: parseFloat(parts[5]),
          param3: parseFloat(parts[6]),
          param4: parseFloat(parts[7]),
          x: parseFloat(parts[8]), // latitude
          y: parseFloat(parts[9]), // longitude
          z: parseFloat(parts[10]), // altitude
          autocontinue: parseInt(parts[11])
        };

        // Only process navigation waypoints
        if (!this.isMPNavWaypoint(waypoint.command)) {
          continue;
        }

        waypoints.push({
          latitude: waypoint.x,
          longitude: waypoint.y,
          altitude: waypoint.z,
          speed: waypoint.param2 > 0 ? waypoint.param2 : 15.0,
          hover_time: waypoint.param1 > 0 ? waypoint.param1 : 0
        });
      }

      console.log(`Imported ${waypoints.length} waypoints from MissionPlanner file`);
      return waypoints;
      
    } catch (error) {
      console.error('Error importing MissionPlanner waypoints:', error);
      throw new Error(`Failed to import MP waypoints: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Auto-detect file format and import
   */
  static async importMissionFile(file: File): Promise<Waypoint[]> {
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.plan')) {
      return this.importQGCPlan(file);
    } else if (fileName.endsWith('.waypoints') || fileName.endsWith('.mission')) {
      return this.importMissionPlannerWaypoints(file);
    } else {
      // Try to auto-detect by content
      const content = await this.readFileContent(file);
      
      try {
        const jsonData = JSON.parse(content);
        if (jsonData.fileType === 'Plan') {
          return this.importQGCPlan(file);
        }
      } catch {
        // Not JSON, try tab-separated format
        if (content.includes('\t') && content.split('\n').length > 1) {
          return this.importMissionPlannerWaypoints(file);
        }
      }
      
      throw new Error('Unsupported file format. Please use .plan (QGroundControl) or .waypoints/.mission (MissionPlanner) files.');
    }
  }

  /**
   * Export waypoints to QGroundControl format
   */
  static exportToQGCPlan(waypoints: Waypoint[], vehicleType: number = 2): string {
    const planData: QGCPlanFile = {
      fileType: 'Plan',
      groundStation: 'QGroundControl',
      mission: {
        cruiseSpeed: waypoints.length > 0 ? waypoints[0].speed || 15.0 : 15.0,
        firmwareType: 12, // PX4
        globalPlanAltitudeMode: 1,
        hoverSpeed: 5.0,
        items: [
          // Home/Takeoff item
          {
            AMSLAltAboveTerrain: waypoints.length > 0 ? waypoints[0].altitude : 100,
            Altitude: waypoints.length > 0 ? waypoints[0].altitude : 100,
            AltitudeMode: 1,
            autoContinue: true,
            command: 22, // NAV_TAKEOFF
            coordinate: waypoints.length > 0 ? 
              [waypoints[0].latitude, waypoints[0].longitude, waypoints[0].altitude] : 
              [47.397742, 8.545594, 100],
            frame: 3,
            params: [0, 0, 0, 0, 0, 0, 0],
            type: 'SimpleItem'
          },
          // Waypoint items
          ...waypoints.map((wp, index) => ({
            AMSLAltAboveTerrain: wp.altitude,
            Altitude: wp.altitude,
            AltitudeMode: 1,
            autoContinue: true,
            command: 16, // NAV_WAYPOINT
            coordinate: [wp.latitude, wp.longitude, wp.altitude] as [number, number, number],
            frame: 3,
            params: [wp.hover_time || 0, 0, 0, 0, wp.latitude, wp.longitude, wp.altitude] as [number, number, number, number, number, number, number],
            type: 'SimpleItem'
          }))
        ],
        plannedHomePosition: waypoints.length > 0 ? 
          [waypoints[0].latitude, waypoints[0].longitude, waypoints[0].altitude] : 
          [47.397742, 8.545594, 100],
        vehicleType: vehicleType, // 2 = Fixed Wing, 20 = Multi-Rotor, 21 = VTOL
        version: 2
      },
      version: 1
    };

    return JSON.stringify(planData, null, 2);
  }

  /**
   * Export waypoints to MissionPlanner format
   */
  static exportToMissionPlannerWaypoints(waypoints: Waypoint[]): string {
    const lines: string[] = [
      'QGC WPL 110' // Header
    ];

    // Home position (index 0)
    if (waypoints.length > 0) {
      const home = waypoints[0];
      lines.push([
        0, // index
        1, // current wp
        0, // coord frame
        16, // command (NAV_WAYPOINT)
        0, // param1
        0, // param2
        0, // param3
        0, // param4
        home.latitude, // x
        home.longitude, // y
        home.altitude, // z
        1 // autocontinue
      ].join('\t'));
    }

    // Mission waypoints
    waypoints.forEach((wp, index) => {
      lines.push([
        index + 1, // index (1-based for mission items)
        0, // current wp
        3, // coord frame (global relative alt)
        16, // command (NAV_WAYPOINT)
        wp.hover_time || 0, // param1 (hold time)
        0, // param2 (acceptance radius)
        0, // param3 (pass radius)
        0, // param4 (yaw)
        wp.latitude, // x
        wp.longitude, // y
        wp.altitude, // z
        1 // autocontinue
      ].join('\t'));
    });

    return lines.join('\n');
  }

  // Helper methods
  private static async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  private static isNavWaypoint(command?: number): boolean {
    if (!command) return false;
    // MAV_CMD navigation commands only - exclude utility commands like DO_CHANGE_SPEED
    const navCommands = [16, 17, 18, 19, 20, 21, 22]; // Pure navigation commands
    return navCommands.indexOf(command) !== -1;
  }

  private static isMPNavWaypoint(command: number): boolean {
    // MissionPlanner navigation commands
    return [16, 17, 18, 19, 20, 21, 22].indexOf(command) !== -1;
  }

  private static extractHoverTime(item: QGCMissionItem): number {
    // Extract hover time from params[0] if it's a waypoint
    return item.params && item.params[0] > 0 ? item.params[0] : 0;
  }

  // Improved error handling and validation
  private static validateCoordinates(lat: number, lon: number, alt: number): boolean {
    return (
      typeof lat === 'number' && 
      typeof lon === 'number' && 
      lat >= -90 && lat <= 90 &&
      lon >= -180 && lon <= 180 &&
      alt >= 0 && alt <= 10000 // reasonable altitude limit
    );
  }
}

export default MissionImportService;
