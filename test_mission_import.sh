#!/bin/bash

# Test Mission Import Functionality

echo "=== Mission Import Test ==="

# Create test directory
mkdir -p test_missions

# Create QGroundControl test file
cat > test_missions/test_munich_flight.plan << 'EOF'
{
  "fileType": "Plan",
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
  "version": 1
}
EOF

# Create MissionPlanner test file
cat > test_missions/test_munich_flight.waypoints << 'EOF'
QGC WPL 110
0	1	0	16	0	0	0	0	48.135100	11.582000	120.000000	1
1	0	3	16	5	0	0	0	48.145100	11.592000	100.000000	1
2	0	3	16	3	0	0	0	48.155100	11.602000	150.000000	1
3	0	3	16	0	0	0	0	48.165100	11.612000	80.000000	1
EOF

# Create VTOL test mission
cat > test_missions/vtol_mission.plan << 'EOF'
{
  "fileType": "Plan",
  "groundStation": "QGroundControl",
  "mission": {
    "cruiseSpeed": 20,
    "firmwareType": 12,
    "globalPlanAltitudeMode": 1,
    "hoverSpeed": 8,
    "items": [
      {
        "command": 22,
        "coordinate": [47.3977, 8.5456, 150],
        "params": [0, 0, 0, 0, 0, 0, 0]
      },
      {
        "command": 16,
        "coordinate": [47.4077, 8.5556, 200],
        "params": [0, 0, 0, 0, 47.4077, 8.5556, 200]
      },
      {
        "command": 16,
        "coordinate": [47.4177, 8.5656, 180],
        "params": [10, 0, 0, 0, 47.4177, 8.5656, 180]
      },
      {
        "command": 21,
        "coordinate": [47.4277, 8.5756, 0],
        "params": [0, 0, 0, 0, 47.4277, 8.5756, 0]
      }
    ],
    "plannedHomePosition": [47.3977, 8.5456, 150],
    "vehicleType": 21,
    "version": 2
  },
  "version": 1
}
EOF

echo "✅ Test mission files created:"
echo "  - test_missions/test_munich_flight.plan (QGroundControl)"
echo "  - test_missions/test_munich_flight.waypoints (MissionPlanner)"
echo "  - test_missions/vtol_mission.plan (VTOL Mission)"
echo ""
echo "Test these files with the import function in the web interface at:"
echo "http://localhost:3000"
echo ""
echo "=== Test Instructions ==="
echo "1. Open the web interface"
echo "2. Click 'Mission importieren' button"
echo "3. Upload one of the test files"
echo "4. Verify waypoints are correctly imported and displayed on map"
echo "5. Test different vehicle configurations"
