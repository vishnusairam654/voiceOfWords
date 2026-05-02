"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { upload } from "@vercel/blob/client";
import { Loader2, BookOpen } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import FileUploader from "@/components/FileUploader";
import VoiceSelector from "@/components/VoiceSelector";
import { createBook } from "@/lib/actions/books";

const uploadSchema = z.object({
  title: z.string().min(1, "Title is required"),
  author: z.string().min(1, "Author is required"),
  persona: z.string().min(1, "Select a voice persona"),
  pdfFile: z.instanceof(File, { message: "PDF file is required" }),
  coverFile: z.instanceof(File).optional(),
});

type UploadFormData = z.infer<typeof uploadSchema>;

async function extractPDF(file: File): Promise<{
  text: string;
  coverDataURL: string;
}> {
  // Dynamic import — pdfjs-dist uses browser APIs (DOMMatrix, canvas)
  // that don't exist on the server, so we must load it at runtime only
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  let coverDataURL = "";
  const firstPage = await pdf.getPage(1);
  const viewport = firstPage.getViewport({ scale: 1.5 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d")!;
  await firstPage.render({ canvas, canvasContext: ctx, viewport }).promise;
  coverDataURL = canvas.toDataURL("image/png");

  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any) => (item.str ? String(item.str) : ""))
      .join(" ");
    fullText += pageText + " ";
  }

  pdf.destroy();

  return { text: fullText.trim(), coverDataURL };
}

export default function UploadForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      title: "",
      author: "",
      persona: "",
    },
  });

  const pdfFile = watch("pdfFile");
  const coverFile = watch("coverFile");
  const persona = watch("persona");

  const onSubmit = async (data: UploadFormData) => {
    setLoading(true);
    try {
      setProgress("Parsing PDF...");
      const { text, coverDataURL } = await extractPDF(data.pdfFile);

      if (!text || text.trim().length < 50) {
        toast.error(
          "Could not extract enough text from the PDF. Please try a different file."
        );
        setLoading(false);
        return;
      }

      setProgress("Uploading PDF...");
      const pdfBlob = await upload(data.pdfFile.name, data.pdfFile, {
        access: "public",
        handleUploadUrl: "/api/upload",
        addRandomSuffix: true,
      });

      setProgress("Uploading cover...");
      let coverBlob;
      if (data.coverFile) {
        coverBlob = await upload(data.coverFile.name, data.coverFile, {
          access: "public",
          handleUploadUrl: "/api/upload",
          addRandomSuffix: true,
        });
      } else {
        const coverResponse = await fetch(coverDataURL);
        const coverBlobData = await coverResponse.blob();
        coverBlob = await upload("cover.png", coverBlobData, {
          access: "public",
          handleUploadUrl: "/api/upload",
          addRandomSuffix: true,
        });
      }

      setProgress("Saving to database...");

      const result = await createBook({
        title: data.title,
        author: data.author,
        fileURL: pdfBlob.url,
        fileBlobKey: pdfBlob.pathname,
        coverURL: coverBlob.url,
        coverBlobKey: coverBlob.pathname,
        persona: data.persona,
        fullText: text,
      });

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      if ("duplicate" in result && result.duplicate) {
        toast.info("Book already exists. Redirecting...");
        router.push(`/books/${result.slug}`);
        return;
      }

      if ("success" in result && result.success) {
        toast.success("Book uploaded successfully!");
        router.push(`/books/${result.slug}`);
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Upload failed. Please try again.");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="space-y-2">
        <Label htmlFor="title">Book Title</Label>
        <Input
          id="title"
          placeholder="e.g. The Great Gatsby"
          {...register("title")}
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="author">Author</Label>
        <Input
          id="author"
          placeholder="e.g. F. Scott Fitzgerald"
          {...register("author")}
        />
        {errors.author && (
          <p className="text-sm text-destructive">{errors.author.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>PDF File</Label>
        <FileUploader
          label="Upload your book (PDF)"
          accept="application/pdf"
          selectedFile={pdfFile}
          onChange={(file) => setValue("pdfFile", file, { shouldValidate: true })}
        />
        {errors.pdfFile && (
          <p className="text-sm text-destructive">{errors.pdfFile.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>
          Cover Image{" "}
          <span className="text-muted-foreground">(optional)</span>
        </Label>
        <FileUploader
          label="Upload a custom cover image"
          accept="image/jpeg,image/png,image/webp"
          selectedFile={coverFile}
          onChange={(file) =>
            setValue("coverFile", file, { shouldValidate: true })
          }
        />
        <p className="text-xs text-muted-foreground">
          If not provided, the first page of the PDF will be used as the cover.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Voice Persona</Label>
        <VoiceSelector
          value={persona}
          onChange={(id) => setValue("persona", id, { shouldValidate: true })}
        />
        {errors.persona && (
          <p className="text-sm text-destructive">{errors.persona.message}</p>
        )}
      </div>

      <Button type="submit" disabled={loading} size="lg" className="w-full">
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            {progress}
          </>
        ) : (
          <>
            <BookOpen className="size-4" data-icon="inline-start" />
            Upload Book
          </>
        )}
      </Button>
    </form>
  );
}
