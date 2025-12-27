 # AuraAI

 Lightweight, provider-agnostic AI studio for text, image, video and audio tasks. This repository contains a React + TypeScript frontend (Vite) and a FastAPI backend with a pluggable AI provider layer.

 This README explains how to configure, run, and extend the project for local development and production deployment.

 ---

 ## Contents

 - Introduction
 - Quick start (dev)
 - Docker (compose)
 - Configuration (.env)
 - Providers and fallback
 - Testing
 - Troubleshooting
 - Contributing
 - License

 ---

 ## Quick start (development)

 Prerequisites:
 - Node.js 16+ and npm
 - Python 3.11+
 - (Optional) Docker & Docker Compose

 1) Copy environment template and set keys:

 ```bash
 cp .env.example .env
 # Edit .env and provide API keys and other values
 ```

 2) Install frontend dependencies and run dev server:

 ```bash
 npm install
 npm run dev
 # Frontend serves on http://localhost:3000 by default
 ```

 3) Set up and run backend (virtualenv recommended):

 Windows:
 ```powershell
 cd backend
 python -m venv .venv
 .\.venv\Scripts\activate
 pip install -r requirements.txt
 python main.py
 # Backend runs on http://localhost:8000
 ```

 macOS / Linux:
 ```bash
 cd backend
 python -m venv .venv
 source .venv/bin/activate
 pip install -r requirements.txt
 python main.py
 # Backend runs on http://localhost:8000
 ```

 4) Open the app: http://localhost:3000
 API docs: http://localhost:8000/docs

 ---

 ## Run with Docker Compose

 Start all services (frontend, backend, postgres, redis):

 ```bash
 docker-compose up -d --build
 ```

 Stop and remove containers:

 ```bash
 docker-compose down
 ```

 Notes:
 - Edit `.env` before running compose so services have correct keys and DB credentials.

 ---

 ## Configuration (`.env`)

 The project uses a single `.env` file for service configuration. A minimal example is in `.env.example`.

 Important variables (examples):

 - `PRIMARY_AI_PROVIDER` — default provider name (e.g., `gemini`, `openai`)
 - `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `STABILITY_API_KEY`, `ELEVENLABS_API_KEY` — provider keys
 - `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_NAME` — database connection
 - `VITE_API_URL` — frontend → backend base URL

 Keep `.env` out of version control. Do not commit secrets.

 ---

 ## Providers and fallback behavior

 The backend implements a provider abstraction (`backend/providers.py`). Key points:

 - Multiple providers can be configured via environment variables. The manager initializes only the providers with keys present.
 - `PRIMARY_AI_PROVIDER` defines the preferred provider when a client does not explicitly request one.
 - For each modality (text, image, voice, video) the manager selects the best available provider and verifies availability via each provider's `is_available()` method.
 - If a selected provider is unavailable, the manager attempts fallback providers in a predefined preference order.

 How to select a provider per request:
 - API endpoints accept an optional `provider` parameter in request bodies (e.g., `provider: "openai"`). If provided, the backend will attempt to use that provider and return a 503 if it's unavailable.

 To add a new provider:
 1. Implement a `BaseAIProvider` subclass in `backend/providers.py` with `generate_text`, `generate_image`, and `is_available` as appropriate.
 2. Initialize it in `AIProviderManager.initialize_providers()` using an env var.
 3. Restart the backend.

 ---

 ## Tests

 Backend unit / integration tests live in `backend/test_api.py`.

 Run tests locally (ensure backend is running):

 ```bash
 cd backend
 python test_api.py
 ```

 Add or extend tests as you change endpoints or providers.

 ---

 ## Troubleshooting

 - 503 from API: check that required provider API keys are set in `.env` and that the provider service is reachable.
 - CORS errors: ensure `ALLOWED_ORIGINS` in `.env` includes the frontend origin.
 - DB connection errors: verify `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` and that the database is running.
 - If frontend cannot reach backend during development, ensure `VITE_API_URL` is set to `http://localhost:8000`.

 If problems persist, check logs for `backend` and `frontend` containers via `docker-compose logs -f backend`.

 ---

 ## Contributing

 - Open an issue to discuss major changes.
 - Create small, focused pull requests for fixes and features.
 - Keep secrets out of commits.

 Coding style:
 - Python: follow standard PEP8 and type hints where possible.
 - TypeScript: follow standard linting in `package.json` (if configured).

 ---

 ## License

 This project is provided under the MIT license. See `LICENSE` for details.

 ---

 If you want, I can also:
 - add a short `Getting Started` video or GIF to the README,
 - include a simple architecture diagram file and link it from the README,
 - or add provider-specific setup sections (OpenAI, Anthropic, Stability, ElevenLabs).
