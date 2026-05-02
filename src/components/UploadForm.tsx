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

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/xml",
  "application/xml",
];

const ACCEPT_STRING =
  "application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,text/plain,.txt,text/xml,application/xml,.xml";

function getFileType(file: File): string {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".docx")) return "docx";
  if (name.endsWith(".txt")) return "txt";
  if (name.endsWith(".xml")) return "xml";
  if (file.type === "application/pdf") return "pdf";
  if (file.type.includes("wordprocessingml")) return "docx";
  if (file.type === "text/plain") return "txt";
  if (file.type.includes("xml")) return "xml";
  return "unknown";
}

const uploadSchema = z.object({
  title: z.string().min(1, "Title is required"),
  author: z.string().min(1, "Author is required"),
  persona: z.string().min(1, "Select a voice persona"),
  pdfFile: z.instanceof(File, { message: "Document file is required" }),
  coverFile: z.instanceof(File).optional(),
});

type UploadFormData = z.infer<typeof uploadSchema>;

async function extractText(file: File): Promise<{
  text: string;
  coverDataURL: string;
  fileType: string;
}> {
  const fileType = getFileType(file);

  if (fileType === "pdf") {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

    // Generate cover from first page
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

    return { text: fullText.trim(), coverDataURL, fileType: "pdf" };
  }

  if (fileType === "docx") {
    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return { text: result.value.trim(), coverDataURL: "", fileType: "docx" };
  }

  if (fileType === "txt") {
    const text = await file.text();
    return { text: text.trim(), coverDataURL: "", fileType: "txt" };
  }

  if (fileType === "xml") {
    const rawText = await file.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(rawText, "text/xml");
    const textContent = xmlDoc.documentElement.textContent || "";
    return { text: textContent.trim(), coverDataURL: "", fileType: "xml" };
  }

  throw new Error(`Unsupported file type: ${fileType}`);
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
      const fileType = getFileType(data.pdfFile);
      if (!ACCEPTED_TYPES.includes(data.pdfFile.type) && fileType === "unknown") {
        toast.error(
          "Unsupported file format. Please upload a PDF, DOCX, TXT, or XML file."
        );
        setLoading(false);
        return;
      }

      setProgress("Parsing document...");
      const { text, coverDataURL } = await extractText(data.pdfFile);

      if (!text || text.trim().length < 50) {
        toast.error(
          "Could not extract enough text from the file. Please try a different document."
        );
        setLoading(false);
        return;
      }

      setProgress("Uploading document...");
      const uniquePrefix = `${Date.now()}-`;
      const docBlob = await upload(uniquePrefix + data.pdfFile.name, data.pdfFile, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });

      setProgress("Uploading cover...");
      let coverBlob;
      if (data.coverFile) {
        coverBlob = await upload(uniquePrefix + data.coverFile.name, data.coverFile, {
          access: "public",
          handleUploadUrl: "/api/upload",
        });
      } else if (coverDataURL) {
        const coverResponse = await fetch(coverDataURL);
        const coverBlobData = await coverResponse.blob();
        coverBlob = await upload(`${uniquePrefix}cover.png`, coverBlobData, {
          access: "public",
          handleUploadUrl: "/api/upload",
        });
      } else {
        // Generate a placeholder cover for non-PDF files
        const canvas = document.createElement("canvas");
        canvas.width = 400;
        canvas.height = 560;
        const ctx = canvas.getContext("2d")!;

        // Background
        ctx.fillStyle = "#f5f0e8";
        ctx.fillRect(0, 0, 400, 560);

        // Border
        ctx.strokeStyle = "#8b6914";
        ctx.lineWidth = 3;
        ctx.strokeRect(20, 20, 360, 520);

        // Title
        ctx.fillStyle = "#3d2b1f";
        ctx.font = "bold 24px serif";
        ctx.textAlign = "center";
        const titleLines = data.title.match(/.{1,20}/g) || [data.title];
        titleLines.forEach((line, i) => {
          ctx.fillText(line, 200, 200 + i * 32);
        });

        // Author
        ctx.font = "16px serif";
        ctx.fillStyle = "#6b5b47";
        ctx.fillText(data.author, 200, 320);

        // File type badge
        ctx.font = "bold 14px sans-serif";
        ctx.fillStyle = "#8b6914";
        ctx.fillText(fileType.toUpperCase(), 200, 440);

        const placeholderURL = canvas.toDataURL("image/png");
        const response = await fetch(placeholderURL);
        const blob = await response.blob();
        coverBlob = await upload(`${uniquePrefix}cover.png`, blob, {
          access: "public",
          handleUploadUrl: "/api/upload",
        });
      }

      setProgress("Saving to database...");

      const result = await createBook({
        title: data.title,
        author: data.author,
        fileURL: docBlob.url,
        fileBlobKey: docBlob.pathname,
        coverURL: coverBlob.url,
        coverBlobKey: coverBlob.pathname,
        persona: data.persona,
        fullText: text,
        fileType,
      });

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      if ("duplicate" in result && result.duplicate) {
        toast.info("Document already exists. Redirecting...");
        router.push(`/books/${result.slug}`);
        return;
      }

      if ("success" in result && result.success) {
        toast.success("Document uploaded successfully!");
        router.push(`/books/${result.slug}`);
      }
    } catch (err) {
      console.error("Upload error:", err);
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg.includes("Unsupported") ? msg : "Upload failed. Please try again.");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="space-y-2">
        <Label htmlFor="title">Document Title</Label>
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
        <Label>Document File</Label>
        <FileUploader
          label="Upload your document (PDF, DOCX, TXT, XML)"
          accept={ACCEPT_STRING}
          selectedFile={pdfFile}
          onChange={(file) => setValue("pdfFile", file, { shouldValidate: true })}
        />
        {pdfFile && (
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <span className="rounded bg-primary/10 px-1.5 py-0.5 font-medium uppercase text-primary">
              {getFileType(pdfFile)}
            </span>
            <span className="truncate">{pdfFile.name}</span>
            <span className="ml-auto shrink-0">
              {(pdfFile.size / 1024).toFixed(0)} KB
            </span>
          </div>
        )}
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
          For PDFs, the first page is used as the cover if none is provided.
          For other formats, a placeholder cover is auto-generated.
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
            Upload Document
          </>
        )}
      </Button>
    </form>
  );
}
