# Flight Energy Consumption Simulation

Eine Webanwendung zur Simulation des Energieverbrauchs von PX4-Fahrzeugen (Quadcopter, VTOL, Plane) basierend auf Wegpunkten und Windverhältnissen.

## Features

- **Fahrzeugtypen**: Quadcopter, VTOL, Plane
- **Energieberechnung**: Physikalische Simulation des Energieverbrauchs in Wh
- **Wegpunktplanung**: WGS84 XYZ Koordinateneingabe mit interaktiver Karte
- **Mission Import/Export**: QGroundControl (.plan) und MissionPlanner (.waypoints) Dateien
- **Windintegration**: Windfinder API für positionsbasierte Winddaten
- **Web-GUI**: Browser-basierte Benutzeroberfläche mit Ant Design
- **Docker**: Containerisierte Bereitstellung

## Architektur

- **Backend**: Python FastAPI
- **Frontend**: React mit TypeScript
- **Database**: SQLite für Sessions
- **APIs**: Windfinder API Integration
- **Deployment**: Docker & Docker Compose

## Quick Start

```bash
# Docker Compose starten
docker-compose up -d

# Anwendung öffnen
http://localhost:3000
```

## Mission Import/Export 🚁

Das System unterstützt den Import von Missionen aus verschiedenen Ground Control Stationen:

### Unterstützte Formate:
- **QGroundControl**: `.plan` Dateien (JSON Format)
- **MissionPlanner**: `.waypoints`, `.mission` Dateien (Tab-separated)

### Features:
- **Auto-Detection**: Automatische Erkennung des Dateiformats
- **Preview**: Vorschau der Waypoints vor dem Import
- **MAVLink Compatible**: Standard Navigation Commands (NAV_WAYPOINT, NAV_TAKEOFF, etc.)
- **Parameter Mapping**: Hover-Zeit, Geschwindigkeit, Koordinaten

### Verwendung:
1. Klick auf "Mission importieren" Button
2. Datei auswählen (.plan oder .waypoints)
3. Vorschau prüfen
4. Import bestätigen

Test-Dateien verfügbar: `./test_mission_import.sh`

## Windanalyse & Visualisierung 🌬️

### Zeitbasierte Windvorhersagen:
- **Aktuelle Winddaten**: Sofortige Windverhältnisse für jeden Wegpunkt
- **Zeitgenaue Vorhersagen**: Windprognose für spezifische Missionszeitpunkte
- **Missionsplanung**: Berücksichtigung der geplanten Startzeit und Flugdauer
- **Saisonale Variation**: Realistische Tag/Nacht- und Jahreszeitliche Windfaktoren

### Windvektor-Visualisierung:
- **Interaktive Karte**: Windvektoren als Pfeile direkt in der Route dargestellt
- **Farbkodierung**: 
  - 🟢 Grün: Schwacher Wind (< 3 m/s)
  - 🟡 Gelb: Mäßiger Wind (3-7 m/s)
  - 🟠 Orange: Starker Wind (7-12 m/s)
  - 🔴 Rot: Sehr starker Wind (> 12 m/s)
- **Detailinfos**: Popup mit Windgeschwindigkeit, Richtung, Zeit und Position
- **Routing-Integration**: Windvektoren werden für jeden Wegpunkt zeitgenau berechnet

### Erweiterte Wind-APIs:
```
GET /api/wind/{lat}/{lon}/{alt}?hours_ahead=X  # Windvorhersage X Stunden voraus
POST /api/wind/route                           # Windvektoren für komplette Route
```

### Konfiguration:
- **Missionsstart**: Stunden von jetzt (0-168h, also bis 1 Woche im Voraus)
- **Flugdauer**: Geschätzte Missionsdauer für zeitgenaue Windberechnung
- **Toggle-Optionen**: Windberücksichtigung und Vektoranzeige ein-/ausschaltbar

## Entwicklung

```bash
# Backend entwickeln
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend entwickeln
cd frontend
npm install
npm start
```

## API Endpoints

- `GET /api/vehicles` - Verfügbare Fahrzeugtypen
- `POST /api/simulation` - Energiesimulation durchführen
- `GET /api/wind/{lat}/{lon}/{alt}` - Winddaten abrufen (optional: ?hours_ahead=X)
- `POST /api/wind/route` - Windvektoren für komplette Route
- `POST /api/sessions` - Session erstellen
- `GET /api/sessions` - Alle Sessions abrufen
- `GET /api/sessions/{id}` - Spezifische Session abrufen

## Konfiguration

Umgebungsvariablen in `.env`:
```
WINDFINDER_API_KEY=your_api_key_here
DATABASE_URL=sqlite:///./simulation.db
```

## Lizenz

Dieses Projekt ist unter der **GNU General Public License v3.0** lizenziert.

**Das bedeutet:**
- ✅ **Freie Nutzung** für private und kommerzielle Zwecke
- ✅ **Modifikation und Weiterverteilung** erlaubt
- ✅ **Open Source** - Quellcode muss verfügbar bleiben
- ❗ **Copyleft** - Ableitungen müssen ebenfalls GPL v3 lizenziert sein

Siehe [LICENSE](LICENSE) Datei für vollständige Details.

## Entwicklung & Beiträge

Beiträge sind willkommen! Bei Verwendung oder Modifikation des Codes beachten Sie bitte:

1. **Copyright Headers**: Alle neuen Dateien müssen GPL v3 Header enthalten
2. **Lizenz-Kompatibilität**: Externe Dependencies müssen GPL-kompatibel sein
3. **Attribution**: Original-Autoren in CONTRIBUTORS.md erwähnen

**Copyright (C) 2025 wolkstein**

Weitere Informationen: <https://www.gnu.org/licenses/gpl-3.0.html>
