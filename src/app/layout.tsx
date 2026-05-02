import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import Navbar from "@/components/Navbar";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "Voice Of Words — AI Voice Book Companion",
  description:
    "Upload your books and have natural voice conversations about them with AI. Powered by ElevenLabs voices and intelligent RAG search.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={cn("light", inter.variable, playfair.variable)} data-theme="light">
        <body className="min-h-screen bg-background font-sans text-foreground antialiased">
          <Navbar />
          <main className="pt-16">{children}</main>
          <Toaster
            position="bottom-right"
            richColors
            toastOptions={{
              style: {
                fontFamily: "var(--font-sans)",
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
