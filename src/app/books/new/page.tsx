import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import UploadForm from "@/components/UploadForm";

export default async function NewBookPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          Upload a Book
        </h1>
        <p className="mt-2 text-muted-foreground">
          Upload a PDF and choose a voice persona to start having conversations
          about your book.
        </p>
      </div>
      <UploadForm />
    </div>
  );
}
