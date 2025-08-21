# 🚁 Flight Energy Simulation - Development Notes

## 📋 Projekt Überblick

**GitHub Repository:** https://github.com/wolkstein/FlightEnergySimulation

### Zweck
Interactive web-based flight energy simulation for drones with real-time wind vector visualization and waypoint planning.

### Zielgruppe
- Drone operators planning energy-efficient missions
- Researchers analyzing flight energy consumption
- Educators demonstrating aerodynamic principles

## 🏗️ Technische Architektur

### Frontend (React/TypeScript)
- **Framework:** React 18 mit TypeScript
- **UI Library:** Ant Design für konsistente UI-Komponenten
- **Mapping:** React-Leaflet für interaktive Karten
- **Deployment:** nginx Container mit API-Proxy

### Backend (Python/FastAPI)
- **API Framework:** FastAPI mit automatischer OpenAPI-Dokumentation
- **Database:** PostgreSQL mit SQLAlchemy ORM
- **Wind Data:** Fallback-Berechnungen + optionale externe APIs
- **Deployment:** uvicorn ASGI Server

### Infrastructure
- **Containerization:** Docker Compose Setup
- **Database:** PostgreSQL Container
- **Reverse Proxy:** nginx für Frontend + API-Routing
- **Development:** Hot-reload für beide Services

## ✨ Aktuelle Features (Stand: August 2025)

### 🗺️ Interaktive Karte
- **Waypoint Management:** Klick-zum-Hinzufügen, Drag-and-Drop zum Verschieben
- **Route Visualization:** Blaue Polyline zwischen Waypoints
- **Auto-Centering:** Automatisches Zoomen auf alle Waypoints
- **Touch-optimiert:** Mobile-friendly Bedienung

### 🌪️ Wind-Visualisierung & Manual Override
- **Colored Wind Arrows:** Geschwindigkeits-basierte Farbkodierung
  - Grün: 0-5 m/s (schwach)
  - Gelb: 5-10 m/s (mäßig)  
  - Orange: 10-15 m/s (stark)
  - Rot: >15 m/s (sehr stark)
- **Route-basiert:** Wind-Daten entlang der geplanten Route
- **Zeit-abhängig:** Mission-Startzeit und Flugdauer berücksichtigt
- **Manual Wind Override:** Manuelle Windeinstellung für Feldtests
  - Geschwindigkeit: 0-50 m/s einstellbar
  - Richtung: 0-359° (meteorologische Konvention)
  - Ideal für Validierung mit echten Wetterbedingungen
- **Fallback System:** Realistische Berechnungen ohne externe API

### 🚁 Fahrzeug-Konfiguration
- **3 Fahrzeugtypen:** Multirotor, VTOL, Fixed-Wing Plane
- **Frame-Konfiguration:** Tri/Quad/Hexa/Octo mit Single/Coaxial Motor-Setup
- **VTOL-Modi:** Quad-Plane, Tilt-Rotor, Tilt-Wing, Tail-Sitter
- **Separater Vortrieb:** VTOL Forward-Thrust Motor unabhängig von Hover-Motoren
- **Info-Tooltips:** Touchscreen-optimierte ℹ️ Buttons mit Parameterhilfe
- **Typische Werte:** Realistische Bereiche für alle Parameter:
  - Widerstandsbeiwert: 0.02-0.05 (Standard: 0.03)
  - Masse: 1-10kg je nach Typ
  - Leistung: Hover-, Cruise- und Forward-Thrust-Power
  - Batterien: mAh-Bereiche und Spannungen (3S-12S)

### 📊 Energie-Simulation & Aerodynamik
- **Physics-based:** Realistische aerodynamische Berechnungen
- **Advanced Wind Impact:** Präzise Gegen-/Rückenwind-Berücksichtigung
  - Windvektor-Projektion relativ zur Flugrichtung
  - Separate Headwind/Crosswind Berechnung
  - Korrekte aerodynamische Windeinflüsse
- **Multirotor Sweet Spot Model:** Realistische Effizienz-Kurven
  - Massenabhängige Sweet Spot Bereiche (3-8 m/s für typische Copter)
  - Airspeed-basierte Berechnung (nicht Ground Speed)
  - ~40% Effizienzgewinn im optimalen Geschwindigkeitsbereich
  - Geschwindigkeitsabhängige Drag-Koeffizienten
