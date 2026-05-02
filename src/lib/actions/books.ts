"use server";

import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/mongoose";
import Book from "@/database/models/Book";
import BookSegment from "@/database/models/BookSegment";
import { generateSlug } from "@/lib/utils/slug";
import { splitIntoSegments } from "@/lib/utils/splitSegments";

interface CreateBookInput {
  title: string;
  author: string;
  fileURL: string;
  fileBlobKey: string;
  coverURL: string;
  coverBlobKey: string;
  persona: string;
  fullText: string;
  fileType?: string;
}

export async function createBook(data: CreateBookInput) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  await connectDB();

  const existing = await Book.findOne({ clerkId: userId, title: data.title });
  if (existing) {
    return { duplicate: true, slug: existing.slug };
  }

  const slug = generateSlug(data.title);
  const segments = splitIntoSegments(data.fullText);

  const book = await Book.create({
    clerkId: userId,
    title: data.title,
    author: data.author,
    slug,
    fileURL: data.fileURL,
    fileBlobKey: data.fileBlobKey,
    coverURL: data.coverURL,
    coverBlobKey: data.coverBlobKey,
    persona: data.persona,
    fileType: data.fileType || "pdf",
    totalSegments: segments.length,
  });

  if (segments.length > 0) {
    const segmentDocs = segments.map((content, i) => ({
      bookId: book._id,
      content,
      segmentIndex: i,
    }));

    // Insert in batches of 100 to avoid MongoDB write limits
    const BATCH_SIZE = 100;
    for (let i = 0; i < segmentDocs.length; i += BATCH_SIZE) {
      const batch = segmentDocs.slice(i, i + BATCH_SIZE);
      await BookSegment.insertMany(batch, { ordered: false });
    }
  }

  return { success: true, slug };
}
