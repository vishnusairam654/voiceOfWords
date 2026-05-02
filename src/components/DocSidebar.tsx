"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  FileText,
  FilePlus,
  FileType2,
  FileCode,
  File,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

function getFileColor(fileType: string) {
  switch (fileType) {
    case "pdf":
      return "text-red-500";
    case "docx":
      return "text-blue-500";
    case "xml":
      return "text-orange-500";
    case "txt":
      return "text-gray-500";
    default:
      return "text-muted-foreground";
  }
}

export default function DocSidebar({ documents }: DocSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col border-r border-border bg-card/50">
      {/* Header */}
      <div className="border-b border-border p-4">
        <h2 className="font-heading text-sm font-semibold text-foreground">
          Documents
        </h2>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {documents.length} file{documents.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* File List */}
      <div className="scrollbar-thin flex-1 overflow-y-auto p-2">
        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <FileText className="size-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">No documents yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {documents.map((doc) => {
              const Icon = getFileIcon(doc.fileType);
              const isActive = pathname === `/books/${doc.slug}`;
              return (
                <button
                  key={doc._id}
                  type="button"
                  onClick={() => router.push(`/books/${doc.slug}`)}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition-all duration-150",
                    isActive
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted/50 border border-transparent"
                  )}
                >
                  <Icon
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      isActive ? "text-primary" : getFileColor(doc.fileType)
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate text-xs font-medium",
                        isActive ? "text-primary" : "text-foreground"
                      )}
                    >
                      {doc.title}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {doc.author}
                    </p>
                  </div>
                  <span className="mt-0.5 rounded-sm bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase text-muted-foreground">
                    {doc.fileType}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Button */}
      <div className="border-t border-border p-3">
        <Button
          onClick={() => router.push("/books/new")}
          className="w-full"
          size="sm"
        >
          <FilePlus className="size-3.5" data-icon="inline-start" />
          Upload Document
        </Button>
      </div>
    </div>
  );
}
