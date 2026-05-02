import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/mongoose";
import Book from "@/database/models/Book";
import DocSidebar from "@/components/DocSidebar";
import SummaryPanel from "@/components/SummaryPanel";
import BookInteraction from "@/components/BookInteraction";

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
    <div className="flex h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <div className="hidden w-60 shrink-0 md:block">
        <DocSidebar documents={sidebarDocs} />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6">
          {/* Document Header */}
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              {book.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              by {book.author}
              <span className="ml-2 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase">
                {book.fileType || "pdf"}
              </span>
            </p>
          </div>

          {/* Summary Section */}
          <SummaryPanel
            bookId={book._id.toString()}
            bookTitle={book.title}
            initialSummary={initialSummary}
          />

          {/* Chat / Voice Section */}
          <BookInteraction book={bookData} />
        </div>
      </div>
    </div>
  );
}
