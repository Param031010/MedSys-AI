# MedsysAI Health Hub

AI-powered health assistant — monorepo with a React + Vite frontend and a FastAPI backend.

## Project Structure

```
MedsysAI Health Hub/
├── frontend/          ← React + Vite (TanStack Router, Tailwind CSS v4, shadcn/ui)
│   ├── src/
│   ├── public/
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── backend/           ← FastAPI (Python)
    ├── main.py
    ├── app/
    │   └── routers/
    │       ├── health.py
    │       ├── auth.py
    │       └── chat.py
    ├── requirements.txt
    └── .env.example
```

---

## Getting Started

### Frontend

```bash
cd frontend
npm install       # or: bun install
npm run dev       # starts Vite dev server at http://localhost:5173
```

### Backend

```bash
cd backend

# Create & activate a virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Copy env template
copy .env.example .env        # Windows
# cp .env.example .env        # macOS / Linux

# Start the server
uvicorn main:app --reload --port 8000
```

API docs available at: **http://localhost:8000/docs**

---

## Tech Stack

| Layer     | Technology |
|-----------|-----------|
| Frontend  | React 19, Vite, TanStack Router, Tailwind CSS v4, shadcn/ui |
| Backend   | FastAPI, Uvicorn, Pydantic v2 |
| AI        | OpenAI / Gemini (plug in via `.env`) |
