# AuraAI Deployment Guide

## Overview

This document describes deployment steps for the AuraAI application. The main components are:
- Frontend: React + Vite
- Backend: FastAPI + Python
- Optional: PostgreSQL for persistence
- Optional: Redis for caching
- Optional: Docker & Docker Compose for containerized deployments

## Table of Contents

1. [Pre-Deployment Requirements](#pre-deployment-requirements)
2. [Local Development Setup](#local-development-setup)
3. [Docker Containerized Deployment](#docker-containerized-deployment)
4. [Cloud Deployment](#cloud-deployment)
5. [Configuration Management](#configuration-management)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Troubleshooting](#troubleshooting)

## Pre-Deployment Requirements

### 1. System Requirements

**Minimum:**
- CPU: 2 cores
- RAM: 4 GB
- Storage: 20 GB SSD
- Network: 100 Mbps

**Recommended for Production:**
- CPU: 4+ cores
- RAM: 8+ GB
- Storage: 50 GB SSD
- Network: 1 Gbps

### 2. Software Requirements

- Docker 20.10+ with Docker Compose 2.0+
- Python 3.11+
- Node.js 20+ LTS
- PostgreSQL 15 (if not using Docker)
- Redis 7 (if not using Docker)

### 3. API Keys & Credentials

Before deployment, obtain:
- **Google Gemini API Key**: https://ai.google.dev
- **Domain Name**: For your application
- **SSL/TLS Certificate**: Let's Encrypt (free) or commercial provider
- **Database Credentials**: Strong passwords for PostgreSQL

## Local Development Setup

### 1. Clone Repository

```bash
cd /path/to/your/projects
git clone <repository-url> AuraAI
cd AuraAI
```

### 2. Run Setup Script (optional)

Use the included setup scripts to automate environment setup. If you prefer manual steps, skip this.

Windows:
```bash
./setup.bat
```

macOS/Linux:
```bash
chmod +x setup.sh
./setup.sh
```

### 3. Manual Setup (If scripts don't work)

**Frontend:**
```bash
npm install
npm run build
```

**Backend:**
```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 4. Environment Configuration

Copy the example and edit values before running the services:

```bash
cp .env.example .env
# Edit .env with your values
```

At minimum, set the provider API key and environment:

```env
GEMINI_API_KEY=your_api_key
ENV=development
```

### 5. Run Locally

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
python main.py
# Backend runs on http://localhost:8000
```

**Terminal 2 - Frontend:**
```bash
npm run dev
# Frontend runs on http://localhost:3000
```

**Access:**
- Frontend: http://localhost:3000
- API Docs: http://localhost:8000/docs

## Docker Containerized Deployment

### 1. Prerequisites

Install Docker Desktop:
- https://www.docker.com/products/docker-desktop (Windows/macOS)
- https://docs.docker.com/engine/install/ (Linux)

Verify installation:
```bash
docker --version
docker-compose --version
```

### 2. Configure Environment

Update `.env` with production values:

```env
# Core Configuration
ENV=production
GEMINI_API_KEY=your_production_key
PINECONE_API_KEY=your_pinecone_key

# Database
DB_USER=auraai
DB_PASSWORD=very_strong_password_here_minimum_16_chars
DB_NAME=auraai_db

# Application
HOST=0.0.0.0
PORT=8000
VITE_API_URL=http://localhost:8000

# Security
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://frontend:3000

# Features
ENABLE_TEXT_GENERATION=true
ENABLE_IMAGE_GENERATION=true
ENABLE_VIDEO_GENERATION=true
ENABLE_AUDIO_GENERATION=true
```

### 3. Build Docker Images

```bash
# Build all services
docker-compose build

# Or build specific services
docker-compose build backend
docker-compose build frontend
```

### 4. Start Services

```bash
# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 5. Verify Deployment

```bash
# Check service status
docker-compose ps

# Test backend
curl http://localhost:8000/health

# Test frontend
curl http://localhost:3000

# Run test suite
cd backend
python test_api.py
```

Expected output:
```
Container: auraai-backend   Status: Up
Container: auraai-frontend  Status: Up
Container: auraai-db        Status: Up
Container: auraai-redis     Status: Up
```

### 6. Database Migration (If Using PostgreSQL)

```bash
# Access database container
docker-compose exec db psql -U auraai -d auraai_db

# Or run migrations (if set up)
docker-compose exec backend alembic upgrade head
```

### 7. Stop & Cleanup

```bash
# Stop services (keeps data)
docker-compose down

# Remove everything including volumes
docker-compose down -v

# Restart
docker-compose restart
```

## Cloud Deployment

### Google Cloud Platform (GCP)

#### Option 1: Cloud Run (Serverless)

```bash
# Build and push to Container Registry
gcloud auth configure-docker

# Backend
docker build -t gcr.io/your-project/auraai-backend:latest ./backend
docker push gcr.io/your-project/auraai-backend:latest

# Frontend
docker build -t gcr.io/your-project/auraai-frontend:latest ./frontend
docker push gcr.io/your-project/auraai-frontend:latest

# Deploy backend
gcloud run deploy auraai-backend \
  --image gcr.io/your-project/auraai-backend:latest \
  --platform managed \
  --region us-central1 \
  --memory 4Gi \
  --set-env-vars GEMINI_API_KEY=your_key

# Deploy frontend
gcloud run deploy auraai-frontend \
  --image gcr.io/your-project/auraai-frontend:latest \
  --platform managed \
  --region us-central1 \
  --memory 2Gi
```

#### Option 2: Google Kubernetes Engine (GKE)

```bash
# Create cluster
gcloud container clusters create auraai-cluster \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type n1-standard-2

# Deploy via kubectl (create deployment.yaml first)
kubectl apply -f deployment.yaml

# Expose services
kubectl expose deployment auraai-backend --type LoadBalancer --port 8000
kubectl expose deployment auraai-frontend --type LoadBalancer --port 3000
```

### AWS

#### Option 1: EC2

```bash
# Launch EC2 instance
# AMI: Ubuntu 22.04 LTS
# Type: t3.medium or larger

# SSH into instance
ssh -i your-key.pem ubuntu@your-instance-ip

# Install Docker
sudo apt update
sudo apt install docker.io docker-compose
sudo usermod -aG docker ubuntu

# Clone repository
git clone <repository-url>
cd AuraAI

# Configure .env
nano .env

# Start services
docker-compose up -d
```

#### Option 2: ECS (Elastic Container Service)

```bash
# Create ECR repositories
aws ecr create-repository --repository-name auraai-backend
aws ecr create-repository --repository-name auraai-frontend

# Push images
docker tag auraai-backend:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/auraai-backend:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/auraai-backend:latest

# Create ECS cluster and services via AWS Console or CLI
```

### DigitalOcean

```bash
# Create Droplet (4GB minimum)
# OS: Ubuntu 22.04

# SSH into Droplet
ssh root@your-droplet-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Clone and deploy
git clone <repository-url>
cd AuraAI
docker-compose up -d
```

## Configuration Management

### Environment Variables

See `.env.example` for complete list. Key variables:

```env
# Required
GEMINI_API_KEY=                # Get from https://ai.google.dev

# Database
DB_USER=auraai
DB_PASSWORD=                   # Change this!
DB_NAME=auraai_db
DB_HOST=db                     # or your DB host

# Application
ENV=production                 # development or production
HOST=0.0.0.0
PORT=8000
VITE_API_URL=http://localhost:8000

# Security
ALLOWED_ORIGINS=your-domain.com
ENABLE_HTTPS=true
SECRET_KEY=                    # Change this!

# Optional
REDIS_URL=redis://redis:6379
PINECONE_API_KEY=              # For vector search
```

### SSL/TLS Configuration

Using Let's Encrypt with Nginx:

```bash
# Install Nginx
sudo apt install nginx certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --standalone -d your-domain.com

# Configure Nginx
sudo nano /etc/nginx/sites-available/default

# Add to Nginx config:
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
    }
    
    location /api {
        proxy_pass http://localhost:8000;
    }
}

# Restart Nginx
sudo systemctl restart nginx
```

### Database Backup

```bash
# Manual backup
docker-compose exec db pg_dump -U auraai auraai_db > backup.sql

# Automated backup (add to crontab)
0 2 * * * docker-compose exec -T db pg_dump -U auraai auraai_db | gzip > /backups/auraai_$(date +\%Y\%m\%d).sql.gz
```

## Monitoring & Maintenance

### Health Checks

```bash
# Backend health
curl http://localhost:8000/health

# Frontend health
curl http://localhost:3000

# Database connection
docker-compose exec db pg_isready
```

### Logs

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f backend

# Real-time logs with timestamps
docker-compose logs -f --timestamps backend
```

### Performance Monitoring

Install monitoring tools:

```bash
# Using Prometheus + Grafana (optional)
docker run -d --name prometheus \
  -v /path/to/prometheus.yml:/etc/prometheus/prometheus.yml \
  -p 9090:9090 prom/prometheus

docker run -d --name grafana \
  -p 3001:3000 grafana/grafana
```

### Database Maintenance

```bash
# Connect to database
docker-compose exec db psql -U auraai -d auraai_db

# List tables
\dt

# Vacuum (cleanup)
VACUUM ANALYZE;

# Check database size
SELECT pg_size_pretty(pg_database_size('auraai_db'));

# Exit
\q
```

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Find process using port
lsof -i :8000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in docker-compose.yml
```

#### API Key Issues

```bash
# Verify key is set
echo $GEMINI_API_KEY

# Check in container
docker-compose exec backend printenv GEMINI_API_KEY

# Update .env and restart
docker-compose down
docker-compose up -d
```

#### Database Connection Issues

```bash
# Check database is running
docker-compose ps db

# View database logs
docker-compose logs db

# Restart database
docker-compose restart db

# Check environment variables
docker-compose exec backend printenv | grep DB_
```

#### Memory Issues

```bash
# Check container resource usage
docker stats

# Increase container memory in docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 2G
```

#### SSL Certificate Issues

```bash
# Check certificate
sudo openssl x509 -in /etc/letsencrypt/live/your-domain.com/fullchain.pem -text

# Renew certificate
sudo certbot renew

# Auto-renewal (check status)
sudo systemctl status certbot.timer
```

### Performance Tuning

#### Frontend Optimization
```bash
# Check bundle size
npm run build -- --analyze

# Enable gzip compression in Nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
```

#### Backend Optimization
```bash
# Adjust worker count (in docker-compose.yml)
command: uvicorn main:app --workers 4 --host 0.0.0.0 --port 8000

# Enable Redis caching
# Update environment: REDIS_URL=redis://redis:6379
```

#### Database Optimization
```sql
-- Create indexes
CREATE INDEX idx_memory_timestamp ON memory(timestamp);
CREATE INDEX idx_chat_history_user_id ON chat_history(user_id);

-- Analyze query plans
EXPLAIN ANALYZE SELECT * FROM memory WHERE timestamp > NOW() - INTERVAL '7 days';
```

## Maintenance Checklist

### Daily
- [ ] Monitor error logs
- [ ] Check system health (CPU, RAM, disk)
- [ ] Verify backups completed

### Weekly
- [ ] Review performance metrics
- [ ] Update dependencies (minor)
- [ ] Test backup restoration

### Monthly
- [ ] Security audit
- [ ] Database optimization
- [ ] Capacity planning review

### Quarterly
- [ ] Disaster recovery drill
- [ ] Security penetration test
- [ ] Major dependency updates

## Support & Resources

- **Google Gemini API**: https://ai.google.dev
- **FastAPI Docs**: https://fastapi.tiangolo.com
- **Docker Docs**: https://docs.docker.com
- **PostgreSQL Docs**: https://www.postgresql.org/docs

## Rollback Procedure

If issues occur after deployment:

```bash
# Stop current version
docker-compose down

# Revert code to previous commit
git checkout previous-commit-hash

# Restore database from backup (if needed)
docker-compose exec db psql -U auraai -d auraai_db < backup.sql

# Rebuild and restart
docker-compose build
docker-compose up -d

# Verify
docker-compose logs -f
```

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Status**: Production Ready

For additional support, refer to `PRODUCTION_README.md` and `DEPLOYMENT_CHECKLIST.md`.
