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
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#35858E",
          colorBackground: "#FFFFFF",
          colorText: "#1C3B3F",
          colorTextSecondary: "#5A7678",
          colorInputBackground: "#F9FBEF",
          colorInputText: "#1C3B3F",
          borderRadius: "12px",
          fontFamily: "var(--font-sans)",
        },
        elements: {
          card: "border border-border/20 shadow-[var(--shadow-card)] backdrop-blur-glass bg-surface/90",
          navbar: "bg-surface/50 backdrop-blur-glass",
          footer: "bg-transparent",
          headerTitle: "font-heading text-2xl font-bold tracking-tight text-foreground",
          headerSubtitle: "text-muted-foreground",
          socialButtonsBlockButton: "border-border/40 hover:bg-muted/30 transition-all",
          formButtonPrimary: "bg-[image:var(--background-image-ai-gradient)] text-white shadow-[var(--shadow-ai-glow)] hover:scale-[1.02] transition-all",
          formFieldInput: "rounded-[12px] bg-background/50 border-border focus:bg-background h-11",
        },
      }}
    >
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
