# 🚁 Flight Energy Simulation - Installation & Start

## ⚡ Schnellstart (Docker)

```bash
# 1. In das Projektverzeichnis wechseln
cd BatterieSimulation

# 2. Anwendung starten
./build.sh
```

**Das war's!** Die Anwendung ist jetzt verfügbar unter http://localhost:3000

## 🔧 Manuelle Installation

### Voraussetzungen
- Docker & Docker Compose
- (Optional) Python 3.11+ und Node.js 18+ für lokale Entwicklung

### Schritt für Schritt

1. **Docker Compose starten:**
```bash
sudo docker-compose up -d
```

2. **Warten bis alle Services laufen:**
```bash
# Status prüfen
sudo docker-compose ps

# Logs anschauen
sudo docker-compose logs -f
```

3. **Anwendung öffnen:**
- Web-Interface: http://localhost:3000
- API: http://localhost:8000
- API Dokumentation: http://localhost:8000/docs

## 📋 Funktionen testen

1. **Fahrzeugtyp wählen:** Quadcopter, VTOL oder Plane
2. **Parameter einstellen:** Masse, Leistung, Batterie etc.
3. **Wegpunkte setzen:** Klicken Sie auf die Karte oder geben Sie Koordinaten ein
4. **Simulation starten:** Button "Simulation starten"
5. **Ergebnisse ansehen:** Energieverbrauch, Batteriestatus, Diagramme

## 🌪️ Windfinder API (Optional)

Für echte Winddaten:
1. API Key von windfinder.com besorgen
2. In `.env` eintragen: `WINDFINDER_API_KEY=ihr_api_key`
3. Container neu starten: `sudo docker-compose restart`

**Hinweis:** Auch ohne API Key funktioniert die Simulation mit realistischen Fallback-Winddaten.

## 🛠️ Entwicklung

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

## ❌ Probleme lösen

**Port bereits belegt?**
```bash
# Andere Ports in docker-compose.yml verwenden
# z.B. Frontend: 3001:3000, Backend: 8001:8000
```

**Services starten nicht?**
```bash
# Alle Container stoppen und neu starten
sudo docker-compose down
sudo docker-compose up --build -d
```

**Datenbank Probleme?**
```bash
# Datenbank zurücksetzen
sudo docker-compose down -v
sudo docker-compose up -d
```

## 📞 Support

Bei Problemen:
1. `sudo docker-compose logs` für Logs
2. Prüfen Sie die DEVELOPMENT.md für Details
3. Ports 3000, 8000, 5432 müssen frei sein
4. **Docker ohne sudo verwenden:** `sudo usermod -aG docker $USER` (Neuanmeldung erforderlich)
