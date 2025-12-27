# AuraAI Quick Reference

## Quick Start Commands

### Windows
```bash
# Run setup
setup.bat

# Or manual setup
npm install
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### macOS/Linux
```bash
# Run setup
chmod +x setup.sh
./setup.sh

# Or manual setup
npm install
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

## Docker Commands

```bash
# Build all services
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Check status
docker-compose ps
```

## URL Endpoints

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:3000 | Web interface |
| Backend | http://localhost:8000 | API server |
| API Docs | http://localhost:8000/docs | Swagger UI |
| ReDoc | http://localhost:8000/redoc | ReDoc docs |
| Health | http://localhost:8000/health | Health check |

## Testing

```bash
# Test all endpoints
cd backend
python test_api.py

# Test specific endpoint
curl http://localhost:8000/health
curl http://localhost:3000

# Check logs
docker-compose logs -f
```

## Key Files

| File | Purpose |
|------|---------|
| `backend/main.py` | FastAPI backend application |
| `frontend/services/geminiService.ts` | API service layer |
| `docker-compose.yml` | Container orchestration |
| `.env` | Environment configuration |
| `.env.example` | Configuration template |
| `PRODUCTION_README.md` | Full documentation |
| `DEPLOYMENT_GUIDE.md` | Deployment instructions |
| `PROJECT_SUMMARY.md` | Build summary |

## Configuration

### Essential Environment Variables

```env
# Required
GEMINI_API_KEY=your_key_here

# Database
DB_USER=auraai
DB_PASSWORD=secure_password
DB_NAME=auraai_db

# Application
ENV=production
VITE_API_URL=http://localhost:8000
```

## Security Checklist

- [ ] Update `.env` with actual API keys
- [ ] Never commit `.env` to git
- [ ] Use strong database passwords (16+ chars)
- [ ] Enable HTTPS in production
- [ ] Configure CORS origins
- [ ] Set up SSL/TLS certificates
- [ ] Review CORS settings
- [ ] Monitor API usage

## API Endpoints

### Health & Status
- `GET /health` - Health check
- `GET /api/status` - API status
- `GET /` - API info

### Chat & Text
- `POST /chat` - Send message
- `POST /synthesize` - Generate summary
- `POST /detect-intent` - Detect intent

### Media
- `POST /generate-image` - Image generation
- `POST /generate-video` - Video generation
- `POST /upload` - File upload

### Memory
- `POST /ingest` - Store memory
- `POST /query` - Search memory
- `GET /memory/all` - List memories
- `DELETE /memory/{id}` - Delete memory

### History
- `GET /chat-history` - Chat history
- `DELETE /chat-history` - Clear history

## Common Issues & Solutions

### Port Already in Use
```bash
# Find and kill process
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :8000
kill -9 <PID>
```

### API Key Not Working
```bash
# Check environment variable
echo $GEMINI_API_KEY

# Update .env and restart
docker-compose down
docker-compose up -d
```

### Database Connection Error
```bash
# Check PostgreSQL is running
docker-compose ps db

# Restart database
docker-compose restart db
```

### Build Issues
```bash
# Clean rebuild
rm -rf node_modules dist
npm install
npm run build
```

## Performance Tips

### Frontend
- Use DevTools to check bundle size
- Enable gzip compression
- Use CDN for static assets
- Cache-bust with file hashing

### Backend
- Use connection pooling
- Enable Redis caching
- Optimize database queries
- Monitor request latency

## 📚 Documentation

- **PRODUCTION_README.md** - Features, setup, API docs
- **DEPLOYMENT_GUIDE.md** - Deployment to cloud
- **DEPLOYMENT_CHECKLIST.md** - Pre-launch checklist
- **PROJECT_SUMMARY.md** - Build summary
- **README.md** - Original quick start

## 🌐 Cloud Deployment

### GCP
```bash
gcloud run deploy auraai-backend --image gcr.io/your-project/auraai-backend:latest
gcloud run deploy auraai-frontend --image gcr.io/your-project/auraai-frontend:latest
```

### AWS
```bash
# Push to ECR
docker push your-account.dkr.ecr.region.amazonaws.com/auraai-backend:latest
```

### DigitalOcean
```bash
# SSH to droplet
ssh root@your-droplet-ip

# Clone and deploy
git clone <repo>
docker-compose up -d
```

## 📞 Support Resources

- **Gemini API**: https://ai.google.dev
- **FastAPI**: https://fastapi.tiangolo.com
- **Docker**: https://docs.docker.com
- **React**: https://react.dev

## ✨ Features

✅ **Text Generation** - Chat with AI  
✅ **Image Generation** - Create images  
✅ **Video Generation** - Veo 3.1 support  
✅ **Voice/Audio** - Real-time audio  
✅ **Memory System** - Long-term memory  
✅ **Document Upload** - PDF/TXT support  
✅ **Multi-language** - 60+ languages  
✅ **Web Grounding** - Citations & sources  

## 🎯 Deployment Status

✅ Backend: Production Ready  
✅ Frontend: Production Ready  
✅ Docker: Fully Configured  
✅ API: Complete & Documented  
✅ Database: Configured  
✅ Tests: Included  

---

**Version**: 1.0.0 | **Status**: Production Ready | **Updated**: December 2024

For detailed information, see `PRODUCTION_README.md` or `DEPLOYMENT_GUIDE.md`
