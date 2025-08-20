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

### 🌪️ Wind-Visualisierung
- **Colored Wind Arrows:** Geschwindigkeits-basierte Farbkodierung
  - Grün: 0-5 m/s (schwach)
  - Gelb: 5-10 m/s (mäßig)  
  - Orange: 10-15 m/s (stark)
  - Rot: >15 m/s (sehr stark)
- **Route-basiert:** Wind-Daten entlang der geplanten Route
- **Zeit-abhängig:** Mission-Startzeit und Flugdauer berücksichtigt
- **Fallback System:** Realistische Berechnungen ohne externe API

### 🚁 Fahrzeug-Konfiguration
- **3 Fahrzeugtypen:** Quadcopter, VTOL, Fixed-Wing Plane
- **Info-Tooltips:** Touchscreen-optimierte ℹ️ Buttons mit Parameterhilfe
- **Typische Werte:** Realistische Bereiche für alle Parameter:
  - Widerstandsbeiwert: 0.02-0.05 (Standard: 0.03)
  - Masse: 1-10kg je nach Typ
  - Leistung: Hover-, Cruise- und Max-Power
  - Batterien: mAh-Bereiche und Spannungen (3S-12S)

### 📊 Energie-Simulation
- **Physics-based:** Realistische aerodynamische Berechnungen
- **Wind Impact:** Gegen-/Rückenwind-Berücksichtigung
- **Battery Modeling:** Spannungsabfall und Kapazitäts-Modellierung
- **Multi-Phase:** Takeoff, Cruise, Landing phases

### 📁 Mission Import
- **QGroundControl Support:** .plan Datei Import
- **Automatic Waypoint Extraction:** GPS-Koordinaten und Höhen
- **Map Centering:** Auto-Zoom auf importierte Mission

## 🛠️ Entwicklungsumgebung

### Lokale Entwicklung
```bash
# Docker Setup (Empfohlen)
./build.sh

# Oder manuell
sudo docker-compose up --build -d

# Development Mode
cd backend && uvicorn main:app --reload
cd frontend && npm start
```

### Wichtige Dateien
- `frontend/src/components/WaypointMap.tsx` - Hauptkartenkomponente
- `frontend/src/components/VehicleConfigForm.tsx` - Parameter-Formulare mit Info-Buttons
- `frontend/src/components/SimpleWindVector.tsx` - Wind-Visualisierung
- `backend/services/energy_calculator.py` - Physik-Engine
- `backend/services/wind_service.py` - Wind-Datenquellen

## 🎯 Nächste Entwicklungsziele

### Kurzfristig (1-2 Wochen)
- [ ] **GPL 3 Lizenz hinzufügen** - LICENSE Datei + Copyright Headers
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

## 🔧 Debugging & Troubleshooting

### Container-Probleme
```bash
# Logs anzeigen
sudo docker-compose logs -f

# Container neu starten
sudo docker-compose down && sudo docker-compose up --build -d

# Volume Reset (Datenbank zurücksetzen)
sudo docker-compose down -v
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
Status: Funktionsfähig mit Windvektor-Visualisierung
Aktuell: Info-Tooltips für alle Parameter implementiert
Nächstes: [siehe Development Goals]
```

### Wichtige Dateien für Copilot
- Diese `DEVELOPMENT_NOTES.md` - Vollständiger Projektkontext
- `README.md` - Feature-Überblick  
- `QUICKSTART.md` - Installation & Setup
- `frontend/src/components/` - UI-Komponenten
- `backend/services/` - Business Logic

---

**Letzte Aktualisierung:** 20. August 2025  
**Entwickler:** wolkstein  
**Version:** 1.0 - Initial Release mit Wind-Visualisierung
