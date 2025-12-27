"""
AI Provider Abstraction Layer
Supports multiple AI providers with fallback mechanism
"""

import os
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
from enum import Enum
import google.generativeai as genai

try:
    import openai
except ImportError:
    openai = None

try:
    import anthropic
except ImportError:
    anthropic = None

try:
    import requests
except ImportError:
    requests = None


class AIProvider(str, Enum):
    """Supported AI providers"""
    GEMINI = "gemini"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    STABILITY = "stability"
    HUGGINGFACE = "huggingface"


class BaseAIProvider(ABC):
    """Abstract base class for AI providers"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
    
    @abstractmethod
    def generate_text(self, prompt: str, **kwargs) -> str:
        """Generate text response"""
        pass
    
    @abstractmethod
    def generate_image(self, prompt: str, **kwargs) -> str:
        """Generate image"""
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        """Check if provider is available"""
        pass


class GeminiProvider(BaseAIProvider):
    """Google Gemini AI Provider"""
    
    def __init__(self, api_key: str):
        super().__init__(api_key)
        genai.configure(api_key=api_key)
        self.model = "gemini-1.5-flash"
    
    def generate_text(self, prompt: str, **kwargs) -> str:
        """Generate text using Gemini"""
        try:
            model = genai.GenerativeModel(self.model)
            response = model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=kwargs.get('temperature', 0.7)
                )
            )
            return response.text if response.text else "No response generated"
        except Exception as e:
            raise Exception(f"Gemini API error: {str(e)}")
    
    def generate_image(self, prompt: str, **kwargs) -> str:
        """Generate image using Gemini"""
        try:
            model = genai.GenerativeModel("gemini-2.0-flash")
            response = model.generate_content(
                f"Generate an image: {prompt}",
                generation_config=genai.types.GenerationConfig(
                    temperature=0.8
                )
            )
            return response.text or "Image generation initiated"
        except Exception as e:
            raise Exception(f"Gemini image generation error: {str(e)}")
    
    def is_available(self) -> bool:
        """Check if Gemini API is available"""
        try:
            genai.list_models()
            return True
        except:
            return False


class OpenAIProvider(BaseAIProvider):
    """OpenAI API Provider (GPT-4, GPT-3.5, DALL-E)"""
    
    def __init__(self, api_key: str):
        super().__init__(api_key)
        if openai is None:
            raise ImportError("openai package not installed. Run: pip install openai")
        self.client = openai.OpenAI(api_key=api_key)
    
    def generate_text(self, prompt: str, **kwargs) -> str:
        """Generate text using OpenAI GPT"""
        try:
            response = self.client.chat.completions.create(
                model=kwargs.get('model', 'gpt-3.5-turbo'),
                messages=[{"role": "user", "content": prompt}],
                temperature=kwargs.get('temperature', 0.7),
                max_tokens=kwargs.get('max_tokens', 500)
            )
            return response.choices[0].message.content
        except Exception as e:
            raise Exception(f"OpenAI API error: {str(e)}")
    
    def generate_image(self, prompt: str, **kwargs) -> str:
        """Generate image using DALL-E"""
        try:
            response = self.client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                size=kwargs.get('size', '1024x1024'),
                quality=kwargs.get('quality', 'standard'),
                n=1
            )
            return response.data[0].url if response.data else "Image generation failed"
        except Exception as e:
            raise Exception(f"DALL-E error: {str(e)}")
    
    def is_available(self) -> bool:
        """Check if OpenAI API is available"""
        try:
            self.client.models.list()
            return True
        except:
            return False


class AnthropicProvider(BaseAIProvider):
    """Anthropic Claude API Provider"""
    
    def __init__(self, api_key: str):
        super().__init__(api_key)
        if anthropic is None:
            raise ImportError("anthropic package not installed. Run: pip install anthropic")
        self.client = anthropic.Anthropic(api_key=api_key)
    
    def generate_text(self, prompt: str, **kwargs) -> str:
        """Generate text using Claude"""
        try:
            message = self.client.messages.create(
                model=kwargs.get('model', 'claude-3-haiku-20240307'),
                max_tokens=kwargs.get('max_tokens', 1024),
                messages=[{"role": "user", "content": prompt}]
            )
            return message.content[0].text
        except Exception as e:
            raise Exception(f"Anthropic API error: {str(e)}")
    
    def generate_image(self, prompt: str, **kwargs) -> str:
        """Claude doesn't support image generation"""
        raise NotImplementedError("Claude does not support image generation. Use another provider.")
    
    def is_available(self) -> bool:
        """Check if Anthropic API is available"""
        try:
            self.client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=1,
                messages=[{"role": "user", "content": "test"}]
            )
            return True
        except:
            return False


