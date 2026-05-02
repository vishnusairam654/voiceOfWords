import Link from "next/link";
import { Show, UserButton, SignInButton } from "@clerk/nextjs";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-surface/80 backdrop-blur-glass">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="font-heading text-2xl font-bold tracking-tight text-primary transition-colors hover:text-accent"
        >
          Voice Of Words
        </Link>

        <div className="flex items-center gap-3">
          <Show when="signed-in">
            <Link href="/books/new">
              <Button variant="outline" size="sm">
                <Plus className="size-4" data-icon="inline-start" />
                Upload Book
              </Button>
            </Link>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "size-9",
                },
              }}
            />
          </Show>

          <Show when="signed-out">
            <SignInButton mode="modal">
              <Button size="sm">Sign In</Button>
            </SignInButton>
          </Show>
        </div>
      </div>
    </nav>
  );
}
