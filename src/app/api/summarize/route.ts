import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import Book from "@/database/models/Book";
import BookSegment from "@/database/models/BookSegment";

async function getBookText(bookId: string, maxSegments = 10): Promise<string> {
  const objectId = new mongoose.Types.ObjectId(bookId);
  const segments = await BookSegment.find({ bookId: objectId })
    .sort({ segmentIndex: 1 })
    .limit(maxSegments)
    .lean();
  return segments.map((s) => s.content).join("\n\n");
}

async function callGroq(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY not configured");

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
        max_tokens: 2000,
        temperature: 0.5,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    console.error("Groq error:", err);
    throw new Error("AI summarization failed");
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bookId, mode } = (await request.json()) as {
      bookId: string;
      mode?: "short" | "detailed" | "keypoints" | "all";
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

    const summaryMode = mode || "all";
    const title = book.title;
    const author = book.author;

    const baseSystem = `You are an expert document analyst. You are analyzing "${title}" by ${author}.`;

    if (summaryMode === "short" || summaryMode === "all") {
      const shortSummary = await callGroq(
        baseSystem,
        `Provide a concise summary (3-4 sentences max) of the following document content:\n\n${bookText}`
      );
      book.shortSummary = shortSummary.trim();
    }

    if (summaryMode === "detailed" || summaryMode === "all") {
      const detailedSummary = await callGroq(
        baseSystem,
        `Provide a comprehensive, detailed summary (2-3 paragraphs) covering all major topics, arguments, and conclusions of the following document:\n\n${bookText}`
      );
      book.detailedSummary = detailedSummary.trim();
    }

    if (summaryMode === "keypoints" || summaryMode === "all") {
      const keyPointsRaw = await callGroq(
        baseSystem,
        `Extract 5-8 key points from the following document. Return ONLY a JSON array of strings, no other text. Example: ["Point 1", "Point 2"]\n\n${bookText}`
      );

      try {
        const match = keyPointsRaw.match(/\[[\s\S]*\]/);
        if (match) {
          book.keyPoints = JSON.parse(match[0]);
        } else {
          book.keyPoints = keyPointsRaw
            .split("\n")
            .filter((l: string) => l.trim().startsWith("-") || l.trim().startsWith("•"))
            .map((l: string) => l.replace(/^[-•*]\s*/, "").trim())
            .filter(Boolean);
        }
      } catch {
        book.keyPoints = [keyPointsRaw.trim()];
      }
    }

    await book.save();

    return NextResponse.json({
      shortSummary: book.shortSummary,
      detailedSummary: book.detailedSummary,
      keyPoints: book.keyPoints,
    });
  } catch (err) {
    console.error("Summarize error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Summarization failed" },
      { status: 500 }
    );
  }
}
