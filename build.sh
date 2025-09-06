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

# Enhanced health checks with retries
echo "🏥 Performing health checks..."

# Function for retrying health checks
check_service() {
    local service_name=$1
    local url=$2
    local max_retries=10
    local retry_count=0
    
    while [ $retry_count -lt $max_retries ]; do
        if curl -f -s "$url" > /dev/null 2>&1; then
            echo "✅ $service_name is running"
            return 0
        fi
        
        retry_count=$((retry_count + 1))
        echo "⏳ Waiting for $service_name... (attempt $retry_count/$max_retries)"
        sleep 3
    done
    
    echo "❌ $service_name health check failed after $max_retries attempts"
    echo "📋 $service_name logs:"
    sudo docker-compose logs "$service_name"
    return 1
}

# Check services with retries
check_service "Backend" "http://localhost:8000/"
check_service "Frontend" "http://localhost:3000/"

# Enhanced database check
if sudo docker-compose exec db pg_isready -U postgres > /dev/null 2>&1; then
    echo "✅ Database is running and accepting connections"
else
    echo "❌ Database is not ready"
    echo "📋 Database logs:"
    sudo docker-compose logs db
fi

# Container status check
echo "📋 Container Status:"
sudo docker-compose ps

echo ""
echo "🎉 Application is ready!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔗 Backend API: http://localhost:8000"  
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "🧪 Run API tests: ./test_api.sh"
echo "📋 To stop: sudo docker-compose down"
echo "📋 To view logs: sudo docker-compose logs -f"
echo "📋 To reset database: sudo docker-compose down -v"
