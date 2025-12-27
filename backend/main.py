import os
import json
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import provider system
try:
    from providers import AIProviderManager
except ImportError:
    logger = logging.getLogger(__name__)
    logger.error("providers module not found. Please ensure providers.py is in the backend directory.")
    raise
# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(
    title="AuraAI Backend API",
    description="Production-ready backend for AuraAI - Text, Image, Video, and Audio generation",
    version="1.0.0"
)

# Configure CORS for all origins during development, restrict in production
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Initialize AI Provider Manager
provider_manager = AIProviderManager()

# Verify at least one provider is available
if not provider_manager.is_any_provider_available():
    logger.error("No AI providers are available. Please configure at least one API key.")
    raise ValueError("At least one AI provider must be configured")
# In-memory storage for long-term memory (replace with database in production)
memory_store: Dict[str, Dict[str, Any]] = {}
chat_history: List[Dict[str, Any]] = []

# API response models
class ProviderInfo(BaseModel):
    name: str
    available: bool
    capabilities: List[str]

# ==================== Data Models ====================

class MessageRequest(BaseModel):
    role: str
    content: str
    assets: Optional[List[Dict[str, str]]] = None

class ChatRequest(BaseModel):
    messages: List[MessageRequest]
    context: Optional[str] = None
    use_grounding: bool = False
    use_memory: bool = False
    target_language: str = "English"
    provider: Optional[str] = None

class MemoryIngestRequest(BaseModel):
    id: str
    text: str
    metadata: Optional[Dict[str, Any]] = None

class MemoryQueryRequest(BaseModel):
    prompt: str
    top_k: int = 3

class ImageGenerationRequest(BaseModel):
    prompt: str
    aspect_ratio: str = "1:1"
    provider: Optional[str] = None

class VideoGenerationRequest(BaseModel):
    prompt: str
    aspect_ratio: str = "16:9"
    resolution: str = "1080p"
    provider: Optional[str] = None

class SynthesisRequest(BaseModel):
    content: str
    target_language: str = "English"
    provider: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: str

class ProvidersStatusResponse(BaseModel):
    available_providers: List[ProviderInfo]
    primary_provider: str
    fallback_enabled: bool
# ==================== Utility Functions ====================

def store_memory(memory_id: str, text: str, metadata: Optional[Dict[str, Any]] = None):
    """Store data in long-term memory"""
    memory_store[memory_id] = {
        "text": text,
        "metadata": metadata or {},
        "timestamp": datetime.now().isoformat(),
        "embeddings": text  # In production, use actual embeddings
    }
    logger.info(f"Memory stored: {memory_id}")

def search_memory(query: str, top_k: int = 3) -> str:
    """Search long-term memory (simple text matching - use vector DB in production)"""
    if not memory_store:
        return ""
    
    results = []
    query_lower = query.lower()
    
    for key, value in memory_store.items():
        text = value.get("text", "").lower()
        if any(word in text for word in query_lower.split()):
            results.append(value.get("text", ""))
    
    return " ".join(results[:top_k])

async def generate_text_response(
    messages: List[MessageRequest],
    context: str,
    use_grounding: bool = False,
    use_memory: bool = False,
    target_language: str = "English",
    provider_name: Optional[str] = None
) -> str:
    """Generate text response using Gemini"""
    try:
        # Prepare system instruction
        long_term_context = ""
        if use_memory and messages:
            long_term_context = search_memory(messages[-1].content)
        
        system_instruction = f"""Persona: Expert Multimodal AI assistant with Long-term Memory. 
        Language: {target_language}. 
        Capabilities: You analyze text, images, videos, audio.
        Semantic Context from Long-term Memory: {long_term_context or "No past relevant memories found."}
        Current Local Context: {context or "General assistance."}"""
        
        # Convert messages to text format
        text_messages = []
        for msg in messages:
            text_messages.append(f"{msg.role}: {msg.content}")
        
        # Prepare conversation text
        conversation_text = system_instruction + "\n\n" + "\n".join(text_messages)
        
        # Get appropriate provider
        provider = provider_manager.get_text_provider(provider_name)
        if not provider:
            raise HTTPException(status_code=503, detail="No text generation provider available")
        
        # Generate response using selected provider
        response = provider.generate_text(
            prompt=conversation_text,
            max_tokens=2048
        )
        
        
        return response if response else "Error generating response"
        
    except Exception as e:
        logger.error(f"Text generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Text generation failed: {str(e)}")

async def generate_image(prompt: str, aspect_ratio: str = "1:1", provider_name: Optional[str] = None) -> str:
    """Generate image using available provider"""
    try:
        # Get appropriate provider for image generation
        provider = provider_manager.get_image_provider(provider_name)
        if not provider:
            raise HTTPException(status_code=503, detail="No image generation provider available")
        
        # Generate image using selected provider
        image_data = provider.generate_image(
            prompt=prompt,
            size="512x512"
        )
        
        
    except Exception as e:
        logger.error(f"Image generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)}")

