#!/bin/bash
echo "🔍 Suche nach Backend-Dateien mit Dummy-Daten..."

echo "📁 Backend Dateien:"
find /home/wolke/gitlocal/wolkstein/FlightEnergySimulation/backend -name "*.py" -exec ls -la {} \;

echo ""
echo "🔍 Suche nach 'elevation' in allen Python-Dateien:"
find /home/wolke/gitlocal/wolkstein/FlightEnergySimulation/backend -name "*.py" -exec grep -l "elevation" {} \;

echo ""
echo "🔍 Zeige Elevation-relevanten Code:"
find /home/wolke/gitlocal/wolkstein/FlightEnergySimulation/backend -name "*.py" -exec grep -A5 -B5 "elevation\|terrain\|opentopodata" {} \;

echo ""
echo "🧪 Teste Backend direkt:"
echo "curl -X POST http://localhost:8000/api/elevation/profile..."