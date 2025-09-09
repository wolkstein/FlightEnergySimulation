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
- **Custom Waypoint Icons:** Blaue Kreise mit Drag & Drop Funktionalität
- **Interactive Popups:** Waypoint-Info mit Position und "Entfernen" Button

### 🎨 Modern CSS Architecture (August 2025)
- **CSS Custom Properties System:** Zentrale Größen-Definitionen in :root
- **Responsive Design:** Automatische Anpassung für Desktop/Tablet/Mobile
- **Variable-based Sizing:** 
  - Container: 1400px max-width für Desktop
  - Maps: 800px Desktop, 500px Mobile, 350px Small-Mobile
  - Charts: Große (600px), Medium (400px), Small (300px) Varianten
- **Utility Classes:** .full-width, .container-centered, .chart-container-*
- **No Inline Styles:** Vollständige Ablösung von style={{}} durch CSS-Klassen
- **Live-Testing:** Browser Dev Tools CSS Variable Manipulation möglich

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
  - "Gentle" Tuning: 10% max. Effizienzgewinn (statt 35% - validiert durch Logfiles)
  - Geschwindigkeitsabhängige Drag-Koeffizienten
  - **Validierung:** QGroundControl-Übereinstimmung (±1% Flugzeit, <1% Distanz)
- **Sweet Spot Analysis GUI:** Interaktive Kurven-Visualisierung
  - Separater Tab für aerodynamische Analyse
  - Backend vs. Glauert Momentum Theory Vergleich
  - Real-time Power-Kurven bei unterschiedlichen Geschwindigkeiten
  - Massenabhängige Sweet Spot Bereiche (visuell hervorgehoben)
  - Touch-optimierte Bedienung für Tablets
- **Realistische Reichweitenschätzung:** Reduzierte Überschätzung von ~65km auf ~46km
- **Batterieverwaltung:** 75% = praktisch leer (sichere 25% Reserve)
- **Multi-Phase:** Takeoff, Cruise, Landing phases

### 📁 Mission Import
- **QGroundControl Support:** .plan Datei Import
- **Automatic Waypoint Extraction:** GPS-Koordinaten und Höhen
- **Map Centering:** Auto-Zoom auf importierte Mission

### 🔐 Benutzerauthentifizierung & Session Management (August 2025)
- **Client-Side Password Hashing:** SHA-256 mit benutzerbasiertem Salt
  - Keine Klartext-Passwörter über das Netzwerk übertragen
  - Sichere Implementierung mit crypto-js
- **JWT-basierte Authentifizierung:** 30-Tage Sessions für einfache Entwicklung
- **Session Ownership:** Simulationssessions werden automatisch Benutzern zugeordnet
- **Gruppen-System:** Benutzer können Gruppen erstellen und Sessions teilen
- **PostgreSQL Integration:** Robuste Datenbank mit Benutzer- und Sessionverwaltung
- **Docker Volume Persistenz:** Daten überleben Container-Neustarts
- **Development Reset:** `docker-compose down -v` für kompletten Datenbank-Reset

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
- `frontend/src/components/WaypointMap.tsx` - Hauptkartenkomponente mit Drag & Drop
- `frontend/src/components/VehicleConfigForm.tsx` - Parameter-Formulare mit Info-Buttons
- `frontend/src/components/SimpleWindVector.tsx` - Wind-Visualisierung
- `frontend/src/components/SweetSpotAnalysis.tsx` - Sweet Spot Kurven-Visualisierung
- `frontend/src/components/AuthModal.tsx` - Login/Register Modal mit Client-Side Hashing
- `frontend/src/utils/passwordHash.ts` - SHA-256 Password Hashing Utility
- `frontend/src/App.css` - **CSS Custom Properties System & Responsive Design**
- `frontend/src/index.css` - Basis-Styles mit CSS Variables Integration
- `backend/services/energy_calculator.py` - Physik-Engine mit "Gentle" Tuning
- `backend/services/glauert_analyzer.py` - Glauert Momentum Theory Implementierung
- `backend/services/wind_service.py` - Wind-Datenquellen
- `backend/services/auth_service.py` - JWT-basierte Authentifizierung mit Client-Hash Support
- `backend/models/user.py` - Benutzer- und Gruppen-Datenmodelle

