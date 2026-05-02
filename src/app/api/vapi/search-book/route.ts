import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import BookSegment from "@/database/models/BookSegment";

function parseArgs(args: unknown): { bookId: string; query: string } {
  if (typeof args === "string") {
    try {
      return JSON.parse(args);
    } catch {
      return { bookId: "", query: "" };
    }
  }
  return args as { bookId: string; query: string };
}

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

async function searchBookSegments(
  bookId: string,
  query: string
): Promise<string> {
  await connectDB();

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
      return results.map((r) => r.content).join("\n\n---\n\n");
    }
  } catch (err) {
    console.warn("Text search failed, falling back to regex:", err);
  }

  // Regex fallback
  const words = query
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  if (words.length === 0) {
    return "No relevant passages found.";
  }

  const pattern = words.join("|");
  const fallbackResults = await BookSegment.find({
    bookId: objectId,
    content: { $regex: pattern, $options: "i" },
  })
    .limit(3)
    .lean();

  if (fallbackResults.length === 0) {
    return "No relevant passages found.";
  }

  return fallbackResults.map((r) => r.content).join("\n\n---\n\n");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    let bookId: string;
    let query: string;

    // Handle Vapi toolCallList / toolCalls format
    const toolCall =
      body.message?.toolCallList?.[0] ?? body.message?.toolCalls?.[0];

    if (toolCall) {
      const args = parseArgs(toolCall.function?.arguments);
      bookId = args.bookId;
      query = args.query;
    }
    // Handle Vapi functionCall format
    else if (body.message?.functionCall) {
      const args = parseArgs(body.message.functionCall.parameters);
      bookId = args.bookId;
      query = args.query;
    } else {
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 }
      );
    }

    if (!bookId || !query) {
      return NextResponse.json(
        { error: "Missing bookId or query" },
        { status: 400 }
      );
    }

    if (!isValidObjectId(bookId)) {
      return NextResponse.json(
        { error: "Invalid bookId format" },
        { status: 400 }
      );
    }

    const result = await searchBookSegments(bookId, query);

    return NextResponse.json({ result });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
