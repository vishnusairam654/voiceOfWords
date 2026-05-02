import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-[image:var(--background-image-ai-gradient)]/10 bg-background px-4 py-12 sm:px-6 lg:px-8">
            <div className="absolute inset-0 bg-[image:var(--background-image-glass)] opacity-50" />
            <div className="relative z-10 w-full max-w-md">
                <SignUp />
            </div>
        </div>
    );
}
