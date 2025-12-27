#!/bin/bash

# AuraAI Quick Start Script
# This script helps you set up and run AuraAI

set -e

echo "========================================"
echo "🚀 AuraAI Quick Start Setup"
echo "========================================"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
check_prerequisites() {
    echo "${YELLOW}Checking prerequisites...${NC}"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo "${RED}❌ Node.js is not installed. Please install Node.js 20+${NC}"
        exit 1
    fi
    echo "${GREEN}✓ Node.js $(node --version)${NC}"
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        echo "${RED}❌ Python3 is not installed. Please install Python 3.11+${NC}"
        exit 1
    fi
    echo "${GREEN}✓ Python $(python3 --version)${NC}"
    
    # Check Docker (optional)
    if command -v docker &> /dev/null; then
        echo "${GREEN}✓ Docker $(docker --version)${NC}"
    else
        echo "${YELLOW}⚠️  Docker not found (optional for containerized deployment)${NC}"
    fi
    
    echo ""
}

# Setup environment
setup_environment() {
    echo "${YELLOW}Setting up environment variables...${NC}"
    
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            echo "${GREEN}✓ Created .env from .env.example${NC}"
            echo "${RED}⚠️  Please update GEMINI_API_KEY in .env with your actual API key${NC}"
        else
            echo "${RED}❌ .env.example not found${NC}"
            exit 1
        fi
    else
        echo "${GREEN}✓ .env already exists${NC}"
    fi
    
    # Check if GEMINI_API_KEY is set
    if grep -q "GEMINI_API_KEY=your_gemini_api_key_here" .env; then
        echo "${RED}❌ GEMINI_API_KEY not configured. Please set it in .env${NC}"
        echo "   Get your key from: https://ai.google.dev"
        exit 1
    fi
    
    echo ""
}

# Install dependencies
install_dependencies() {
    echo "${YELLOW}Installing dependencies...${NC}"
    
    # Frontend dependencies
    echo "Installing frontend dependencies..."
    npm install
    echo "${GREEN}✓ Frontend dependencies installed${NC}"
    
    # Backend dependencies
    echo "Installing backend dependencies..."
    cd backend
    python3 -m venv venv
    if [ -f venv/bin/activate ]; then
        source venv/bin/activate
    elif [ -f venv/Scripts/activate ]; then
        source venv/Scripts/activate
    fi
    pip install --upgrade pip
    pip install -r requirements.txt
    deactivate
    cd ..
    echo "${GREEN}✓ Backend dependencies installed${NC}"
    
    echo ""
}

# Build frontend
build_frontend() {
    echo "${YELLOW}Building frontend...${NC}"
    npm run build
    echo "${GREEN}✓ Frontend built successfully${NC}"
    echo ""
}

# Show next steps
show_next_steps() {
    echo "${GREEN}========================================"
    echo "✅ Setup Complete!"
    echo "========================================${NC}"
    echo ""
    echo "📝 Next Steps:"
    echo ""
    echo "1. Start Backend (Terminal 1):"
    echo "   ${YELLOW}cd backend && python main.py${NC}"
    echo ""
    echo "2. Start Frontend (Terminal 2):"
    echo "   ${YELLOW}npm run dev${NC}"
    echo ""
    echo "3. Open in browser:"
    echo "   ${YELLOW}http://localhost:3000${NC}"
    echo ""
    echo "4. API Documentation:"
    echo "   ${YELLOW}http://localhost:8000/docs${NC}"
    echo ""
    echo "📚 For Docker deployment:"
    echo "   ${YELLOW}docker-compose up -d${NC}"
    echo ""
    echo "🔗 Resources:"
    echo "   - Documentation: ${YELLOW}./PRODUCTION_README.md${NC}"
    echo "   - Environment Template: ${YELLOW}./.env.example${NC}"
    echo "   - Gemini API Docs: ${YELLOW}https://ai.google.dev${NC}"
    echo ""
}

# Main execution
main() {
    check_prerequisites
    setup_environment
    install_dependencies
    build_frontend
    show_next_steps
}

# Run main function
main
