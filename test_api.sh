#!/bin/bash
# Test Script für Flight Energy Simulation API

echo "🧪 Testing Flight Energy Simulation API..."

API_URL="http://localhost:8000"

# Test 1: Health Check
echo "📋 Test 1: Health Check"
response=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/)
if [ $response -eq 200 ]; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed (HTTP $response)"
    exit 1
fi

# Test 2: Get Vehicle Types
echo "📋 Test 2: Vehicle Types"
response=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/api/vehicles)
if [ $response -eq 200 ]; then
    echo "✅ Vehicle types endpoint working"
    echo "📋 Available vehicles:"
    curl -s $API_URL/api/vehicles | jq -r '.[].name'
else
    echo "❌ Vehicle types failed (HTTP $response)"
fi

# Test 3: Wind Data
echo "📋 Test 3: Wind Data (München)"
response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/wind/48.1351/11.5820/100")
if [ $response -eq 200 ]; then
    echo "✅ Wind data endpoint working"
    echo "📋 Wind data sample:"
    curl -s "$API_URL/api/wind/48.1351/11.5820/100" | jq '{wind_speed_ms, wind_direction_deg}'
else
    echo "❌ Wind data failed (HTTP $response)"
fi

# Test 4: Simulation (komplexer Test)
echo "📋 Test 4: Simulation"
simulation_data='{
  "vehicle_type": "quadcopter",
  "vehicle_config": {
    "mass": 2.5,
    "max_power": 1000,
    "hover_power": 400,
    "max_speed": 15,
    "max_climb_rate": 5,
    "battery_capacity": 5000,
    "battery_voltage": 22.2,
    "drag_coefficient": 0.03,
    "wing_area": 0.5,
    "rotor_diameter": 0.3,
    "rotor_count": 4,
    "motor_efficiency": 0.85,
    "propeller_efficiency": 0.75,
    "transmission_efficiency": 0.95
  },
  "waypoints": [
    {"latitude": 48.1351, "longitude": 11.5820, "altitude": 50},
    {"latitude": 48.1451, "longitude": 11.5920, "altitude": 100},
    {"latitude": 48.1551, "longitude": 11.6020, "altitude": 75}
  ],
  "wind_consideration": true
}'

response=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "$simulation_data" \
  $API_URL/api/simulation)

if [ $response -eq 200 ]; then
    echo "✅ Simulation endpoint working"
    echo "📋 Running test simulation..."
    
    result=$(curl -s \
      -X POST \
      -H "Content-Type: application/json" \
      -d "$simulation_data" \
      $API_URL/api/simulation)
    
    echo "📊 Simulation Results:"
    echo $result | jq '{
      total_energy_wh,
      total_distance_m,
      total_time_s,
      battery_usage_percent,
      vehicle_type
    }'
else
    echo "❌ Simulation failed (HTTP $response)"
fi

# Test 5: Sessions
echo "📋 Test 5: Sessions"
response=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/api/sessions)
if [ $response -eq 200 ]; then
    echo "✅ Sessions endpoint working"
    session_count=$(curl -s $API_URL/api/sessions | jq length)
    echo "📋 Found $session_count sessions"
else
    echo "❌ Sessions failed (HTTP $response)"
fi

# Test 6: Authentication Tests
echo "📋 Test 6: Authentication"
auth_response=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password_hash": "testhash"}' \
  $API_URL/api/auth/login)

if [ $auth_response -eq 200 ] || [ $auth_response -eq 401 ]; then
  echo "✅ Authentication endpoint responding"
else
  echo "❌ Authentication endpoint failed (HTTP $auth_response)"
fi

# Test 7: Invalid Data Handling
echo "📋 Test 7: Invalid Data Handling"
invalid_simulation='{
  "vehicle_type": "invalid_type",
  "waypoints": []
}'

response=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "$invalid_simulation" \
  $API_URL/api/simulation)

if [ $response -eq 422 ] || [ $response -eq 400 ]; then
  echo "✅ Proper error handling for invalid data"
else
  echo "❌ Invalid data not properly handled (HTTP $response)"
fi

echo ""
echo "🎉 API Tests completed!"
echo "💡 To test the frontend, open http://localhost:3000"
