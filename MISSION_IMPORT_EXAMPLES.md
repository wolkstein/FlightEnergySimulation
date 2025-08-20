# Mission Import Examples

## QGroundControl (.plan) Beispiel
```json
{
  "fileType": "Plan",
  "geoFence": {
    "circles": [],
    "polygons": [],
    "version": 2
  },
  "groundStation": "QGroundControl",
  "mission": {
    "cruiseSpeed": 15,
    "firmwareType": 12,
    "globalPlanAltitudeMode": 1,
    "hoverSpeed": 5,
    "items": [
      {
        "AMSLAltAboveTerrain": 120,
        "Altitude": 120,
        "AltitudeMode": 1,
        "autoContinue": true,
        "command": 22,
        "coordinate": [48.1351, 11.5820, 120],
        "frame": 3,
        "params": [0, 0, 0, 0, 0, 0, 0],
        "type": "SimpleItem"
      },
      {
        "AMSLAltAboveTerrain": 100,
        "Altitude": 100,
        "AltitudeMode": 1,
        "autoContinue": true,
        "command": 16,
        "coordinate": [48.1451, 11.5920, 100],
        "frame": 3,
        "params": [5, 0, 0, 0, 48.1451, 11.5920, 100],
        "type": "SimpleItem"
      },
      {
        "AMSLAltAboveTerrain": 150,
        "Altitude": 150,
        "AltitudeMode": 1,
        "autoContinue": true,
        "command": 16,
        "coordinate": [48.1551, 11.6020, 150],
        "frame": 3,
        "params": [3, 0, 0, 0, 48.1551, 11.6020, 150],
        "type": "SimpleItem"
      }
    ],
    "plannedHomePosition": [48.1351, 11.5820, 120],
    "vehicleType": 20,
    "version": 2
  },
  "rallyPoints": {
    "points": [],
    "version": 2
  },
  "version": 1
}
```

## MissionPlanner (.waypoints) Beispiel
```
QGC WPL 110
0	1	0	16	0	0	0	0	48.135100	11.582000	120.000000	1
1	0	3	16	5	0	0	0	48.145100	11.592000	100.000000	1
2	0	3	16	3	0	0	0	48.155100	11.602000	150.000000	1
3	0	3	16	0	0	0	0	48.165100	11.612000	80.000000	1
```

## Unterstützte MAV Commands:
- **16 (NAV_WAYPOINT)**: Navigate to waypoint
- **17 (NAV_LOITER_UNLIM)**: Loiter unlimited  
- **18 (NAV_LOITER_TURNS)**: Loiter turns
- **19 (NAV_LOITER_TIME)**: Loiter time
- **20 (NAV_RETURN_TO_LAUNCH)**: Return to launch
- **21 (NAV_LAND)**: Land at location
- **22 (NAV_TAKEOFF)**: Takeoff

## Waypoint Parameter (QGroundControl):
- **param1**: Hold time (seconds)
- **param2**: Acceptance radius (meters)
- **param3**: Pass radius (meters)
- **param4**: Yaw angle (degrees)
- **param5**: Latitude
- **param6**: Longitude  
- **param7**: Altitude

## Waypoint Parameter (MissionPlanner):
Columns: Index | Current | Frame | Command | P1 | P2 | P3 | P4 | Lat | Lon | Alt | Autocontinue
- **P1**: Hold time or other command-specific parameter
- **P2**: Speed or acceptance radius
- **P3**: Pass radius or other parameter
- **P4**: Yaw or other parameter
