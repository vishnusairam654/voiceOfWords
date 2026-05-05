# 🎙️ Voice Of Words — AI Voice Book Companion

> Upload any document and have natural voice or chat conversations about it — powered by Vapi AI and RAG-based search.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-ram654.dev-blue?style=for-the-badge)](https://ram654.dev)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

---

## ✨ What It Does

Voice Of Words lets you upload PDF, DOCX, TXT, or XML files and instantly start having conversations about them — either through real-time **voice calls** or an **AI chat interface**. It extracts the document's text, chunks it into a searchable knowledge base, and uses Retrieval-Augmented Generation (RAG) to give contextually accurate answers grounded in your actual document.

---

## 🚀 Key Features

| Feature | Description |
|---|---|
| 📄 **Multi-format Upload** | Supports PDF, DOCX, TXT, and XML — text is extracted client-side before upload |
| 🎙️ **Voice Conversations** | Real-time voice calls via Vapi AI with live transcript and text-alongside-voice input |
| 💬 **AI Chat** | Contextual chat powered by Groq (Llama 3.3 70B) with quick-action prompts |
| 🔍 **RAG Search** | MongoDB text search + regex fallback to retrieve the most relevant document passages |
| 🧠 **Visual Summary** | AI-generated key ideas, concept tags, and highlighted quotes with PDF export |
| 🔐 **Auth** | Clerk-based authentication with protected routes and per-user document isolation |
| 📁 **Document Library** | Collapsible sidebar showing all your uploaded documents with search |
| 🎨 **Custom Theme** | Teal/sage design system with glass-morphism UI and smooth Framer Motion animations |

---

## 🛠️ Tech Stack

**Frontend**
- Next.js 16 (App Router, Server Actions)
- React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui (Radix primitives)
- Framer Motion
- pdfjs-dist + mammoth (client-side text extraction)

**Backend / AI**
- Groq API (Llama 3.3 70B) — chat completions & document summarization
- Vapi AI — real-time voice calls with assistant overrides
- MongoDB + Mongoose — document storage & full-text segment search
- Vercel Blob — file and cover image storage

**Auth & Infra**
- Clerk (JWT auth, middleware protection)
- Vercel (deployment)

---

## 📸 Screenshots

> _Add screenshots or a demo GIF here_

---

## ⚙️ Getting Started

### Prerequisites
- Node.js 20+
- MongoDB Atlas cluster
- Clerk account
- Groq API key
- Vapi AI account + assistant
- Vercel Blob token

### Installation

```bash
git clone https://github.com/vishnusairam654/voiceofwords.git
cd voiceofwords
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
# MongoDB
MONGODB_URI=your_mongodb_connection_string

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Groq AI
GROQ_API_KEY=your_groq_api_key

# Vapi Voice AI
NEXT_PUBLIC_VAPI_PUBLIC_KEY=your_vapi_public_key
NEXT_PUBLIC_VAPI_ASSISTANT_ID=your_vapi_assistant_id

# Vercel Blob
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
```

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📂 Project Structure

```
src/
├── app/
│   ├── api/              # chat, summarize, upload, vapi routes
│   ├── books/            # [slug] book page, /new upload page
│   └── page.tsx          # Home / document library
├── components/
│   ├── BookInteraction   # Voice/Chat mode switcher
│   ├── ChatPanel         # AI chat with quick actions
│   ├── VapiControls      # Real-time voice call UI
│   ├── SummaryPanel      # Key ideas / concepts / highlights
│   └── DocSidebar        # Collapsible document navigator
├── database/
│   └── models/           # Book, BookSegment, VoiceSession
├── hooks/
│   └── useVapi.ts        # Vapi SDK wrapper + call lifecycle
└── lib/
    ├── actions/          # Server actions (createBook, sessions)
    └── utils/            # slug generator, text segmenter
```

---

## 🔑 How RAG Works

1. On upload, the document text is split into **500-word chunks** with 50-word overlap
2. Chunks are stored as `BookSegment` documents in MongoDB with a full-text index
3. On each chat/voice query, MongoDB `$text` search (with regex fallback) retrieves the 3 most relevant chunks
4. The retrieved context is injected into the Groq system prompt before generating a response

---

## 👤 Author

**Vishnu Sai Ram**
- 🌐 [ram654.dev](https://ram654.dev)
- 💼 [LinkedIn](https://linkedin.com/in/vishnu654)
- 🐙 [GitHub](https://github.com/vishnusairam654)

---

> ⭐ If you found this project interesting, consider giving it a star!
