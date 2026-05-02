"use client";

import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  FileText,
  FilePlus,
  FileType2,
  FileCode,
  File,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DocItem {
  _id: string;
  title: string;
  author: string;
  slug: string;
  fileType: string;
  createdAt: string;
}

interface DocSidebarProps {
  documents: DocItem[];
}

function getFileIcon(fileType: string) {
  switch (fileType) {
    case "pdf":
      return FileText;
    case "docx":
      return FileType2;
    case "xml":
      return FileCode;
    case "txt":
      return File;
    default:
      return FileText;
  }
}

export default function DocSidebar({ documents }: DocSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <motion.div
      initial={{ width: 80 }}
      whileHover={{ width: 280 }}
      transition={{ type: "spring", bounce: 0, duration: 0.3 }}
      className="group relative flex h-full flex-col overflow-hidden border-r border-border/50 bg-card/40 backdrop-blur-md shadow-[4px_0_24px_rgba(0,0,0,0.02)]"
    >
      {/* Header */}
      <div className="flex h-16 shrink-0 items-center border-b border-border/40 px-6">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <FileText className="size-4" />
        </div>
        <motion.div
          className="ml-4 flex flex-col whitespace-nowrap opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        >
          <span className="font-heading text-sm font-bold tracking-wide text-foreground">
            Documents
          </span>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {documents.length} File{documents.length !== 1 ? "s" : ""}
          </span>
        </motion.div>
      </div>

      {/* File List */}
      <div className="scrollbar-none flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-2">
        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
            <div className="rounded-full bg-muted/50 p-3">
              <FileText className="size-5 text-muted-foreground/50" />
            </div>
            <p className="whitespace-nowrap text-xs text-muted-foreground">No documents</p>
          </div>
        ) : (
          documents.map((doc) => {
            const Icon = getFileIcon(doc.fileType);
            const isActive = pathname === `/books/${doc.slug}`;
            return (
              <button
                key={doc._id}
                type="button"
                onClick={() => router.push(`/books/${doc.slug}`)}
                className={cn(
                  "relative flex w-full items-center rounded-xl p-2.5 transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeDocIndicator"
                    className="absolute inset-0 rounded-xl border border-primary/20 bg-primary/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                
                <div className="relative z-10 flex shrink-0 items-center justify-center pl-1">
                  <Icon className="size-5" />
                </div>
                
                <div className="relative z-10 ml-4 flex flex-1 flex-col items-start overflow-hidden whitespace-nowrap opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <p className={cn("truncate text-sm font-medium", isActive ? "text-primary font-bold" : "text-foreground")}>
                    {doc.title}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground/70">
                    {doc.author}
                  </p>
                </div>
                
                <div className="relative z-10 ml-auto opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <span className={cn(
                    "rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                    isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    {doc.fileType}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Upload Button */}
      <div className="shrink-0 border-t border-border/40 p-4">
        <button
          onClick={() => router.push("/books/new")}
          className="group/btn relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] hover:shadow-primary/40 active:scale-95"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] transition-transform duration-700 group-hover/btn:translate-x-[100%]" />
          <FilePlus className="size-4 shrink-0" />
          <span className="whitespace-nowrap opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            Upload Document
          </span>
        </button>
      </div>
    </motion.div>
  );
}