- **Battery Modeling:** Spannungsabfall und Kapazitäts-Modellierung
- **Multi-Phase:** Takeoff, Cruise, Landing phases
- **Realistische Leistungswerte:** ~160-180W/kg bei optimalem Flug

### 📁 Mission Import
- **QGroundControl Support:** .plan Datei Import
- **Automatic Waypoint Extraction:** GPS-Koordinaten und Höhen
- **Map Centering:** Auto-Zoom auf importierte Mission

## 🛠️ Entwicklungsumgebung

### Lokale Entwicklung
```bash
# Docker Setup (Empfohlen - Production Build)
./build.sh

# Oder manuell
sudo docker-compose up --build -d

# Development Mode (mit Tests)
cd backend 
pip install -r requirements-dev.txt  # Dev-Dependencies
uvicorn main:app --reload

cd frontend 
npm install
npm start

# Tests ausführen
cd backend && pytest
cd frontend && npm test
```

### Wichtige Dateien
- `frontend/src/components/WaypointMap.tsx` - Hauptkartenkomponente
- `frontend/src/components/VehicleConfigForm.tsx` - Parameter-Formulare mit Info-Buttons
- `frontend/src/components/SimpleWindVector.tsx` - Wind-Visualisierung
- `backend/services/energy_calculator.py` - Physik-Engine
- `backend/services/wind_service.py` - Wind-Datenquellen

## 🎯 Nächste Entwicklungsziele

### Kurzfristig (1-2 Wochen)
- [x] **GPL 3 Lizenz hinzufügen** - LICENSE Datei + Copyright Headers ✅ 20.08.2025
- [x] **Airspeed-based Sweet Spot Model** - Realistische Multirotor-Aerodynamik ✅ 21.08.2025
- [x] **Manual Wind Override** - Manuelle Windeinstellung für Feldtests ✅ 21.08.2025
- [x] **Wind Direction Fix** - Korrekte Headwind/Crosswind Projektion ✅ 21.08.2025
- [ ] **Parameter Validation** - Client + Server-side Eingabevalidierung
- [ ] **Error Handling** - Benutzerfreundliche Fehlermeldungen
- [ ] **Mobile Responsiveness** - Tablet/Phone Layout Optimierungen

### Mittelfristig (1-2 Monate)
- [ ] **Advanced Wind APIs** - Windfinder, OpenWeather Integration
- [ ] **Mission Planning** - Multi-Waypoint Optimierung
- [ ] **Battery Management** - Erweiterte Batterie-Modelle
- [ ] **Export Functionality** - CSV/JSON Export der Simulationsergebnisse
- [ ] **Terrain Integration** - Höhendaten für realistischere Simulationen

### Langfristig (3-6 Monate)  
- [ ] **Multi-Aircraft** - Schwarm-Simulationen
- [ ] **Weather Forecasts** - 24h+ Vorhersage-Integration
- [ ] **3D Visualization** - Three.js Integration für 3D-Flugpfade
- [ ] **Machine Learning** - Optimale Route-Vorhersagen
- [ ] **Real-time Tracking** - Live-Drohnen Anbindung

## 🐛 Bekannte Issues

### Frontend
- [ ] TypeScript Compile-Warnings bei Info-Button Tooltips
- [ ] Map Resize-Issues bei Container-Größenänderungen
- [ ] Mobile Safari: Touch-Events manchmal träge

### Backend
- [ ] Wind-API Rate Limiting noch nicht implementiert
- [ ] Database Migration System fehlt
- [ ] Memory Usage bei großen Waypoint-Listen

### Infrastructure
- [ ] Docker Health Checks fehlen
- [ ] SSL/HTTPS Setup für Production
- [ ] Backup Strategy für PostgreSQL

## 📚 Wichtige Architektur-Entscheidungen

### Warum React-Leaflet?
- **Pro:** Mature, gut dokumentiert, große Community
- **Contra:** Bundle Size, aber Performance ist ausreichend
- **Alternative:** MapBox GL JS wäre moderner, aber komplexer

