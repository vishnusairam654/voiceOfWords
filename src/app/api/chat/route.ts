import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import BookSegment from "@/database/models/BookSegment";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

async function getRelevantContext(
  bookId: string,
  query: string
): Promise<string> {
  const objectId = new mongoose.Types.ObjectId(bookId);

  // Try MongoDB $text search first
  try {
    const results = await BookSegment.find(
      { bookId: objectId, $text: { $search: query } },
      { score: { $meta: "textScore" }, content: 1 }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(3)
      .lean();

    if (results.length > 0) {
      return results.map((r) => r.content).join("\n\n");
    }
  } catch {
    // Fall through to regex
  }

  // Regex fallback
  const words = query
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  if (words.length === 0) return "";

  const pattern = words.join("|");
  const fallbackResults = await BookSegment.find({
    bookId: objectId,
    content: { $regex: pattern, $options: "i" },
  })
    .limit(3)
    .lean();

  return fallbackResults.map((r) => r.content).join("\n\n");
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messages, bookId, bookTitle, bookAuthor } = (await request.json()) as {
      messages: ChatMessage[];
      bookId: string;
      bookTitle: string;
      bookAuthor: string;
    };

    if (!messages || !bookId) {
      return NextResponse.json(
        { error: "Missing messages or bookId" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      return NextResponse.json(
        { error: "Invalid bookId" },
        { status: 400 }
      );
    }

    await connectDB();

    // Get the latest user message for RAG search
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    const context = lastUserMsg
      ? await getRelevantContext(bookId, lastUserMsg.content)
      : "";

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
      return NextResponse.json(
        { error: "GROQ_API_KEY not configured" },
        { status: 500 }
      );
    }

    const systemPrompt = `You are a knowledgeable and engaging book companion AI. You are discussing the book "${bookTitle}" by ${bookAuthor}.

Use the following passages from the book to inform your answers. If the passages don't contain relevant information, use your general knowledge about the book but mention that you're drawing from general knowledge.

Be conversational, insightful, and encourage deeper thinking about the book's themes, characters, and ideas.

${context ? `--- RELEVANT BOOK PASSAGES ---\n${context}\n--- END PASSAGES ---` : "No specific passages found for this query."}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-10),
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error("Groq API error:", errData);
      return NextResponse.json(
        { error: "AI response failed" },
        { status: 502 }
      );
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "I couldn't generate a response.";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json(
      { error: "Chat failed" },
      { status: 500 }
    );
  }
}
