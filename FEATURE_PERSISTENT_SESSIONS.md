# 💾 Persistent Session System - Feature Documentation

## 🎯 Überblick

Das Persistent Session System ermöglicht es Benutzern, ihre Simulationsläufe vollständig zu speichern und später wiederherzustellen. Alle relevanten Daten werden in der Datenbank persistiert:

- **Fahrzeugkonfiguration** (komplette VehicleConfig)
- **Wegpunkte** (Waypoint-Liste mit Koordinaten und Höhen)
- **Wind-Einstellungen** (automatisch/manuell, Geschwindigkeit, Richtung)
- **Simulationsergebnisse** (Timeline-Charts, Energie, Batteriedaten)
- **Flight Segments** (detaillierte Segment-Daten für Charts)

## 🏗️ Technische Implementierung

### Backend (Python/FastAPI)

#### Erweiterte Datenbankmodelle
```python
# models/database.py
class SimulationSession(Base):
    # Basis-Metadaten
    id, name, description, created_at, vehicle_type
    total_energy_wh, total_distance_m, total_time_s, battery_usage_percent
    
    # JSON-Daten
    vehicle_config = Column(JSON)      # VehicleConfig als JSON
    waypoints = Column(JSON)           # Waypoint-Liste als JSON  
    wind_settings = Column(JSON)       # Wind-Einstellungen als JSON
    simulation_result = Column(JSON)   # Vollständiges SimulationResult als JSON
    
    # Relation zu Flight Segments
    flight_segments = relationship("FlightSegment", back_populates="session")

class FlightSegment(Base):
    # Detaillierte Segment-Daten für bessere Abfragbarkeit
    session_id, segment_id, start/end coordinates, distance_m, duration_s
    energy_wh, average_speed_ms, average_power_w
    headwind_ms, crosswind_ms, updraft_ms, total_wind_speed
```

#### Erweiterte Session Service
```python
# services/session_service.py
class SessionService:
    def create_session()         # Vollständige Session mit allen Daten speichern
    def restore_simulation_data() # Alle Daten für Wiederherstellung laden
    def get_session_with_segments() # Session mit Flight Segments laden
    def update_session_name()    # Session umbenennen
    def delete_session()         # Session und alle Daten löschen
```

#### Neue API-Endpunkte
```python
# main.py
GET  /api/sessions/{id}/restore     # Session-Daten für Wiederherstellung
PUT  /api/sessions/{id}/name        # Session umbenennen
DELETE /api/sessions/{id}           # Session löschen
```

### Frontend (React/TypeScript)

#### Erweiterte TypeScript-Typen
```typescript
// types/simulation.ts
interface SimulationSession {
    // Erweitert um JSON-Felder
    vehicle_config?: VehicleConfig;
    waypoints?: Waypoint[];
    wind_settings?: WindSettings;
    simulation_result?: SimulationResult;
    battery_usage_percent?: number;
}

interface RestoreSessionData {
    vehicle_config: VehicleConfig;
    waypoints: Waypoint[];
    wind_settings: WindSettings;
    simulation_result: SimulationResult;
    session_info: SessionInfo;
}
```

#### Erweiterte API-Services
```typescript
// services/api.ts
apiService.restoreSession(sessionId)     // Session vollständig wiederherstellen
apiService.updateSessionName(id, name)   # Session umbenennen
apiService.deleteSession(sessionId)      # Session löschen
```

#### Erweiterte SessionHistory-Komponente
```typescript
// components/SessionHistory.tsx
- Inline-Editing von Session-Namen
- "Wiederherstellen" Button mit Callback an App.tsx
- Confirmation-Dialog für Löschen
- Batterie-Prozentwert in Tabelle
- Loading-States für alle Aktionen
```

## 🚀 Benutzer-Features

### Verlauf/History Tab

#### Session-Liste
- **Erweiterte Tabelle** mit Name, Fahrzeugtyp, Energie, Batterie%, Distanz, Erstellungsdatum
- **Inline-Editing** von Session-Namen (Edit-Icon → Input-Feld → Speichern/Abbrechen)
- **Sortierung** nach Erstellungsdatum (neueste zuerst)

