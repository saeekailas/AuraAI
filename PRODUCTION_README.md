# AuraAI

AuraAI is an application for generating and managing text, images, videos, and audio content. It uses a React frontend and a FastAPI backend and can integrate with external AI providers.

## Features

- AI chat interface with optional memory support
- Image generation from text prompts
- Video generation (placeholder integration)
- Voice terminal for audio input/output
- Document upload and basic processing (TXT, PDF)
- Long-term memory storage with simple search
- Multi-language support
- Intent detection for basic request classification

## Technology Stack

### Frontend
- React (UI)
- TypeScript
- Vite (build tool)
- Tailwind CSS (optional)
- Font Awesome (optional)

### Backend
- FastAPI
- Uvicorn
- Optional: Google GenerativeAI SDK (Gemini) or other providers
- Pydantic
- Optional: PostgreSQL for persistence
- Optional: Redis for caching

### Infrastructure
- **Docker & Docker Compose** - Containerization
- **PostgreSQL 15** - Database
- **Redis 7** - Cache layer

docker-compose up -d
## Quick Start

### Prerequisites

- Node.js 16+ and npm
- Python 3.11+
- Docker & Docker Compose (optional)

### Local Development

Copy the example env file and update with your credentials:

```bash
cp .env.example .env
```

Install dependencies and run:

Frontend:
```bash
npm install
npm run dev
# http://localhost:3000
```

Backend:
```bash
cd backend
pip install -r requirements.txt
python main.py
# http://localhost:8000
```

Alternatively, start all services with Docker Compose:

```bash
docker-compose up -d
```
# Check status
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop services
docker-compose down

# Stop and remove volumes (careful!)
docker-compose down -v
```

#### Environment Configuration for Production

Update `.env` with production values:

```env
ENV=production
GEMINI_API_KEY=your_production_key
DB_PASSWORD=strong_production_password
ALLOWED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com
ENABLE_HTTPS=true
```

#### Deploy to Cloud

**Google Cloud Platform (GCP):**
```bash
# Build image
docker build -t gcr.io/your-project/auraai-backend:latest ./backend
docker build -t gcr.io/your-project/auraai-frontend:latest ./frontend

# Push to Container Registry
docker push gcr.io/your-project/auraai-backend:latest
docker push gcr.io/your-project/auraai-frontend:latest

# Deploy to Cloud Run
gcloud run deploy auraai-backend --image gcr.io/your-project/auraai-backend:latest
gcloud run deploy auraai-frontend --image gcr.io/your-project/auraai-frontend:latest
```

**AWS:**
```bash
# Push to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin your-account-id.dkr.ecr.region.amazonaws.com
docker tag auraai-backend:latest your-account-id.dkr.ecr.region.amazonaws.com/auraai-backend:latest
docker push your-account-id.dkr.ecr.region.amazonaws.com/auraai-backend:latest

# Deploy with ECS or EKS
```

## API Endpoints

### Health & Status
- `GET /health` - Health check
- `GET /api/status` - API status and metrics
- `GET /` - API documentation

### Chat & Text
- `POST /chat` - Send message and get response
- `POST /synthesize` - Generate summary/synthesis
- `POST /detect-intent` - Detect user intent

### Image Generation
- `POST /generate-image` - Generate image from prompt
- Example request:
```bash
curl -X POST http://localhost:8000/generate-image \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A beautiful sunset over mountains",
    "aspect_ratio": "16:9"
  }'
```

### Video Generation
- `POST /generate-video` - Generate video from prompt
- `POST /upload` - Upload files (documents, images, etc.)

### Memory Management
- `POST /ingest` - Store data in long-term memory
- `POST /query` - Search memory
- `GET /memory/all` - List all memories
- `DELETE /memory/{memory_id}` - Delete memory entry

### Chat History
- `GET /chat-history` - Get chat history
- `DELETE /chat-history` - Clear chat history

## Features in Detail

### Text Generation & Chat
- Real-time streaming responses
- Memory-aware conversations
- Multi-language support
- Web grounding for citations

### Image Generation
- Multiple aspect ratios (1:1, 3:4, 4:3, 9:16, 16:9)
- High-quality output
- Fast generation

### Video Generation
- Powered by Veo 3.1 model
- Multiple resolutions (720p, 1080p)
- Aspect ratio selection
- Async processing with status tracking

### Voice Terminal
- Real-time voice interaction
- Audio transcription
- Voice synthesis in 60+ languages
- Translator mode

### Document Processing
- Upload TXT, PDF files
- Automatic indexing
- Semantic search
- Language-specific summaries

### Long-term Memory
- Persistent conversation context
- Semantic search
- Automatic memory management
- Memory item management

## Configuration

### Frontend Configuration (vite.config.ts)
```typescript
- PORT: 3000
- API_URL: http://localhost:8000
- VITE_API_URL: Backend API endpoint
```

### Backend Configuration (main.py)
```python
- HOST: 0.0.0.0
- PORT: 8000
- ALLOWED_ORIGINS: CORS configuration
- DATABASE_URL: PostgreSQL connection
```

### Environment Variables Reference

See `.env.example` for comprehensive list including:
- API Keys (Gemini, Pinecone)
- Database settings
- Feature flags
- Cache configuration
- Upload limits
- Security settings

## Troubleshooting

### Frontend Issues

**Port 3000 already in use:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :3000
kill -9 <PID>
```

