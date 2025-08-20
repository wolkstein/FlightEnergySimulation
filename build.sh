# Build Script für Flight Energy Simulation

echo "🚀 Building Flight Energy Simulation..."

# Backend build check
echo "📋 Checking Backend..."
cd backend

if [ ! -f "requirements.txt" ]; then
    echo "❌ requirements.txt not found"
    exit 1
fi

echo "✅ Backend files OK"
cd ..

# Frontend build check  
echo "📋 Checking Frontend..."
cd frontend

if [ ! -f "package.json" ]; then
    echo "❌ package.json not found"
    exit 1
fi

echo "✅ Frontend files OK"
cd ..

# Docker Compose Check
echo "📋 Checking Docker Compose..."
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ docker-compose.yml not found"
    exit 1
fi

echo "✅ Docker Compose OK"

# Start the application
echo "🔨 Building and starting with Docker Compose..."
sudo docker-compose up --build -d

echo "⏳ Waiting for services to start..."
sleep 10

# Health checks
echo "🏥 Performing health checks..."

# Check Backend
if curl -f -s http://localhost:8000/ > /dev/null; then
    echo "✅ Backend is running (Port 8000)"
else
    echo "❌ Backend health check failed"
    echo "📋 Backend logs:"
    sudo docker-compose logs backend
fi

# Check Frontend
if curl -f -s http://localhost:3000/ > /dev/null; then
    echo "✅ Frontend is running (Port 3000)"  
else
    echo "❌ Frontend health check failed"
    echo "📋 Frontend logs:"
    sudo docker-compose logs frontend
fi

# Check Database
if sudo docker-compose ps db | grep -q "Up"; then
    echo "✅ Database is running"
else
    echo "❌ Database is not running"
fi

echo ""
echo "🎉 Application is ready!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔗 Backend API: http://localhost:8000"  
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "📋 To stop: sudo docker-compose down"
echo "📋 To view logs: sudo docker-compose logs -f"
