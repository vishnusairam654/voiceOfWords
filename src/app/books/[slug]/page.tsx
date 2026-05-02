import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/mongoose";
import Book from "@/database/models/Book";
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

  const book = await Book.findOne({
    slug,
    clerkId: userId,
  }).lean();

  if (!book) {
    redirect("/");
  }

  const bookData = {
    _id: book._id.toString(),
    title: book.title,
    author: book.author,
    persona: book.persona,
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <BookInteraction book={bookData} />
    </div>
  );
}
