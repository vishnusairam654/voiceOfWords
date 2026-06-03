# Voice Of Words — Complete Project Flow (Interview Guide)

This document explains the full flow of the `voiceOfWords` project, from architecture to request lifecycle, so you can confidently explain it in interviews.

## 1) What the project does

**Voice Of Words** is an AI-powered document companion.

A signed-in user can:
- Upload a document (`PDF`, `DOCX`, `TXT`, `XML`)
- Let the app extract and index the text into searchable chunks
- Ask questions in **chat mode** (RAG + Groq)
- Talk in **voice mode** (Vapi real-time call + retrieval tool)
- Generate a structured AI summary (key ideas, concepts, highlights)
- Export summary as PDF

Core value: **natural interaction with your own documents using Retrieval-Augmented Generation (RAG)**.

---

## 2) High-level architecture

### Frontend
- **Next.js 16 App Router** + React 19 + TypeScript
- UI built with Tailwind v4 + shadcn components + Framer Motion
- Main UI pages:
  - `/` → home + user document library
  - `/books/new` → upload flow
  - `/books/[slug]` → document interaction workspace

### Backend (inside Next.js app)
- API routes under `src/app/api/*`
- Server actions under `src/lib/actions/*`
- Auth via **Clerk**
- Database via **MongoDB + Mongoose**
- Blob storage via **Vercel Blob**
- LLM via **Groq** (`llama-3.3-70b-versatile`)
- Voice orchestration via **Vapi**

### Data layer
- `Book` collection: document metadata + summary fields
- `BookSegment` collection: chunked text for retrieval
- `VoiceSession` collection: voice usage/session tracking

---

## 3) Authentication and route protection

- Clerk is initialized in `src/app/layout.tsx` with `<ClerkProvider>`.
- Global middleware (`src/proxy.ts`) protects non-public routes.
- Public routes:
  - `/`
  - `/sign-in(.*)`
  - `/sign-up(.*)`
  - `/api/vapi(.*)` (needed for Vapi callback/tool flow)
- Private features (uploading, book workspace, summarize/chat use user-scoped data).

**Interview point:** data is isolated by `clerkId` in DB queries.

---

## 4) Full user journey flow

## 4.1 Home page (`/`)
File: `src/app/page.tsx`

- If user is signed out: shows product pitch + sign-in CTA.
- If signed in:
  1. Connects DB via `connectDB()`.
  2. Fetches documents from `Book` by `clerkId`.
  3. Optional search by title/author using regex.
  4. Shows document grid.
  5. If no documents, renders inline `UploadForm`.

---

## 4.2 Upload flow (`/books/new` or inline upload)
Files:
- `src/components/UploadForm.tsx`
- `src/app/api/upload/route.ts`
- `src/lib/actions/books.ts`
- `src/lib/utils/splitSegments.ts`

### Step-by-step
1. User selects or drags a file.
2. Client validates type (`pdf/docx/txt/xml`).
3. Client-side text extraction:
   - PDF → `pdfjs-dist`
   - DOCX → `mammoth`
   - TXT/XML → direct text read
4. Upload original document to Vercel Blob via `/api/upload` token flow.
5. Generate a placeholder cover image in browser canvas and upload it.
6. Call server action `createBook(...)` with metadata + full extracted text.
7. Server action:
   - Checks auth (`auth()`)
   - Connects DB
   - Prevents duplicate by `clerkId + title`
   - Generates slug (`generateSlug`)
   - Splits text into segments (default **500 words with 50 overlap**)
   - Creates `Book` record
   - Bulk inserts `BookSegment` records in batches of 100
8. Client redirects to `/books/[slug]`.

**Interview point:** extraction is done client-side before storage/indexing, reducing backend parser complexity.

---

## 4.3 Book workspace (`/books/[slug]`)
Files:
- `src/app/books/[slug]/page.tsx`
- `src/components/BookClientLayout.tsx`
- `src/components/DocSidebar.tsx`
- `src/components/BookInteraction.tsx`