async def generate_synthesis(content: str, target_language: str = "English") -> str:
    """Generate synthesis/summary of content in target language"""
    try:
        # Get appropriate provider for text synthesis
        provider_name = os.getenv("PRIMARY_AI_PROVIDER", "gemini")
        provider = provider_manager.get_text_provider(provider_name)
        if not provider:
            raise HTTPException(status_code=503, detail="No text synthesis provider available")
        
        # Generate synthesis using selected provider
        synthesis_prompt = f"Summarize the following in {target_language}. Be concise.\n\nContent:\n{content[:5000]}"
        response = provider.generate_text(
            prompt=synthesis_prompt,
            max_tokens=1000
        )
        
        return response if response else "Synthesis not available"
        
    except Exception as e:
        logger.error(f"Synthesis generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Synthesis generation failed: {str(e)}")

# ==================== Health & Status Endpoints ====================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        timestamp=datetime.now().isoformat()
    )

@app.get("/api/status")
async def status():
    """Get API status and statistics"""
    return JSONResponse({
        "status": "running",
        "memory_items": len(memory_store),
        "chat_history_length": len(chat_history),
        "timestamp": datetime.now().isoformat()
    })

# ==================== Memory Management Endpoints ====================

@app.post("/ingest")
async def ingest_memory(request: MemoryIngestRequest):
    """Store data in long-term memory"""
    try:
        store_memory(request.id, request.text, request.metadata)
        return JSONResponse({
            "status": "success",
            "message": f"Memory ingested: {request.id}"
        })
    except Exception as e:
        logger.error(f"Memory ingestion error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Memory ingestion failed: {str(e)}")

@app.post("/query")
async def query_memory(request: MemoryQueryRequest):
    """Query long-term memory"""
    try:
        context = search_memory(request.prompt, request.top_k)
        return JSONResponse({
            "context": context,
            "total_items": len(memory_store)
        })
    except Exception as e:
        logger.error(f"Memory query error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Memory query failed: {str(e)}")

@app.delete("/memory/{memory_id}")
async def delete_memory(memory_id: str):
    """Delete a memory entry"""
    try:
        if memory_id in memory_store:
            del memory_store[memory_id]
            return JSONResponse({"status": "success", "message": f"Memory deleted: {memory_id}"})
        raise HTTPException(status_code=404, detail="Memory not found")
    except Exception as e:
        logger.error(f"Memory deletion error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Memory deletion failed: {str(e)}")

@app.get("/memory/all")
async def list_all_memory():
    """List all stored memory items"""
    return JSONResponse({
        "items": len(memory_store),
        "memories": [
            {
                "id": k,
                "timestamp": v.get("timestamp"),
                "preview": v.get("text", "")[:100] + "..."
            }
            for k, v in memory_store.items()
        ]
    })

# ==================== Chat & Text Generation Endpoints ====================

