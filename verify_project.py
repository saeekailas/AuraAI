#!/usr/bin/env python3
"""
AuraAI Project Verification Script
Verifies all components are properly configure
"""

import os
import sys
import json
from pathlib import Path

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def check_file(path: str, description: str) -> bool:
    """Check if a file exists"""
    exists = os.path.isfile(path)
    status = f"{Colors.GREEN}✓{Colors.END}" if exists else f"{Colors.RED}✗{Colors.END}"
    print(f"{status} {description}: {path}")
    return exists

def check_dir(path: str, description: str) -> bool:
    """Check if a directory exists"""
    exists = os.path.isdir(path)
    status = f"{Colors.GREEN}✓{Colors.END}" if exists else f"{Colors.RED}✗{Colors.END}"
    print(f"{status} {description}: {path}")
    return exists

def check_file_content(path: str, keywords: list) -> bool:
    """Check if file contains specific keywords"""
    try:
        with open(path, 'r') as f:
            content = f.read()
            missing = [k for k in keywords if k not in content]
            if not missing:
                return True
            print(f"  {Colors.YELLOW}Warning: Missing keywords in {path}: {missing}{Colors.END}")
            return False
    except:
        return False

def main():
    print(f"\n{Colors.BLUE}{'='*60}")
    print("AuraAI Project Verification")
    print(f"{'='*60}{Colors.END}\n")
    
    passed = 0
    failed = 0
    
    # Check directories
    print(f"{Colors.BLUE}Checking Directory Structure...{Colors.END}")
    dirs_to_check = [
        ("backend", "Backend directory"),
        ("frontend", "Frontend directory"),
        ("frontend/components", "Frontend components"),
        ("frontend/services", "Frontend services"),
        ("dist", "Frontend build output"),
    ]
    
    for dir_path, desc in dirs_to_check:
        if check_dir(dir_path, desc):
            passed += 1
        else:
            failed += 1
    
    # Check backend files
    print(f"\n{Colors.BLUE}Checking Backend Files...{Colors.END}")
    backend_files = [
        ("backend/main.py", "FastAPI main application"),
        ("backend/Dockerfile", "Backend Docker configuration"),
        ("backend/requirements.txt", "Python dependencies"),
        ("backend/test_api.py", "API test suite"),
    ]
    
    for file_path, desc in backend_files:
        if check_file(file_path, desc):
            passed += 1
        else:
            failed += 1
    
    # Check frontend files
    print(f"\n{Colors.BLUE}Checking Frontend Files...{Colors.END}")
    frontend_files = [
        ("frontend/Dockerfile", "Frontend Docker configuration"),
        ("frontend/App.tsx", "Main React component"),
        ("frontend/types.ts", "TypeScript types"),
        ("frontend/services/geminiService.ts", "Gemini API service"),
    ]
    
    for file_path, desc in frontend_files:
        if check_file(file_path, desc):
            passed += 1
        else:
            failed += 1
    
    # Check configuration files
    print(f"\n{Colors.BLUE}Checking Configuration Files...{Colors.END}")
    config_files = [
        (".env", "Environment variables"),
        (".env.example", "Environment template"),
        ("docker-compose.yml", "Docker Compose configuration"),
        ("vite.config.ts", "Vite configuration"),
        ("tsconfig.json", "TypeScript configuration"),
        ("package.json", "NPM configuration"),
    ]
    
    for file_path, desc in config_files:
        if check_file(file_path, desc):
            passed += 1
        else:
            failed += 1
    
    # Check documentation
    print(f"\n{Colors.BLUE}Checking Documentation...{Colors.END}")
    docs = [
        ("PRODUCTION_README.md", "Production README"),
        ("DEPLOYMENT_GUIDE.md", "Deployment Guide"),
        ("DEPLOYMENT_CHECKLIST.md", "Deployment Checklist"),
        ("PROJECT_SUMMARY.md", "Project Summary"),
        ("QUICK_REFERENCE.md", "Quick Reference"),
        ("README.md", "Original README"),
    ]
    
    for file_path, desc in docs:
        if check_file(file_path, desc):
            passed += 1
        else:
            failed += 1
    
    # Check setup scripts
    print(f"\n{Colors.BLUE}Checking Setup Scripts...{Colors.END}")
    scripts = [
        ("setup.sh", "Linux/macOS setup script"),
        ("setup.bat", "Windows setup script"),
    ]
    
    for file_path, desc in scripts:
        if check_file(file_path, desc):
            passed += 1
        else:
            failed += 1
    
    # Verify key content
    print(f"\n{Colors.BLUE}Verifying Key Components...{Colors.END}")
    
    # Check backend has required endpoints
    if check_file_content("backend/main.py", [
        "@app.get('/health')",
        "@app.post('/chat')",
        "def ingest_memory",
        "async def query_memory",
        "/generate-image",
        "/generate-video"
    ]):
        print(f"{Colors.GREEN}✓{Colors.END} Backend has all required endpoints")
        passed += 1
    else:
        print(f"{Colors.RED}✗{Colors.END} Backend missing some endpoints")
        failed += 1
    
    # Check frontend service
    if check_file_content("frontend/services/geminiService.ts", [
        "class GeminiService",
        "generateSynthesis",
        "generateImage",
        "generateVideo",
        "commitToLongTermMemory"
    ]):
        print(f"{Colors.GREEN}✓{Colors.END} Frontend service is complete")
        passed += 1
    else:
        print(f"{Colors.RED}✗{Colors.END} Frontend service incomplete")
        failed += 1
    
    # Check Docker Compose
    if check_file_content("docker-compose.yml", [
        "services:",
        "backend:",
        "frontend:",
        "db:",
        "redis:"
    ]):
        print(f"{Colors.GREEN}✓{Colors.END} Docker Compose is configured")
        passed += 1
    else:
        print(f"{Colors.RED}✗{Colors.END} Docker Compose needs verification")
        failed += 1
    
    # Check environment config
    if os.path.isfile(".env"):
        try:
            with open(".env", "r") as f:
                content = f.read()
                if "GEMINI_API_KEY" in content:
                    print(f"{Colors.GREEN}✓{Colors.END} Environment variables configured")
                    passed += 1
                else:
                    print(f"{Colors.YELLOW}⚠{Colors.END} GEMINI_API_KEY not set")
                    failed += 1
        except:
            failed += 1
    else:
        print(f"{Colors.RED}✗{Colors.END} .env file not found")
        failed += 1
    
    # Check build artifacts
    print(f"\n{Colors.BLUE}Checking Build Artifacts...{Colors.END}")
    if check_file("dist/index.html", "Frontend build exists"):
        passed += 1
    else:
        print(f"{Colors.YELLOW}⚠{Colors.END} Frontend needs to be built: npm run build")
        failed += 1
    
    # Summary
    print(f"\n{Colors.BLUE}{'='*60}")
    print(f"Verification Summary")
    print(f"{'='*60}{Colors.END}")
    print(f"{Colors.GREEN}Passed: {passed}{Colors.END}")
    print(f"{Colors.RED}Failed: {failed}{Colors.END}")
    print(f"Total:  {passed + failed}")
    
    if failed == 0:
        print(f"\n{Colors.GREEN}✓ All checks passed! Project is ready for deployment.{Colors.END}")
        print(f"\n{Colors.BLUE}Next Steps:{Colors.END}")
        print(f"1. Update .env with your GEMINI_API_KEY")
        print(f"2. Run: docker-compose up -d")
        print(f"3. Test: curl http://localhost:8000/health")
        print(f"4. Check API docs: http://localhost:8000/docs")
        return 0
    else:
        print(f"\n{Colors.RED}✗ Some checks failed. Please review above.{Colors.END}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