### Warum FastAPI?
- **Pro:** Automatische API-Docs, moderne Python-Features, async Support
- **Contra:** Noch relativ neu, aber sehr stabil
- **Alternative:** Django REST wäre etablierter

### Warum PostgreSQL?
- **Pro:** Robust, JSON Support, GIS Extensions möglich
- **Contra:** Overhead für kleine Deployments
- **Alternative:** SQLite für Single-User

### Aerodynamisches Modell - Sweet Spot Implementierung (August 2025)

#### Problem der Ground Speed vs. Airspeed
Ursprünglich basierte die Effizienzberechnung auf Ground Speed (Geschwindigkeit über Grund), was bei Wind zu unrealistischen Ergebnissen führte:
- Bei Rückenwind: Hohe Ground Speed suggerierte schlechte Effizienz
- Bei Gegenwind: Niedrige Ground Speed suggerierte gute Effizienz
- **Realität:** Aerodynamische Effizienz hängt von Airspeed (Geschwindigkeit relativ zur Luft) ab!

#### Lösung: Airspeed-basierte Berechnung
```python
# Wind-Projektion auf Flugrichtung
headwind_component = -(wind_x * flight_direction_x + wind_y * flight_direction_y)
airspeed = max(0.1, ground_speed - headwind_component)

# Sweet Spot basiert auf Airspeed
efficiency_factor = calculate_speed_efficiency_factor(airspeed, config)
```

#### Sweet Spot Charakteristiken
- **Massenabhängig:** Schwerere Copter haben höhere optimale Geschwindigkeiten
  - 15kg Copter: Sweet Spot 4.5-7.5 m/s Airspeed
  - 5kg Copter: Sweet Spot 1.5-2.5 m/s Airspeed
- **Effizienzgewinn:** Bis zu 40% weniger Energieverbrauch im Sweet Spot
- **Realistische Werte:** ~160-180W/kg bei optimaler Airspeed

#### Validierung
- **Test-Szenario:** 12 m/s Ground Speed + 4 m/s Tailwind = 8.58 m/s Airspeed
- **Ergebnis:** 2488W für 15kg Copter (~166W/kg) - realistische Werte ✅
- **Wind-Komponenten:** Headwind -3.42 m/s, Crosswind 2.08 m/s bei 31.3° Flugrichtung ✅

## 🔧 Debugging & Troubleshooting

### Container-Probleme
```bash
# Logs anzeigen
sudo docker-compose logs -f

# Container neu starten
sudo docker-compose down && sudo docker-compose up --build -d

# Volume Reset (Datenbank zurücksetzen)
sudo docker-compose down -v

# Dependency-Konflikte lösen
cd backend && pip install -r requirements-dev.txt --upgrade
```

### Frontend-Debugging
- Browser DevTools Console für JavaScript-Errors
- React DevTools Extension für Component-Debugging
- Network Tab für API-Call Monitoring

### Backend-Debugging
- FastAPI Auto-Docs: http://localhost:8000/docs
- PostgreSQL: `docker exec -it batteriesimulation_db_1 psql -U postgres`
- Python Debugger: pdb.set_trace() in Services

## 🤝 Für neue Copilot Sessions

### Schneller Kontext-Transfer
```
Projekt: Flight Energy Simulation (React/FastAPI/Docker)
GitHub: https://github.com/wolkstein/FlightEnergySimulation
Status: Funktionsfähig mit realistischer Multirotor-Aerodynamik
Aktuell: Airspeed-basierte Sweet Spot Berechnung implementiert (Aug 2025)
Features: Manual Wind Override, korrekte Wind-Projektion, massenabhängige Effizienz
Nächstes: [siehe Development Goals]
```

### Wichtige Dateien für Copilot
- Diese `DEVELOPMENT_NOTES.md` - Vollständiger Projektkontext
- `README.md` - Feature-Überblick  
- `QUICKSTART.md` - Installation & Setup
- `frontend/src/components/` - UI-Komponenten
- `backend/services/energy_calculator.py` - Aerodynamik-Engine mit Sweet Spot Model
- `backend/services/wind_service.py` - Wind-Datenquellen

---

**Letzte Aktualisierung:** 21. August 2025  
**Entwickler:** wolkstein  
**Version:** 1.1 - Airspeed-basierte Sweet Spot Aerodynamik + Manual Wind Override