@app.post("/chat")
async def chat(request: ChatRequest):
    """Chat endpoint with streaming support"""
    try:
        response = await generate_text_response(
            messages=request.messages,
            context=request.context or "",
            use_grounding=request.use_grounding,
            use_memory=request.use_memory,
            target_language=request.target_language,
            provider_name=request.provider
        )
        
        # Store in chat history
        chat_history.append({
            "timestamp": datetime.now().isoformat(),
            "messages": request.dict(),
            "response": response
        })
        
        # Auto-commit to memory
        if request.messages:
            last_msg = request.messages[-1].content
            if len(last_msg) > 20:
                store_memory(
                    f"chat-{datetime.now().timestamp()}",
                    last_msg,
                    {"role": "user", "language": request.target_language, "provider": request.provider}
                )
        
        return JSONResponse({
            "response": response,
            "language": request.target_language,
            "provider": request.provider,
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chat processing failed: {str(e)}")

@app.post("/synthesize")
async def synthesize(request: SynthesisRequest):
    """Generate synthesis/summary of content"""
    try:
        synthesis = await generate_synthesis(
            content=request.content,
            target_language=request.target_language,
            provider_name=request.provider
        )
        
        return JSONResponse({
            "synthesis": synthesis,
            "language": request.target_language,
            "provider": request.provider,
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Synthesis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Synthesis failed: {str(e)}")

# ==================== Image Generation Endpoint ====================

@app.post("/generate-image")
async def generate_image_endpoint(request: ImageGenerationRequest):
    """Generate image from prompt"""
    try:
        image_data = await generate_image(
            prompt=request.prompt,
            aspect_ratio=request.aspect_ratio,
            provider_name=request.provider
        )
        
        return JSONResponse({
            "image": image_data,
            "prompt": request.prompt,
            "aspect_ratio": request.aspect_ratio,
            "provider": request.provider,
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Image generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)}")

# ==================== Video Generation Endpoint ====================

@app.post("/generate-video")
async def generate_video_endpoint(request: VideoGenerationRequest):
    """Generate video from prompt"""
    try:
        # Get appropriate provider for video generation
        provider = provider_manager.get_video_provider(request.provider)
        if not provider:
            # Fallback to placeholder if no video provider available
            logger.warning("No video generation provider available, returning placeholder response")
            video_response = {
                "status": "pending",
                "message": "Video generation queued",
                "type": "placeholder"
            }
        else:
            # Use actual provider
            video_response = provider.generate_video(request.prompt)
        
        return JSONResponse({
            **video_response,
            "prompt": request.prompt,
            "config": {
                "aspect_ratio": request.aspect_ratio,
                "resolution": request.resolution
            },
            "provider": request.provider,
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Video generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Video generation failed: {str(e)}")

# ==================== File Upload Endpoints ====================

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Handle file uploads (documents, images, etc.)"""
    try:
        contents = await file.read()
        
        # Store metadata
        file_info = {
            "filename": file.filename,
            "content_type": file.content_type,
            "size": len(contents),
            "timestamp": datetime.now().isoformat()
        }
        
        # For documents, extract text and store in memory
        if file.content_type in ["text/plain", "application/pdf"]:
            try:
                text_content = contents.decode('utf-8')
                store_memory(
                    f"doc-{file.filename}-{datetime.now().timestamp()}",
                    text_content[:5000],
                    {"filename": file.filename, "type": "document"}
                )
            except:
                pass
        
        return JSONResponse({
            "status": "success",
            "file_info": file_info,
            "message": f"File {file.filename} uploaded successfully"
        })
    except Exception as e:
        logger.error(f"File upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

# ==================== Chat History Endpoints ====================

@app.get("/chat-history")
async def get_chat_history(limit: int = 50):
    """Get chat history"""
    return JSONResponse({
        "total": len(chat_history),
        "history": chat_history[-limit:]
    })

@app.delete("/chat-history")
async def clear_chat_history():
    """Clear chat history"""
    global chat_history
    chat_history = []
    return JSONResponse({"status": "success", "message": "Chat history cleared"})

# ==================== Intent Detection Endpoint ====================

@app.post("/detect-intent")
async def detect_intent(request: MessageRequest):
    """Detect user intent (TEXT, IMAGE, VIDEO)"""
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        response = model.generate_content(
            f"""Identify intent:
            - Return 'IMAGE' if the user wants to create an image.
            - Return 'VIDEO' if the user wants to create a video.
            - Return 'AUDIO' if the user wants audio generation/processing.
            - Otherwise return 'TEXT'.
            
            Query: "{request.content}"
            
            Respond with only the intent type.""",
            generation_config=genai.types.GenerationConfig(temperature=0)
        )
        
        intent = response.text.strip().upper()
        valid_intents = ["TEXT", "IMAGE", "VIDEO", "AUDIO"]
        intent = intent if intent in valid_intents else "TEXT"
        
        return JSONResponse({
            "intent": intent,
            "prompt": request.content,
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Intent detection error: {str(e)}")
        return JSONResponse({"intent": "TEXT", "error": str(e)})

# ==================== Error Handlers ====================

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "timestamp": datetime.now().isoformat()}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "timestamp": datetime.now().isoformat()
        }
    )

# ==================== Root Endpoint ====================

@app.get("/")
async def root():
    """Root endpoint with API documentation"""
    return JSONResponse({
        "name": "AuraAI Backend API",
        "version": "1.0.0",
        "description": "Production-ready backend for text, image, video, and audio generation",
        "endpoints": {
            "health": "GET /health",
            "providers": "GET /api/providers",
            "chat": "POST /chat",
            "text_synthesis": "POST /synthesize",
            "image_generation": "POST /generate-image",
            "video_generation": "POST /generate-video",
            "intent_detection": "POST /detect-intent",
            "file_upload": "POST /upload",
            "memory_ingest": "POST /ingest",
            "memory_query": "POST /query",
            "chat_history": "GET /chat-history",
            "api_status": "GET /api/status"
        },
        "docs": "/docs",
        "redoc": "/redoc"
    })

# ==================== Provider Management Endpoints ====================

@app.get("/api/providers", response_model=ProvidersStatusResponse)
async def get_providers_status():
    """Get status of all configured AI providers"""
    try:
        available_providers = []
        
        # Check each provider type
        for provider_name in ["gemini", "openai", "anthropic", "stability", "elevenlabs"]:
            provider = provider_manager.providers.get(provider_name)
            if provider:
                available_providers.append(ProviderInfo(
                    name=provider_name,
                    available=provider.is_available(),
                    capabilities=get_provider_capabilities(provider_name)
                ))
        
        return ProvidersStatusResponse(
            available_providers=available_providers,
            primary_provider=provider_manager.primary_provider or "gemini",
            fallback_enabled=os.getenv("ENABLE_PROVIDER_FALLBACK", "true").lower() == "true"
        )
    except Exception as e:
        logger.error(f"Provider status error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def get_provider_capabilities(provider_name: str) -> List[str]:
    """Get capabilities for a specific provider"""
    capabilities_map = {
        "gemini": ["text", "image", "video"],
        "openai": ["text", "image"],
        "anthropic": ["text"],
        "stability": ["image"],
        "elevenlabs": ["audio"]
    }
    return capabilities_map.get(provider_name, [])
# ==================== Application Entry Point ====================

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=os.getenv("ENV", "production") != "production",
        log_level="info"
    )
