"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useUserId } from "@/lib/use-user-id";
import { DogRegistrationForm } from "@/components/dog/dog-registration-form";

export default function RegisterPage() {
  const router = useRouter();
  const userId = useUserId();

  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100/30 to-orange-50
                      flex items-center justify-center">
        <div className="text-orange-600">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100/30 to-orange-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-orange-50/80 backdrop-blur-md border-b border-orange-100/50">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Link
            href="/"
            className="p-2 rounded-xl hover:bg-orange-100/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-orange-700" />
          </Link>
          <h1 className="text-xl font-bold text-orange-900">반려견 등록</h1>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12">
        <DogRegistrationForm
          userId={userId}
          onSuccess={() => router.push("/")}
        />
      </main>
    </div>
  );
}