**Module not found errors:**
```bash
npm install
npm run build
```

### Backend Issues

**Port 8000 already in use:**
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :8000
kill -9 <PID>
```

**Missing API Key:**
- Ensure `GEMINI_API_KEY` is set in `.env`
- Get a free API key from [ai.google.dev](https://ai.google.dev)

**Database connection errors:**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Rebuild database container
docker-compose down
docker-compose up -d db
```

### Docker Issues

**Container won't start:**
```bash
docker-compose logs backend
docker-compose logs frontend
```

**Permission denied:**
```bash
# macOS/Linux
sudo chmod +x backend/Dockerfile
sudo chmod +x frontend/Dockerfile
```

## Performance Optimization

### Frontend
- Lazy loading of components
- Image optimization
- Code splitting
- Caching strategies

### Backend
- Connection pooling
- Caching with Redis
- Async operations
- Request pagination

### Database
- Indexes on frequently queried fields
- Connection pooling
- Regular backups
- Query optimization

## Security Considerations

1. **API Keys**: Never commit `.env` files; use environment variables
2. **HTTPS**: Enable in production (`ENABLE_HTTPS=true`)
3. **CORS**: Configure allowed origins in `.env`
4. **Database**: Use strong passwords and encrypt sensitive data
5. **Rate Limiting**: Implement in production
6. **Input Validation**: All inputs are validated by Pydantic

## Monitoring

### Docker Health Checks
- Backend: `curl http://localhost:8000/health`
- Frontend: `curl http://localhost:3000`
- Database: PostgreSQL health check

### Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Real-time
docker-compose logs -f --tail=100
```

### Metrics
- Memory usage
- CPU usage
- Request latency
- Error rates
- Cache hit rates

## Development

### Project Structure
```
auraai/
├── frontend/
│   ├── components/        # React components
│   ├── services/         # API services
│   ├── types.ts          # TypeScript types
│   ├── App.tsx           # Main component
│   └── Dockerfile        # Frontend container
├── backend/
│   ├── main.py           # FastAPI application
│   ├── requirements.txt   # Python dependencies
│   └── Dockerfile        # Backend container
├── docker-compose.yml    # Container orchestration
├── .env                  # Environment variables
├── .env.example          # Example env file
└── README.md             # This file
```

### Adding New Features

1. **Backend Endpoint:**
   - Add route to `backend/main.py`
   - Define Pydantic model for request
   - Add response model

2. **Frontend Component:**
   - Create component in `frontend/components/`
   - Add types to `frontend/types.ts`
   - Integrate into `App.tsx`
   - Call backend API via `geminiService`

### Build Commands

```bash
# Frontend
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview production build

# Backend
python main.py   # Development server
```

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the Troubleshooting section
2. Review [Google AI Studio Documentation](https://ai.google.dev)
3. Check API status at [Google Cloud Status](https://status.cloud.google.com)

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## Changelog

### Version 1.0.0 (Current)
- ✅ Complete text generation with memory
- ✅ Image generation
- ✅ Video generation (Veo 3.1)
- ✅ Voice terminal with audio I/O
- ✅ Document processing
- ✅ Multi-language support
- ✅ Docker containerization
- ✅ Production-ready API
- ✅ Long-term memory system
- ✅ Intent detection

## Roadmap

- [ ] Vector database integration (Pinecone/Weaviate)
- [ ] Advanced analytics and metrics
- [ ] User authentication and authorization
- [ ] Rate limiting and usage quotas
- [ ] WebSocket for real-time updates
- [ ] Webhook support
- [ ] File storage integration (S3)
- [ ] Advanced caching strategies
- [ ] Admin dashboard
- [ ] API key management
- [ ] Usage analytics
- [ ] Custom model support

## Related Links

- [Google AI Studio](https://aistudio.google.com)
- [Gemini API Docs](https://ai.google.dev)
- [FastAPI Docs](https://fastapi.tiangolo.com)
- [React Docs](https://react.dev)
- [Docker Docs](https://docs.docker.com)

---

**Made with ❤️ for AI enthusiasts**
