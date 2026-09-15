"use client";

import { AppShell } from "@/components/AppShell";
import { UsernameGate } from "@/components/UsernameGate";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UsernameGate>
      <AppShell>{children}</AppShell>
    </UsernameGate>
  );
}