### Server page responsibilities
- Verify signed-in user.
- Fetch current book by `slug + clerkId`.
- Fetch all user docs for sidebar navigation.
- Pass initial summary fields (`keyIdeas`, `concepts`, `highlights`) to client.

### Client layout responsibilities
- Render:
  - Header (title/author/type)
  - `SummaryPanel`
  - `BookInteraction` (Chat/Voice tab)
- Optional side viewer opens original source file via Google Docs viewer iframe.

---

## 5) Chat mode flow (RAG)
Files:
- `src/components/ChatPanel.tsx`
- `src/app/api/chat/route.ts`

### Request flow
1. User sends message in `ChatPanel`.
2. Frontend posts to `/api/chat` with:
   - conversation messages
   - `bookId`, `bookTitle`, `bookAuthor`
3. API verifies auth and validates `bookId`.
4. API retrieves relevant context from `BookSegment`:
   - Primary: MongoDB `$text` search + text score sorting
   - Fallback: regex keyword matching
   - Top 3 chunks returned
5. API builds system prompt that includes retrieved passages.
6. Calls Groq chat completion API.
7. Returns AI reply to UI.

**Interview point:** this is a practical RAG pipeline with deterministic retrieval + generative answering.

---

## 6) Voice mode flow (Vapi)
Files:
- `src/hooks/useVapi.ts`
- `src/components/VapiControls.tsx`
- `src/lib/actions/sessions.ts`
- `src/app/api/vapi/search-book/route.ts`

### Session/call lifecycle
1. User clicks **Start Conversation**.
2. `startVoiceSession(bookId)` server action creates `VoiceSession` row and returns max duration (3600s).
3. Client initializes Vapi SDK using `NEXT_PUBLIC_VAPI_PUBLIC_KEY`.
4. Starts assistant call with override variables:
   - `bookTitle`, `bookAuthor`, `bookId`
5. Hook listens to Vapi events:
   - `call-start`, `call-end`
   - transcript partial/final messages
   - error events
6. Transcript is shown live in `Transcript` component.
7. Timer tracks duration and force-stops at max duration.
8. On call end, `endVoiceSession(sessionId, duration)` persists usage.

### Retrieval during voice call
- Vapi assistant can call tool endpoint `/api/vapi/search-book`.
- Route accepts different Vapi tool payload formats.
- It parses args, validates `bookId`, performs same retrieval strategy (`$text` then regex), and returns passages.

**Interview point:** voice + tool-calling retrieval is integrated so spoken answers stay grounded in document chunks.

---

## 7) Summary generation flow
Files:
- `src/components/SummaryPanel.tsx`
- `src/app/api/summarize/route.ts`

### Step-by-step
1. User clicks generate/regenerate summary.
2. Frontend posts `{ bookId }` to `/api/summarize`.
3. API validates user and ownership.
4. Rebuilds book text from `BookSegment` ordered by `segmentIndex`.
5. Caps text to `MAX_CHARS = 12000` for token/cost constraints.
6. Calls Groq with prompt demanding strict JSON shape:
   - `keyIdeas[]`
   - `concepts[]`
   - `highlights[]`
7. Parses returned JSON from model output.
8. Saves summary fields directly on `Book` document.
9. UI renders tabbed visual summary and supports PDF export via `jsPDF`.

---

## 8) Data model design

## `Book` (metadata + derived insights)
Key fields:
- `clerkId`, `title`, `author`, `slug`
- `fileURL`, `fileBlobKey`, `coverURL`, `coverBlobKey`
- `persona`, `fileType`, `totalSegments`
- `keyIdeas`, `concepts`, `highlights`

## `BookSegment` (RAG retrieval unit)
Key fields:
- `bookId` (ref Book)
- `content`
- `segmentIndex`

Indexes:
- `{ bookId: 1, segmentIndex: 1 }` unique
- `{ content: "text" }` for full-text search

