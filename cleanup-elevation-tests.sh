#!/bin/bash
echo "🧹 Cleanup: Lösche Test-Dateien für Höhenprofil"

# Testdateien löschen
rm -f /home/wolke/gitlocal/wolkstein/FlightEnergySimulation/frontend/public/elevation-integration-test.html
rm -f /home/wolke/gitlocal/wolkstein/FlightEnergySimulation/frontend/public/js/chart-detection.js
rm -f /home/wolke/gitlocal/wolkstein/FlightEnergySimulation/frontend/public/js/elevation-auto-inject.js
rm -f /home/wolke/gitlocal/wolkstein/FlightEnergySimulation/frontend/public/js/elevation-results-integration.js
rm -f /home/wolke/gitlocal/wolkstein/FlightEnergySimulation/frontend/src/components/ElevationPreviewChart.tsx
rm -f /home/wolke/gitlocal/wolkstein/FlightEnergySimulation/frontend/src/components/ElevationProfile.tsx
rm -f /home/wolke/gitlocal/wolkstein/FlightEnergySimulation/frontend/src/components/ElevationChart.tsx
rm -f /home/wolke/gitlocal/wolkstein/FlightEnergySimulation/frontend/src/components/ElevationIntegrationGuide.ts
rm -f /home/wolke/gitlocal/wolkstein/FlightEnergySimulation/frontend/src/hooks/useElevationProfile.ts

echo "✅ Testdateien entfernt"
echo ""
echo "📋 BEHALTEN - Diese Dateien sind funktional:"
echo "✅ /frontend/public/simulation-production.html"
echo "✅ /frontend/public/js/elevation-chart.js"
echo "✅ /frontend/public/js/elevation-integration.js"
echo "✅ /frontend/src/App.css (Höhenprofil Styles)"
echo "✅ /frontend/src/mobile-overrides.css (Mobile Styles)"
echo "✅ /backend/main.py (Elevation API)"
echo ""
echo "🎯 VERWENDEN SIE:"
echo "http://localhost:3000/simulation-production.html"