#### Session-Aktionen
1. **Wiederherstellen** 🔄
   - Lädt komplette Fahrzeugkonfiguration
   - Stellt alle Wegpunkte wieder her
   - Übernimmt Wind-Einstellungen (manuell/automatisch)
   - Wechselt automatisch zum Simulations-Tab
   - Zeigt Erfolgsmeldung

2. **Details anzeigen** 👁️
   - Modal mit vollständigen Session-Informationen
   - Zeigt Simulationsergebnisse und Parameter

3. **Umbenennen** ✏️
   - Inline-Editing direkt in der Tabelle
   - Validierung (Name darf nicht leer sein)
   - Sofortige Aktualisierung

4. **Löschen** 🗑️
   - Confirmation-Dialog zur Sicherheit
   - Cascading Delete (löscht auch Flight Segments)
   - Sofortige Listen-Aktualisierung

### Simulation Tab Integration
- **Automatische Speicherung** jeder durchgeführten Simulation
- **State-Persistierung** zwischen Sessions (bereits implementiert)
- **Nahtlose Wiederherstellung** aller Parameter

## 🔧 Datenbank-Migration

Die neuen Felder sind **nullable** und **backwards-compatible**:
```sql
-- Automatisch beim ersten Start ausgeführt
ALTER TABLE simulation_sessions ADD COLUMN battery_usage_percent FLOAT;
ALTER TABLE simulation_sessions ADD COLUMN vehicle_config JSON;
ALTER TABLE simulation_sessions ADD COLUMN waypoints JSON;
ALTER TABLE simulation_sessions ADD COLUMN wind_settings JSON;
ALTER TABLE simulation_sessions ADD COLUMN simulation_result JSON;

-- Neue Tabelle für detaillierte Flight Segments
CREATE TABLE flight_segments (...);
```

## 📊 Vorteile

### Für Benutzer
- **Experimentieren** mit verschiedenen Parametern und einfache Rückkehr zu bewährten Konfigurationen
- **Vergleichen** verschiedener Simulationsläufe
- **Archivieren** wichtiger Simulationen mit aussagekräftigen Namen
- **Teilen** von Session-Daten durch Export (future feature)

### Für Entwickler
- **Strukturierte Datenhaltung** mit JSON-Flexibilität
- **Saubere Trennung** zwischen Metadaten und Detaildaten (Flight Segments)
- **Erweiterbar** für zukünftige Features (Tags, Kategorien, etc.)
- **Performance-optimiert** durch gezielte Abfragen

## 🧪 Testing

### Backend Testing
```bash
# Session-Erstellung testen
curl -X POST "http://localhost:8000/api/simulation" \
  -H "Content-Type: application/json" \
  -d @test_simulation_request.json

# Session-Wiederherstellung testen  
curl "http://localhost:8000/api/sessions/1/restore"

# Session-Updates testen
curl -X PUT "http://localhost:8000/api/sessions/1/name" \
  -H "Content-Type: application/json" \
  -d '{"name": "Neue Session Name"}'
```

### Frontend Testing
1. **Simulation durchführen** → automatische Session-Speicherung
2. **Verlauf öffnen** → Session in Liste sichtbar
3. **Session umbenennen** → Inline-Editing funktioniert
4. **Session wiederherstellen** → Wechsel zu Simulations-Tab mit wiederhergestellten Daten
5. **Session löschen** → Confirmation und Listen-Update

## 🎯 Nächste Schritte

### Kurzfristig
- [ ] Wind-Settings State-Persistierung in App.tsx (noch TODO)
- [ ] Error-Handling für ungültige Session-Daten
- [ ] Loading-Indikatoren für alle Async-Operationen

### Mittelfristig  
- [ ] Session-Export/Import (JSON/CSV)
- [ ] Session-Kategorien und Tags
- [ ] Erweiterte Filter und Suche
- [ ] Session-Vergleichstools

### Langfristig
- [ ] Session-Sharing zwischen Benutzern
- [ ] Cloud-Synchronisation
- [ ] Automated Session-Backups

---

**Implementiert:** 26. August 2025  
**Branch:** `feature/persitent-simulation-result-and-vehicle-settings`  
**Entwickler:** wolkstein