## 🎯 Nächste Entwicklungsziele

### Kurzfristig (1-2 Wochen)
- [x] **GPL 3 Lizenz hinzufügen** - LICENSE Datei + Copyright Headers ✅ 20.08.2025
- [x] **Airspeed-based Sweet Spot Model** - Realistische Multirotor-Aerodynamik ✅ 21.08.2025
- [x] **Manual Wind Override** - Manuelle Windeinstellung für Feldtests ✅ 21.08.2025
- [x] **Wind Direction Fix** - Korrekte Headwind/Crosswind Projektion ✅ 21.08.2025
- [x] **"Gentle" Backend Parameter Tuning** - Logfile-validierte Realismus-Optimierung ✅ 22.08.2025
- [x] **State-Persistierung Fix** - Fahrzeugkonfiguration & Wegpunkte bleiben nach Simulation erhalten ✅ 22.08.2025
- [x] **Manual Wind Arrow Display Fix** - Manuelle Windpfeile werden korrekt auf Karte angezeigt ✅ 22.08.2025
- [x] **CSS Architecture Modernization** - CSS Custom Properties System mit responsive Design ✅ 23.08.2025
- [x] **Waypoint Drag & Drop Restore** - Wiederherstellung der Drag-Funktionalität nach UI-Updates ✅ 23.08.2025
- [x] **Enhanced Results Visualization** - Timeline-basierte Charts mit Airspeed/Ground Speed & Wind-Impact ✅ 25.08.2025
- [x] **Wind Direction Display Fix** - Gegenwind-Vorzeichen korrigiert für intuitive Anzeige ✅ 27.08.2025
- [x] **Client-Side Password Hashing** - SHA-256 mit Salt, keine Klartext-Übertragung ✅ 27.08.2025
- [x] **User Authentication System** - JWT-basierte Sessions mit PostgreSQL Backend ✅ 27.08.2025
- [x] **Altitude Chart Display Fix** - Echte Waypoint-Höhen statt Durchschnittswerte in Flight Profile Chart ✅ 27.08.2025
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
- [x] **State-Persistierung:** Fahrzeugkonfiguration & Wegpunkte bleiben nach Simulation erhalten ✅ 22.08.2025
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

### "Gentle" Parameter Tuning & Logfile-Validierung (August 2025)

#### Problem: Überschätzung der Effizienzgewinne
Die ursprünglichen Sweet Spot Parameter (35% max. Effizienzgewinn) führten zu unrealistischen Reichweitenschätzungen:
- **Vorher:** ~65km geschätzte Reichweite (zu optimistisch)
- **Problem:** Überschätzung der Aerodynamik-Effizienz bei optimaler Geschwindigkeit

#### Lösung: "Gentle" Parameter basierend auf echter Flugdaten
```python
# Gentle Tuning Parameter (validiert durch 10kg Hexacopter Logfiles)
efficiency_multiplier = 0.45  # Sanftere initiale Verbesserung (statt 1.0)
max_efficiency_gain = 0.10    # Realistischere maximale Einsparung (statt 0.35)

# Sweet Spot Berechnung bei 4 m/s für 10kg Copter
# Ergebnis: 1523W (70.5% der 2160W Hover Power) - stimmt mit Logfiles überein
```

#### Validierung gegen QGroundControl & Logfiles
- **Flugzeit:** 38.9 Min (Simulation) vs. ~39 Min (QGroundControl) - **±1% Genauigkeit** ✅
- **Distanz:** 34.9 km (Simulation) vs. 34.747 km (QGC) - **<1% Differenz** ✅  
- **Reichweite:** 46.5 km (realistisch) vs. 65 km (vorher unrealistisch) - **28% Reduktion** ✅
- **Batterielevel:** 75% verbraucht = praktisch leer (25% Reserve) - **Sichere Planung** ✅

