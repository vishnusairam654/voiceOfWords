import Link from "next/link";
import Image from "next/image";
import { auth } from "@clerk/nextjs/server";
import { SignInButton } from "@clerk/nextjs";
import { BookOpen, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { connectDB } from "@/lib/mongoose";
import Book from "@/database/models/Book";

interface HomePageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { userId } = await auth();
  const { q } = await searchParams;

  if (!userId) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-8 flex size-20 items-center justify-center rounded-2xl bg-primary/10">
            <BookOpen className="size-10 text-primary" />
          </div>
          <h1 className="font-heading text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
            Bookified
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Upload your books and have natural voice conversations about them
            with AI. Powered by premium ElevenLabs voices and intelligent
            search.
          </p>
          <div className="mt-8">
            <SignInButton mode="modal">
              <Button size="lg" className="text-base">
                Get Started — Sign In
              </Button>
            </SignInButton>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              {
                title: "Upload Documents",
                desc: "Import PDFs, DOCX, TXT, or XML files — we'll extract the text automatically.",
              },
              {
                title: "Choose a Voice",
                desc: "Pick from premium AI voices to narrate and discuss your books.",
              },
              {
                title: "Converse Naturally",
                desc: "Ask questions, get summaries, and explore ideas through voice or chat.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-border bg-card p-5 text-left"
              >
                <h3 className="font-heading text-base font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  await connectDB();

  interface BookQuery {
    clerkId: string;
    $or?: Array<{ title: { $regex: string; $options: string } } | { author: { $regex: string; $options: string } }>;
  }

  const query: BookQuery = { clerkId: userId };
  if (q && q.trim()) {
    query.$or = [
      { title: { $regex: q.trim(), $options: "i" } },
      { author: { $regex: q.trim(), $options: "i" } },
    ];
  }

  const books = await Book.find(query).sort({ createdAt: -1 }).lean();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          My Documents
        </h1>
        <Link href="/books/new">
          <Button>
            <Plus className="size-4" data-icon="inline-start" />
             Upload Document
          </Button>
        </Link>
      </div>

      {/* Search */}
      <form className="mt-6" action="/" method="GET">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q || ""}
            placeholder="Search by title or author..."
            className="pl-10"
          />
        </div>
      </form>

      {/* Book Grid */}
      {books.length === 0 ? (
        <div className="mt-20 flex flex-col items-center justify-center text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted">
            <BookOpen className="size-8 text-muted-foreground" />
          </div>
          <h2 className="font-heading text-xl font-semibold text-foreground">
            {q ? "No books found" : "No books yet"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {q
              ? "Try a different search term."
              : "Upload your first book to get started!"}
          </p>
          {!q && (
            <Link href="/books/new" className="mt-4">
              <Button variant="outline">
                <Plus className="size-4" data-icon="inline-start" />
                 Upload Your First Document
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {books.map((book) => (
            <Link
              key={book.slug}
              href={`/books/${book.slug}`}
              className="group"
            >
              <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-border bg-muted transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/10 group-hover:-translate-y-1">
                <Image
                  src={book.coverURL}
                  alt={book.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                />
                {book.fileType && book.fileType !== "pdf" && (
                  <span className="absolute top-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white backdrop-blur-sm">
                    {book.fileType}
                  </span>
                )}</div>
              <div className="mt-2 px-0.5">
                <h3 className="line-clamp-1 text-sm font-semibold text-foreground">
                  {book.title}
                </h3>
                <p className="line-clamp-1 text-xs text-muted-foreground">
                  {book.author}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