class StabilityAIProvider(BaseAIProvider):
    """Stability AI Image Generation Provider"""
    
    def __init__(self, api_key: str):
        super().__init__(api_key)
        self.base_url = "https://api.stability.ai/v1"
    
    def generate_text(self, prompt: str, **kwargs) -> str:
        """Stability AI doesn't support text generation"""
        raise NotImplementedError("Stability AI only supports image generation. Use another provider for text.")
    
    def generate_image(self, prompt: str, **kwargs) -> str:
        """Generate image using Stability AI"""
        if requests is None:
            raise ImportError("requests package not installed. Run: pip install requests")
        
        try:
            url = f"{self.base_url}/generation/stable-diffusion-v1-6/text-to-image"
            headers = {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}"
            }
            payload = {
                "text_prompts": [{"text": prompt, "weight": 1}],
                "cfg_scale": kwargs.get('cfg_scale', 7),
                "height": int(kwargs.get('height', 768)),
                "width": int(kwargs.get('width', 768)),
                "steps": kwargs.get('steps', 30),
                "samples": 1
            }
            
            response = requests.post(url, json=payload, headers=headers)
            if response.status_code == 200:
                return "Image generated successfully"
            else:
                raise Exception(f"Stability API error: {response.text}")
        except Exception as e:
            raise Exception(f"Stability AI error: {str(e)}")
    
    def is_available(self) -> bool:
        """Check if Stability AI API is available"""
        if requests is None:
            return False
        try:
            url = f"{self.base_url}/user/account"
            headers = {"Authorization": f"Bearer {self.api_key}"}
            response = requests.get(url, headers=headers)
            return response.status_code == 200
        except:
            return False


class ElevenLabsProvider(BaseAIProvider):
    """ElevenLabs Voice/TTS Provider"""
    
    def __init__(self, api_key: str):
        super().__init__(api_key)
        self.base_url = "https://api.elevenlabs.io/v1"
    
    def generate_text(self, prompt: str, **kwargs) -> str:
        """ElevenLabs doesn't support text generation"""
        raise NotImplementedError("ElevenLabs only supports voice synthesis. Use another provider for text.")
    
    def generate_image(self, prompt: str, **kwargs) -> str:
        """ElevenLabs doesn't support image generation"""
        raise NotImplementedError("ElevenLabs only supports voice synthesis. Use another provider for images.")
    
    def text_to_speech(self, text: str, voice_id: str = "21m00Tcm4TlvDq8ikWAM", **kwargs) -> str:
        """Convert text to speech"""
        if requests is None:
            raise ImportError("requests package not installed. Run: pip install requests")
        
        try:
            url = f"{self.base_url}/text-to-speech/{voice_id}"
            headers = {"xi-api-key": self.api_key}
            payload = {
                "text": text,
                "model_id": kwargs.get('model_id', 'eleven_monolingual_v1'),
                "voice_settings": {
                    "stability": kwargs.get('stability', 0.5),
                    "similarity_boost": kwargs.get('similarity_boost', 0.75)
                }
            }
            
            response = requests.post(url, json=payload, headers=headers)
            if response.status_code == 200:
                return "Audio generated successfully"
            else:
                raise Exception(f"ElevenLabs API error: {response.text}")
        except Exception as e:
            raise Exception(f"ElevenLabs error: {str(e)}")
    
    def is_available(self) -> bool:
        """Check if ElevenLabs API is available"""
        if requests is None:
            return False
        try:
            url = f"{self.base_url}/user"
            headers = {"xi-api-key": self.api_key}
            response = requests.get(url, headers=headers)
            return response.status_code == 200
        except:
            return False


