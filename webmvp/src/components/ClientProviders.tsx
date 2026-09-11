"use client";

import { AuthProvider } from "@/components/AuthProvider";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ServiceWorkerRegistrar />
      <OfflineBanner />
      {children}
    </AuthProvider>
  );
}
