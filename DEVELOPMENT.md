# Entwicklungsanweisungen

## Lokale Entwicklung

### Backend starten

```bash
cd backend

# Python-Umgebung erstellen und aktivieren
python -m venv venv
source venv/bin/activate

# Abhängigkeiten installieren
pip install -r requirements.txt

# Umgebungsvariablen setzen
export WINDFINDER_API_KEY="your_api_key_here"
export DATABASE_URL="sqlite:///./simulation.db"

# Backend starten
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend starten

```bash
cd frontend

# Abhängigkeiten installieren
npm install

# Frontend starten
npm start
```

Die Anwendung ist dann verfügbar unter:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Dokumentation: http://localhost:8000/docs

## Docker Deployment

### Mit Docker Compose (empfohlen)

```bash
# Alle Services starten
docker-compose up -d

# Logs anzeigen
docker-compose logs -f

# Services stoppen
docker-compose down
```

### Einzelne Container

```bash
# Backend
cd backend
docker build -t flight-energy-backend .
docker run -p 8000:8000 -e WINDFINDER_API_KEY="your_key" flight-energy-backend

# Frontend
cd frontend
docker build -t flight-energy-frontend .
docker run -p 3000:3000 flight-energy-frontend
```

## Erste Schritte

1. Windfinder API Key besorgen (optional - Fallback ist implementiert)
2. .env Datei anpassen
3. `docker-compose up -d` ausführen
4. Browser öffnen: http://localhost:3000

## API Testing

```bash
# Health Check
curl http://localhost:8000/

# Verfügbare Fahrzeuge
curl http://localhost:8000/api/vehicles

# Winddaten testen
curl "http://localhost:8000/api/wind/48.1351/11.5820/100"
```

## Troubleshooting

### Backend Probleme
- Port 8000 bereits belegt: anderen Port in docker-compose.yml verwenden
- Datenbankfehler: Volume löschen und neu starten

### Frontend Probleme  
- Node.js Version prüfen (>=16 erforderlich)
- npm cache clean bei Installationsproblemen

### Docker Probleme
- `docker-compose down -v` um Volumes zu löschen
- `docker system prune` um alte Container zu entfernen