## `VoiceSession`
Key fields:
- `clerkId`, `bookId`
- `startedAt`, `endedAt`, `durationSeconds`
- `billingPeriodStart`

---

## 9) Why chunking and overlap matter

Chunking uses 500 words with 50-word overlap.

Benefits:
- Keeps retrieval units manageable.
- Overlap preserves context between chunk boundaries.
- Improves answer quality for queries spanning adjacent sections.

Tradeoff:
- More segments means larger index and more writes on upload.

---

## 10) Configuration and environment

Required env vars:
- `MONGODB_URI`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `GROQ_API_KEY`
- `NEXT_PUBLIC_VAPI_PUBLIC_KEY`
- `NEXT_PUBLIC_VAPI_ASSISTANT_ID`
- `BLOB_READ_WRITE_TOKEN`

Next.js config highlights (`next.config.ts`):
- Allows remote images from Vercel Blob host
- Disables `canvas` alias in webpack for compatibility

---

## 11) Important engineering decisions (good interview talking points)

1. **User-scoped data isolation** using Clerk user ID in DB queries.
2. **Client-side document text extraction** for multi-format files.
3. **Simple, production-friendly RAG** with Mongo text index + regex fallback.
4. **Unified interaction model**: same indexed document powers chat and voice.
5. **Progressive enhancement**: if no summary exists, user can generate on demand.
6. **Session tracking** for voice usage/billing readiness.

---

## 12) End-to-end sequence (quick narrative for interview)

Use this as your interview answer:

1. User signs in with Clerk.
2. User uploads a document.
3. Browser extracts text and uploads source file + generated cover to Blob.
4. Server action creates `Book`, chunks extracted text, stores segments in MongoDB.
5. User opens the book workspace.
6. In chat mode, each question triggers retrieval from segments and Groq generates grounded responses.
7. In voice mode, Vapi runs a live assistant call; retrieval tool endpoint fetches relevant passages on demand.
8. User can generate structured insights (ideas/concepts/highlights), which are saved and exportable as PDF.

---

## 13) Known limitations / current technical debt

- Lint currently reports existing issues in repository unrelated to this document update.
- Build may fail in restricted environments because Next.js tries to fetch Google Fonts at build time.
- Voice persona selection UI exists (`VoiceSelector`) but upload currently hardcodes a default persona id.
- No vector embeddings yet; retrieval is text index + regex based (simpler but less semantic than vector search).

---

## 14) How to explain future improvements

If interviewer asks “what next?”:
- Add embedding-based semantic retrieval (hybrid with text search)
- Add citation mapping from answer back to segment indices/pages
- Add robust document parsing fallback workers/server-side extraction
- Add usage analytics dashboard from `VoiceSession`
- Add test coverage for API routes and server actions

---

## 15) File map for quick revision

- Auth/middleware: `src/proxy.ts`, `src/app/layout.tsx`
- Home/library: `src/app/page.tsx`
- Upload: `src/components/UploadForm.tsx`, `src/app/api/upload/route.ts`, `src/lib/actions/books.ts`
- Workspace: `src/app/books/[slug]/page.tsx`, `src/components/BookClientLayout.tsx`
- Chat RAG: `src/components/ChatPanel.tsx`, `src/app/api/chat/route.ts`
- Voice: `src/hooks/useVapi.ts`, `src/components/VapiControls.tsx`, `src/app/api/vapi/search-book/route.ts`, `src/lib/actions/sessions.ts`
- Summary: `src/components/SummaryPanel.tsx`, `src/app/api/summarize/route.ts`
- Models: `src/database/models/Book.ts`, `BookSegment.ts`, `VoiceSession.ts`
- DB connection: `src/lib/mongoose.ts`
- Chunking/slug: `src/lib/utils/splitSegments.ts`, `src/lib/utils/slug.ts`

---

If you want, the next step is I can also create a **short 2-minute interview pitch** and a **list of probable interviewer questions with model answers** based on this exact codebase.
