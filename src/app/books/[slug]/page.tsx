import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/mongoose";
import Book from "@/database/models/Book";
import DocSidebar from "@/components/DocSidebar";
import SummaryPanel from "@/components/SummaryPanel";
import BookInteraction from "@/components/BookInteraction";
import BookClientLayout from "@/components/BookClientLayout";

interface BookPageProps {
  params: Promise<{ slug: string }>;
}

export default async function BookPage({ params }: BookPageProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const { slug } = await params;

  await connectDB();

  // Fetch the current book
  const book = await Book.findOne({
    slug,
    clerkId: userId,
  }).lean();

  if (!book) {
    redirect("/");
  }

  // Fetch all user documents for the sidebar
  const allDocs = await Book.find({ clerkId: userId })
    .select("title author slug fileType createdAt")
    .sort({ createdAt: -1 })
    .lean();

  const bookData = {
    _id: book._id.toString(),
    title: book.title,
    author: book.author,
    persona: book.persona,
  };

  const sidebarDocs = allDocs.map((d) => ({
    _id: d._id.toString(),
    title: d.title,
    author: d.author,
    slug: d.slug,
    fileType: d.fileType || "pdf",
    createdAt: d.createdAt?.toISOString() || "",
  }));

  const initialSummary = {
    keyIdeas: book.keyIdeas || [],
    concepts: book.concepts || [],
    highlights: book.highlights || [],
  };


  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Sidebar */}
      <div className="hidden h-full w-20 shrink-0 md:block lg:w-20 lg:hover:w-60 transition-all duration-300">
        <DocSidebar documents={sidebarDocs} />
      </div>

      <BookClientLayout 
        book={book} 
        bookData={bookData} 
        initialSummary={initialSummary} 
      />
    </div>
  );
}
