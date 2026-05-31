import { Suspense } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SetupNotice } from "@/components/SetupNotice";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="relative min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/">
          <Logo />
        </Link>
      </header>

      {isSupabaseConfigured ? (
        <div className="mx-auto flex max-w-md flex-col px-6 py-10">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      ) : (
        <SetupNotice />
      )}
    </main>
  );
}
