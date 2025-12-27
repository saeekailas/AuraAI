#!/usr/bin/env python3
"""
AuraAI Backend Test Suite
Tests all major endpoints and functionality
"""

import asyncio
import json
import sys
from typing import Dict, Any
import httpx

# Configuration
BASE_URL = "http://localhost:8000"
TIMEOUT = 10.0

class Colors:
    """ANSI color codes"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

class TestResults:
    """Track test results"""
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.skipped = 0
        self.tests = []
    
    def add_pass(self, test_name: str, message: str = ""):
        self.passed += 1
        self.tests.append(("PASS", test_name, message))
        print(f"{Colors.GREEN}✓ {test_name}{Colors.END}")
        if message:
            print(f"  {message}")
    
    def add_fail(self, test_name: str, error: str):
        self.failed += 1
        self.tests.append(("FAIL", test_name, error))
        print(f"{Colors.RED}✗ {test_name}{Colors.END}")
        print(f"  Error: {error}")
    
    def add_skip(self, test_name: str, reason: str = ""):
        self.skipped += 1
        self.tests.append(("SKIP", test_name, reason))
        print(f"{Colors.YELLOW}⊘ {test_name}{Colors.END}")
        if reason:
            print(f"  Reason: {reason}")
    
    def summary(self) -> str:
        total = self.passed + self.failed + self.skipped
        return f"\n{'='*60}\nTotal: {total} | Passed: {Colors.GREEN}{self.passed}{Colors.END} | Failed: {Colors.RED}{self.failed}{Colors.END} | Skipped: {Colors.YELLOW}{self.skipped}{Colors.END}\n{'='*60}"

async def run_tests():
    """Run all tests"""
    results = TestResults()
    
    print(f"\n{Colors.BLUE}{'='*60}")
    print("AuraAI Backend Test Suite")
    print(f"{'='*60}{Colors.END}\n")
    
    # Initialize HTTP client
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        
        # Test 1: Health Check
        print(f"{Colors.BLUE}Testing Health Endpoints...{Colors.END}")
        try:
            response = await client.get(f"{BASE_URL}/health")
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "healthy":
                    results.add_pass("Health Check", f"Status: {data.get('status')}, Version: {data.get('version')}")
                else:
                    results.add_fail("Health Check", "Unexpected status response")
            else:
                results.add_fail("Health Check", f"Status code: {response.status_code}")
        except Exception as e:
            results.add_fail("Health Check", str(e))
        
        # Test 2: API Status
        try:
            response = await client.get(f"{BASE_URL}/api/status")
            if response.status_code == 200:
                results.add_pass("API Status", "Endpoint responsive")
            else:
                results.add_fail("API Status", f"Status code: {response.status_code}")
        except Exception as e:
            results.add_fail("API Status", str(e))
        
        # Test 3: Root Endpoint
        try:
            response = await client.get(f"{BASE_URL}/")
            if response.status_code == 200:
                results.add_pass("Root Endpoint", "API info accessible")
            else:
                results.add_fail("Root Endpoint", f"Status code: {response.status_code}")
        except Exception as e:
            results.add_fail("Root Endpoint", str(e))
        
        # Test 4: Memory Ingestion
        print(f"\n{Colors.BLUE}Testing Memory Management...{Colors.END}")
        try:
            payload = {
                "id": "test-memory-1",
                "text": "This is a test memory for AuraAI testing.",
                "metadata": {"test": True}
            }
            response = await client.post(f"{BASE_URL}/ingest", json=payload)
            if response.status_code == 200:
                results.add_pass("Memory Ingestion", "Memory stored successfully")
            else:
                results.add_fail("Memory Ingestion", f"Status code: {response.status_code}")
        except Exception as e:
            results.add_fail("Memory Ingestion", str(e))
        
        # Test 5: Memory Query
        try:
            payload = {"prompt": "test memory", "top_k": 3}
            response = await client.post(f"{BASE_URL}/query", json=payload)
            if response.status_code == 200:
                data = response.json()
                results.add_pass("Memory Query", f"Found {data.get('total_items', 0)} memories")
            else:
                results.add_fail("Memory Query", f"Status code: {response.status_code}")
        except Exception as e:
            results.add_fail("Memory Query", str(e))
        
        # Test 6: List All Memory
        try:
            response = await client.get(f"{BASE_URL}/memory/all")
            if response.status_code == 200:
                data = response.json()
                results.add_pass("List Memory", f"Retrieved {data.get('items', 0)} memory items")
            else:
                results.add_fail("List Memory", f"Status code: {response.status_code}")
        except Exception as e:
            results.add_fail("List Memory", str(e))
        
        # Test 7: Intent Detection
        print(f"\n{Colors.BLUE}Testing Intent Detection...{Colors.END}")
        try:
            payload = {"role": "user", "content": "Generate an image of a sunset"}
            response = await client.post(f"{BASE_URL}/detect-intent", json=payload)
            if response.status_code == 200:
                data = response.json()
                intent = data.get("intent")
                results.add_pass("Intent Detection", f"Detected intent: {intent}")
            else:
                results.add_fail("Intent Detection", f"Status code: {response.status_code}")
        except Exception as e:
            results.add_fail("Intent Detection", str(e))
        
        # Test 8: Chat Endpoint
        print(f"\n{Colors.BLUE}Testing Chat & Text Generation...{Colors.END}")
        try:
            payload = {
                "messages": [{"role": "user", "content": "Hello! How are you?"}],
                "context": "Test chat context",
                "use_memory": False,
                "target_language": "English"
            }
            response = await client.post(f"{BASE_URL}/chat", json=payload, timeout=30.0)
            if response.status_code == 200:
                data = response.json()
                results.add_pass("Chat Endpoint", "Received response from Gemini API")
            else:
                results.add_fail("Chat Endpoint", f"Status code: {response.status_code}")
        except httpx.TimeoutException:
            results.add_skip("Chat Endpoint", "Timeout (API may be slow)")
        except Exception as e:
            results.add_fail("Chat Endpoint", str(e))
        
        # Test 9: Synthesize Endpoint
        try:
            payload = {
                "content": "This is a test document for synthesis. " * 10,
                "target_language": "English"
            }
            response = await client.post(f"{BASE_URL}/synthesize", json=payload, timeout=30.0)
            if response.status_code == 200:
                data = response.json()
                results.add_pass("Synthesis Endpoint", "Synthesis generated successfully")
            else:
                results.add_fail("Synthesis Endpoint", f"Status code: {response.status_code}")
        except httpx.TimeoutException:
            results.add_skip("Synthesis Endpoint", "Timeout (API may be slow)")
        except Exception as e:
            results.add_fail("Synthesis Endpoint", str(e))
        
        # Test 10: Image Generation
        print(f"\n{Colors.BLUE}Testing Media Generation...{Colors.END}")
        try:
            payload = {
                "prompt": "A beautiful blue ocean",
                "aspect_ratio": "16:9"
            }
            response = await client.post(f"{BASE_URL}/generate-image", json=payload, timeout=30.0)
            if response.status_code == 200:
                results.add_pass("Image Generation", "Image generation endpoint working")
            else:
                results.add_fail("Image Generation", f"Status code: {response.status_code}")
        except httpx.TimeoutException:
            results.add_skip("Image Generation", "Timeout (API may be slow)")
        except Exception as e:
            results.add_fail("Image Generation", str(e))
        
        # Test 11: Video Generation
        try:
            payload = {
                "prompt": "A cat jumping over a fence",
                "aspect_ratio": "16:9",
                "resolution": "1080p"
            }
            response = await client.post(f"{BASE_URL}/generate-video", json=payload)
            if response.status_code == 200:
                results.add_pass("Video Generation", "Video generation endpoint queued")
            else:
                results.add_fail("Video Generation", f"Status code: {response.status_code}")
        except Exception as e:
            results.add_fail("Video Generation", str(e))
        
        # Test 12: Chat History
        print(f"\n{Colors.BLUE}Testing Chat History...{Colors.END}")
        try:
            response = await client.get(f"{BASE_URL}/chat-history?limit=10")
            if response.status_code == 200:
                data = response.json()
                results.add_pass("Chat History Retrieval", f"Retrieved {data.get('total', 0)} chat entries")
            else:
                results.add_fail("Chat History Retrieval", f"Status code: {response.status_code}")
        except Exception as e:
            results.add_fail("Chat History Retrieval", str(e))
        
        # Test 13: API Documentation
        print(f"\n{Colors.BLUE}Testing Documentation...{Colors.END}")
        try:
            response = await client.get(f"{BASE_URL}/docs")
            if response.status_code == 200:
                results.add_pass("Swagger Documentation", "Interactive API docs available at /docs")
            else:
                results.add_fail("Swagger Documentation", f"Status code: {response.status_code}")
        except Exception as e:
            results.add_fail("Swagger Documentation", str(e))
        
        try:
            response = await client.get(f"{BASE_URL}/redoc")
            if response.status_code == 200:
                results.add_pass("ReDoc Documentation", "API docs available at /redoc")
            else:
                results.add_fail("ReDoc Documentation", f"Status code: {response.status_code}")
        except Exception as e:
            results.add_fail("ReDoc Documentation", str(e))
    
    # Print summary
    print(results.summary())
    
    # Return exit code based on failures
    return 0 if results.failed == 0 else 1

def main():
    """Main entry point"""
    print(f"{Colors.BLUE}Connecting to {BASE_URL}...{Colors.END}")
    
    try:
        exit_code = asyncio.run(run_tests())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Tests interrupted by user{Colors.END}")
        sys.exit(1)
    except Exception as e:
        print(f"\n{Colors.RED}Fatal error: {e}{Colors.END}")
        sys.exit(1)

if __name__ == "__main__":
    main()
