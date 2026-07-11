# MedsysAI Health Hub

> **AI-powered personal health assistant** — chat with a medical AI, find nearby clinics on a live map, and manage your health profile. Built as a full-stack monorepo.

![MedsysAI](https://img.shields.io/badge/MedsysAI-Health%20Hub-0d9488?style=flat-square)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI Medical Chat** | Streaming chat powered by Groq (GPT-4o class models). Markdown-rendered responses. |
| 🗺️ **Find Care Map** | Live TomTom map with real POI search for hospitals & clinics near you. Google Directions + Call buttons. |
| 🔐 **Clerk Auth** | Sign-up / sign-in with Clerk. Protected routes, real user avatar in sidebar. |
| 💬 **Chat History** | Sessions and messages persisted to MongoDB Atlas. Grouped by Today / Yesterday / Older. |
| 👤 **Health Profile** | Medical history timeline, medications, emergency contacts. |
| 📱 **Responsive** | Desktop-first with a clean sidebar layout. Dark/light via CSS tokens. |

---

## 🏗️ Project Structure

```
MedsysAI Health Hub/
├── frontend/                    ← React + Vite app
│   ├── src/
│   │   ├── components/          ← Shared UI (app-shell, auth-guard, sidebar)
│   │   │   └── ui/              ← shadcn/ui components
│   │   ├── routes/              ← TanStack file-based routes
│   │   │   ├── __root.jsx
│   │   │   ├── index.jsx        ← Dashboard / Home
│   │   │   ├── chat.jsx         ← AI chat with session history
│   │   │   ├── find-care.jsx    ← TomTom map + hospital search
│   │   │   ├── profile.jsx      ← Health profile
│   │   │   └── landing.jsx      ← Public landing page
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── .env.example             ← ← copy to .env and fill in
│   ├── vite.config.js
│   └── package.json
│
└── backend/                     ← FastAPI app
    ├── main.py                  ← Entry point (run: python main.py)
    ├── app/
    │   ├── db.py                ← Motor async MongoDB client
    │   └── routers/
    │       ├── health.py        ← GET /api/health
    │       ├── auth.py          ← Auth helpers
    │       ├── chat.py          ← POST /api/chat/message  (SSE streaming)
    │       └── sessions.py      ← CRUD /api/sessions
    ├── requirements.txt
    └── .env.example             ← ← copy to .env and fill in
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18 and npm (or Bun)
- **Python** ≥ 3.11
- Accounts (all free tiers work):
  - [Clerk](https://clerk.com) — auth
  - [Groq](https://console.groq.com) — AI inference
  - [MongoDB Atlas](https://cloud.mongodb.com) — database
  - [TomTom Developer](https://developer.tomtom.com) — maps & POI search

---

### 1 — Clone & configure

```bash
git clone https://github.com/Priyanshu-Madhup/MediSys.git
cd MediSys
```

**Frontend env:**
```bash
cp frontend/.env.example frontend/.env
# fill in your Clerk publishable key + TomTom key
```

**Backend env:**
```bash
cp backend/.env.example backend/.env
# fill in Groq API key + MongoDB connection string
```

---

### 2 — Frontend

```bash
cd frontend
npm install          # or: bun install
npm run dev          # → http://localhost:5173
```

---

### 3 — Backend

```bash
cd backend

# Create & activate a virtual environment (recommended)
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Start the server (auto-reload enabled)
python main.py       # → http://localhost:8000
```

Interactive API docs: **http://localhost:8000/docs**

---

## 🔑 Environment Variables

### Frontend (`frontend/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key from your Clerk dashboard |
| `VITE_API_BASE` | Backend base URL (default: `http://localhost:8000`) |
| `VITE_TOMTOM_KEY` | TomTom Maps API key |

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | Groq API key for AI inference |
| `MONGODB_URL` | MongoDB Atlas connection string (include database name) |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, Vite 6, TanStack Router, Tailwind CSS v4, shadcn/ui |
| **Backend** | FastAPI, Uvicorn, Pydantic v2 |
| **AI** | Groq Cloud — `openai/gpt-oss-120b` with streaming SSE |
| **Database** | MongoDB Atlas (Motor async driver) |
| **Auth** | Clerk (social + email sign-in) |
| **Maps** | TomTom Maps SDK v6 + Search API |

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/sessions?user_id=` | List chat sessions for a user |
| `POST` | `/api/sessions` | Create a new chat session |
| `GET` | `/api/sessions/{id}/messages` | Get all messages in a session |
| `DELETE` | `/api/sessions/{id}` | Delete session + messages |
| `POST` | `/api/chat/message` | Send message → streamed SSE response |

---

## 🤝 Contributing

1. Fork the repo
2. Create your feature branch: `git checkout -b feat/amazing-feature`
3. Copy `.env.example` files and fill in your own keys — **never commit real keys**
4. Commit your changes: `git commit -m 'feat: add amazing feature'`
5. Push and open a Pull Request

---

## 📄 License

MIT © [Priyanshu Madhup](https://github.com/Priyanshu-Madhup)