#### Sweet Spot Charakteristiken (nach Gentle Tuning)
- **10kg Hexacopter:** Sweet Spot 3.0-5.0 m/s, Optimum bei 4.0 m/s
- **Hover Power:** 2160W (basierend auf echten Messungen)
- **Sweet Spot Power:** 1523W bei 4 m/s (70.5% der Hover Power)
- **Effizienzgewinn:** Maximal 10% Einsparung (statt 35%) - realistisch validiert

### State-Persistierung Fix - GUI Usability Verbesserung (August 2025)

#### Problem: Konfiguration wird nach Simulation zurückgesetzt
Das ursprüngliche Verhalten war sehr benutzerunfreundlich:
- Nach einer Simulation wurden Fahrzeugkonfiguration und Wegpunkte zurückgesetzt
- Benutzer mussten alle Parameter erneut eingeben für Vergleichssimulationen
- **Root Cause:** SimulationForm Komponente wurde komplett neu gemounted beim Wechsel zwischen Navigation-Items

#### Lösung: App-Level State Management
```typescript
// App.tsx - Persistenter State auf oberster Ebene
const [persistentVehicleConfig, setPersistentVehicleConfig] = useState<VehicleConfig | null>(null);
const [persistentWaypoints, setPersistentWaypoints] = useState<Waypoint[]>([...]);

// SimulationForm.tsx - Props-basierte State-Verwendung
const vehicleConfig = persistentVehicleConfig;
const waypoints = persistentWaypoints;
```

#### Architektur-Verbesserung
- **State-Lifting:** State von SimulationForm-Level auf App-Level verschoben
- **Props-basierte Persistierung:** Komponente erhält State als Props und gibt Änderungen via Callbacks zurück
- **Komponentenlebenszyklus unabhängig:** State überlebt Component-Remounting
- **Robuste Lösung:** Funktioniert auch bei komplexeren Navigation-Szenarien

#### Verbesserungen
- **Persistent State:** Fahrzeugkonfiguration & Wegpunkte bleiben zwischen Simulationen erhalten ✅
- **Smart Reset:** Nur bei explizitem Fahrzeugtyp-Wechsel werden Default-Parameter geladen
- **Vergleichsfreundlich:** Benutzer können einfach kleine Änderungen testen ohne Neueingabe
- **Usability:** Deutlich verbesserte Benutzererfahrung für iterative Parameteroptimierung
- **Validiert:** Erfolgreich getestet mit Waypoint-Import und Batterie-Konfiguration ✅

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

### Für neue Copilot Sessions
```
Projekt: Flight Energy Simulation (React/FastAPI/Docker)
GitHub: https://github.com/wolkstein/FlightEnergySimulation
Status: Produktiv mit QGroundControl-validierter Realismus (±1% Genauigkeit)
Aktuell: Client-Side Password Hashing System implementiert (Aug 2025)
Features: Manual Wind Override, Airspeed-basierte Aerodynamik, User Auth mit SHA-256 Hashing
Validierung: 38.9min Flugzeit, 34.9km Distanz, 46.5km Reichweite - stimmt mit QGC überein
Auth-System: JWT-basierte Sessions, PostgreSQL, Docker Volume Persistenz
Sicherheit: Keine Klartext-Passwörter über Netzwerk, client-side SHA-256 + Salt
Nächstes: [siehe Development Goals]
```

### Wichtige Dateien für Copilot
- Diese `DEVELOPMENT_NOTES.md` - Vollständiger Projektkontext
- `README.md` - Feature-Überblick  
- `QUICKSTART.md` - Installation & Setup
- `frontend/src/components/` - UI-Komponenten (inkl. Sweet Spot Analysis)
- `frontend/src/components/SweetSpotAnalysis.tsx` - Aerodynamik-Visualisierung
- `backend/services/energy_calculator.py` - Aerodynamik-Engine mit "Gentle" Sweet Spot Tuning
- `backend/services/glauert_analyzer.py` - Glauert Momentum Theory für Vergleichsanalysen
- `backend/services/wind_service.py` - Wind-Datenquellen
- `backend_tuning.py` - Parameter-Optimierung und Validierung gegen Logfiles

---

**Letzte Aktualisierung:** 27. August 2025  
**Entwickler:** wolkstein  
**Version:** 1.4 - Client-Side Password Hashing & User Authentication System
