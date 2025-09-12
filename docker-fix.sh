#!/bin/bash

echo "🐳 Docker Container Fix"

# Stop alles
echo "Stoppe alle Container..."
docker-compose down

# Remove problematische Container
echo "Entferne problematische Container..."
docker container prune -f

# Remove problematische Images
echo "Entferne alte Images..."
docker image prune -f

# Rebuild komplett
echo "🔨 Rebuild Frontend..."
docker-compose build --no-cache frontend

# Restart alles
echo "🚀 Starte Services..."
docker-compose up -d

echo "✅ Docker Fix abgeschlossen"
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:8000"