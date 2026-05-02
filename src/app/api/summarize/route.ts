import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import Book from "@/database/models/Book";
import BookSegment from "@/database/models/BookSegment";

// Limit to ~3000 words (~4000 tokens) to stay under Groq free tier limits
const MAX_CHARS = 12000;

async function getBookText(bookId: string): Promise<string> {
  const objectId = new mongoose.Types.ObjectId(bookId);
  const segments = await BookSegment.find({ bookId: objectId })
    .sort({ segmentIndex: 1 })
    .lean();

  let text = "";
  for (const seg of segments) {
    if (text.length + seg.content.length > MAX_CHARS) {
      // Add partial last segment if room
      const remaining = MAX_CHARS - text.length;
      if (remaining > 200) {
        text += "\n\n" + seg.content.slice(0, remaining);
      }
      break;
    }
    text += (text ? "\n\n" : "") + seg.content;
  }
  return text;
}

async function callGroq(
  systemPrompt: string,
  userPrompt: string,
  retries = 2
): Promise<string> {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY not configured");

  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 1000,
          temperature: 0.5,
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
    }

    const err = await response.json().catch(() => ({}));

    // Retry on rate limit
    if (response.status === 429 && attempt < retries) {
      const waitMs = (attempt + 1) * 8000; // 8s, 16s
      console.warn(`Groq rate limited, retrying in ${waitMs / 1000}s...`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    console.error("Groq error:", err);
    throw new Error(
      err?.error?.message || "AI summarization failed"
    );
  }

  throw new Error("AI summarization failed after retries");
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bookId } = (await request.json()) as {
      bookId: string;
    };

    if (!bookId || !mongoose.Types.ObjectId.isValid(bookId)) {
      return NextResponse.json(
        { error: "Invalid bookId" },
        { status: 400 }
      );
    }

    await connectDB();

    const book = await Book.findOne({
      _id: bookId,
      clerkId: userId,
    });

    if (!book) {
      return NextResponse.json(
        { error: "Book not found" },
        { status: 404 }
      );
    }

    const bookText = await getBookText(bookId);

    if (!bookText.trim()) {
      return NextResponse.json(
        { error: "No text content found" },
        { status: 400 }
      );
    }

    const title = book.title;
    const author = book.author;

    const baseSystem = `You are an expert document analyst. You are analyzing "${title}" by ${author}. Extract structured insights.`;

    const combined = await callGroq(
      baseSystem,
      `Analyze the following document and provide your response in this EXACT JSON format (no other text):
{
  "keyIdeas": [
    { "title": "Main Idea 1", "description": "Brief explanation of the idea" },
    { "title": "Main Idea 2", "description": "Brief explanation of the idea" },
    { "title": "Main Idea 3", "description": "Brief explanation of the idea" }
  ],
  "concepts": ["Concept 1", "Concept 2", "Concept 3", "Concept 4", "Concept 5"],
  "highlights": [
    "A direct, profound quote or key takeaway from the text",
    "Another important quote or crucial highlight"
  ]
}

DOCUMENT:
${bookText}`
    );

    try {
      const jsonMatch = combined.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        book.keyIdeas = parsed.keyIdeas || [];
        book.concepts = parsed.concepts || [];
        book.highlights = parsed.highlights || [];
      }
    } catch {
      console.error("Failed to parse Groq JSON response", combined);
      throw new Error("Failed to generate structured summary");
    }

    await book.save();

    return NextResponse.json({
      keyIdeas: book.keyIdeas,
      concepts: book.concepts,
      highlights: book.highlights,
    });
  } catch (err) {
    console.error("Summarize error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Summarization failed" },
      { status: 500 }
    );
  }
}
