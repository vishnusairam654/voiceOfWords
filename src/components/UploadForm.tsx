"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { upload } from "@vercel/blob/client";
import { Loader2, UploadCloud, FileText, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createBook } from "@/lib/actions/books";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/xml",
  "application/xml",
];

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
});

type UploadFormData = z.infer<typeof uploadSchema>;

async function extractText(file: File): Promise<{
  text: string;
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
    return { text: fullText.trim(), fileType: "pdf" };
  }

  if (fileType === "docx") {
    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return { text: result.value.trim(), fileType: "docx" };
  }

  if (fileType === "txt" || fileType === "xml") {
    const text = await file.text();
    return { text: text.trim(), fileType };
  }

  throw new Error(`Unsupported file type: ${fileType}`);
}

export default function UploadForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [step, setStep] = useState<"upload" | "details">("upload");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      title: "",
      author: "Unknown Author",
    },
  });

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (selectedFile: File) => {
    const fileType = getFileType(selectedFile);
    if (!ACCEPTED_TYPES.includes(selectedFile.type) && fileType === "unknown") {
      toast.error("Unsupported file format. Please upload PDF, DOCX, TXT, or XML.");
      return;
    }
    setFile(selectedFile);
    // Auto-fill title from filename
    setValue("title", selectedFile.name.replace(/\.[^/.]+$/, ""));
    setStep("details");
  };

  const onSubmit = async (data: UploadFormData) => {
    if (!file) return;
    setLoading(true);
    try {
      setProgress("Analyzing document...");
      const { text, fileType } = await extractText(file);

      if (!text || text.trim().length < 50) {
        toast.error("Could not extract text. Try a different file.");
        setLoading(false);
        return;
      }

      setProgress("Uploading to cloud...");
      const uniquePrefix = `${Date.now()}-`;
      const docBlob = await upload(uniquePrefix + file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });

      // Generate a generic cover
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 560;
      const ctx = canvas.getContext("2d")!;
      
      // Modern gradient background
      const gradient = ctx.createLinearGradient(0, 0, 400, 560);
      gradient.addColorStop(0, "#0f172a");
      gradient.addColorStop(1, "#1e293b");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 400, 560);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      const titleLines = data.title.match(/.{1,20}/g) || [data.title];
      titleLines.forEach((line, i) => ctx.fillText(line, 200, 240 + i * 36));

      ctx.font = "16px sans-serif";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText(data.author, 200, 360);

      const placeholderURL = canvas.toDataURL("image/png");
      const response = await fetch(placeholderURL);
      const blob = await response.blob();
      const coverBlob = await upload(`${uniquePrefix}cover.png`, blob, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });

      setProgress("Building AI models...");
      // Default persona to generic 'Rachel' or any ID since voice is secondary now
      const result = await createBook({
        title: data.title,
        author: data.author,
        fileURL: docBlob.url,
        fileBlobKey: docBlob.pathname,
        coverURL: coverBlob.url,
        coverBlobKey: coverBlob.pathname,
        persona: "21m00Tcm4TlvDq8ikWAM", // Default ElevenLabs voice ID
        fullText: text,
        fileType,
      });

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success("Document ready!");
      router.push(`/books/${result.slug}`);
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Upload failed. Please try again.");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl">
      <AnimatePresence mode="wait">
        {step === "upload" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="flex flex-col items-center justify-center text-center"
          >
            <div className="mb-8 space-y-2">
              <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground">
                Drop your document
              </h1>
              <p className="text-muted-foreground">
                PDF, DOCX, TXT, or XML up to 50MB
              </p>
            </div>

            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={cn(
                "relative flex h-72 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[24px] border border-border bg-surface/50 transition-all duration-300 backdrop-blur-glass",
                isDragging
                  ? "border-primary/50 scale-[1.02] shadow-[var(--shadow-ai-glow)]"
                  : "hover:border-primary/30 hover:shadow-[var(--shadow-card)]"
              )}
            >
              <input
                type="file"
                className="absolute inset-0 z-50 cursor-pointer opacity-0"
                accept=".pdf,.docx,.txt,.xml,application/pdf,text/plain,text/xml"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />

              <div className="pointer-events-none relative z-10 flex flex-col items-center gap-4">
                <motion.div
                  animate={
                    isDragging
                      ? { y: -10, scale: 1.1 }
                      : { y: 0, scale: 1 }
                  }
                  className="flex size-20 items-center justify-center rounded-2xl bg-primary/10 shadow-inner"
                >
                  <UploadCloud className="size-10 text-primary" />
                </motion.div>
                <div className="space-y-1">
                  <p className="text-lg font-medium text-foreground">
                    {isDragging ? "Drop it here!" : "Click or drag file"}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === "details" && file && (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-[24px] border border-border bg-surface/50 p-8 backdrop-blur-glass shadow-[var(--shadow-card)]"
          >
            <div className="mb-6 flex items-center gap-4 rounded-[12px] bg-background/50 p-4 border border-border">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText className="size-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  {(file.size / 1024 / 1024).toFixed(2)} MB • {getFileType(file)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep("upload")}
                disabled={loading}
                className="text-xs"
              >
                Change
              </Button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-[11px] font-bold uppercase tracking-[0.05em] text-textMuted">Document Title</Label>
                <Input
                  id="title"
                  {...register("title")}
                  className="rounded-[12px] bg-background/30 border-border focus:bg-background h-12 text-base text-textMain"
                />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="author" className="text-[11px] font-bold uppercase tracking-[0.05em] text-textMuted">Author / Source</Label>
                <Input
                  id="author"
                  {...register("author")}
                  className="rounded-[12px] bg-background/30 border-border focus:bg-background h-12 text-base text-textMain"
                />
                {errors.author && <p className="text-xs text-destructive">{errors.author.message}</p>}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="group relative w-full overflow-hidden rounded-[12px] h-14 text-base font-semibold text-white shadow-[var(--shadow-ai-glow)] hover:scale-[1.02] transition-all"
              >
                <div className="absolute inset-0 bg-[image:var(--background-image-ai-gradient)]" />
                <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity group-hover:opacity-100" />
                {loading ? (
                  <div className="relative z-10 flex items-center justify-center gap-2">
                    <Loader2 className="size-5 animate-spin" />
                    <span>{progress}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>Process Document</span>
                    <ChevronRight className="size-5 transition-transform group-hover:translate-x-1" />
                  </div>
                )}
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
