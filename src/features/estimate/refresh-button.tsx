"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";

export function RefreshButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button variant="ghost" size="icon" aria-label="Neu berechnen" title="Neu berechnen" onClick={() => start(() => router.refresh())}>
      <RefreshCw className={pending ? "size-4 animate-spin" : "size-4"} aria-hidden />
    </Button>
  );
}