class AIProviderManager:
    """Manages multiple AI providers with fallback"""
    
    def __init__(self):
        self.providers: Dict[str, BaseAIProvider] = {}
        self.primary_provider: Optional[str] = None
        self.initialize_providers()
    
    def initialize_providers(self):
        """Initialize all available providers"""
        # Gemini
        gemini_key = os.getenv("GEMINI_API_KEY")
        if gemini_key:
            try:
                self.providers[AIProvider.GEMINI.value] = GeminiProvider(gemini_key)
            except Exception as e:
                print(f"Failed to initialize Gemini: {e}")
        
        # OpenAI
        openai_key = os.getenv("OPENAI_API_KEY")
        if openai_key and openai:
            try:
                self.providers[AIProvider.OPENAI.value] = OpenAIProvider(openai_key)
            except Exception as e:
                print(f"Failed to initialize OpenAI: {e}")
        
        # Anthropic
        anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        if anthropic_key and anthropic:
            try:
                self.providers[AIProvider.ANTHROPIC.value] = AnthropicProvider(anthropic_key)
            except Exception as e:
                print(f"Failed to initialize Anthropic: {e}")
        
        # Stability AI
        stability_key = os.getenv("STABILITY_API_KEY")
        if stability_key:
            try:
                self.providers[AIProvider.STABILITY.value] = StabilityAIProvider(stability_key)
            except Exception as e:
                print(f"Failed to initialize Stability AI: {e}")
        
        # ElevenLabs
        elevenlabs_key = os.getenv("ELEVENLABS_API_KEY")
        if elevenlabs_key:
            try:
                self.providers[AIProvider.ELEVENLABS.value] = ElevenLabsProvider(elevenlabs_key)
            except Exception as e:
                print(f"Failed to initialize ElevenLabs: {e}")
        
        # Set primary provider
        primary = os.getenv("PRIMARY_AI_PROVIDER", AIProvider.GEMINI.value)
        if primary in self.providers:
            self.primary_provider = primary
        elif self.providers:
            self.primary_provider = list(self.providers.keys())[0]
    
    def get_provider(self, provider_name: Optional[str] = None) -> BaseAIProvider:
        """Get provider by name or primary"""
        if provider_name and provider_name in self.providers:
            return self.providers[provider_name]
        
        if self.primary_provider and self.primary_provider in self.providers:
            return self.providers[self.primary_provider]
        
        raise Exception("No AI providers configured")
    
    def get_text_provider(self, provider_name: Optional[str] = None) -> Optional[BaseAIProvider]:
        """Get available text generation provider. Returns None if none available."""
        # If a specific provider was requested, validate availability
        if provider_name:
            try:
                provider = self.get_provider(provider_name)
                if provider and provider.is_available():
                    return provider
            except Exception:
                return None

        # Try providers in order of preference and ensure is_available() returns True
        for name in [AIProvider.OPENAI.value, AIProvider.ANTHROPIC.value, AIProvider.GEMINI.value]:
            provider = self.providers.get(name)
            if provider:
                try:
                    if provider.is_available():
                        return provider
                except Exception:
                    continue

        return None
    
    def get_image_provider(self, provider_name: Optional[str] = None) -> Optional[BaseAIProvider]:
        """Get available image generation provider. Returns None if none available."""
        if provider_name:
            try:
                provider = self.get_provider(provider_name)
                if provider and provider.is_available():
                    return provider
            except Exception:
                return None

        # Try providers in order of preference and ensure is_available() returns True
        for name in [AIProvider.STABILITY.value, AIProvider.OPENAI.value, AIProvider.GEMINI.value]:
            provider = self.providers.get(name)
            if provider:
                try:
                    if provider.is_available():
                        return provider
                except Exception:
                    continue

        return None
    
    def get_voice_provider(self, provider_name: Optional[str] = None) -> Optional[BaseAIProvider]:
        """Get available voice/TTS provider. Returns None if none available."""
        if provider_name:
            try:
                provider = self.get_provider(provider_name)
                if provider and provider.is_available():
                    return provider
            except Exception:
                return None

        provider = self.providers.get(AIProvider.HUGGINGFACE.value) or self.providers.get(AIProvider.OPENAI.value)
        # Prefer ElevenLabs if configured
        if "elevenlabs" in self.providers:
            candidate = self.providers.get("elevenlabs")
            try:
                if candidate and candidate.is_available():
                    return candidate
            except Exception:
                pass

        # Fall back to other TTS-capable providers if any
        if provider:
            try:
                if provider.is_available():
                    return provider
            except Exception:
                pass

        return None

    def get_video_provider(self, provider_name: Optional[str] = None) -> Optional[BaseAIProvider]:
        """Get available video generation provider (returns provider or None)."""
        # If an explicit provider requested, validate it
        if provider_name:
            try:
                provider = self.get_provider(provider_name)
                if provider and provider.is_available():
                    return provider
            except Exception:
                return None

        # Currently, Gemini is the main video-capable provider in this project
        candidate = self.providers.get(AIProvider.GEMINI.value)
        if candidate:
            try:
                if candidate.is_available():
                    return candidate
            except Exception:
                pass

        return None
    
    def list_available_providers(self) -> Dict[str, bool]:
        """List all providers and their availability"""
        status: Dict[str, bool] = {}
        for name, provider in self.providers.items():
            try:
                status[name] = bool(provider.is_available())
            except Exception:
                status[name] = False
        return status
    
    def get_provider_info(self) -> Dict[str, Any]:
        """Get detailed provider information"""
        return {
            "primary_provider": self.primary_provider,
            "available_providers": list(self.providers.keys()),
            "status": self.list_available_providers()
        }
