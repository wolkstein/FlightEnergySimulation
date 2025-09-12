#!/bin/bash
echo "🔍 Suche nach OpenTopo URLs im Backend..."

# Suche in allen Python-Dateien nach der URL
find /home/wolke/gitlocal/wolkstein/FlightEnergySimulation/backend -name "*.py" -exec grep -l "opentopodata" {} \;

echo ""
echo "🔍 Zeige alle OpenTopo URLs:"
find /home/wolke/gitlocal/wolkstein/FlightEnergySimulation/backend -name "*.py" -exec grep -n "opentopodata" {} +

echo ""
echo "🔧 Ersetze alle URLs..."