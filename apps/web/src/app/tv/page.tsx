"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DefaultTvPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
