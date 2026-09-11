import type { ServiceType, SessionStatus } from "@/lib/types";

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  friday: "Friday Night",
  sunday_morning: "Sunday Morning",
  sunday_evening: "Sunday Evening",
};

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  draft: "Draft",
  published: "Published",
};

export function formatServiceType(type: ServiceType): string {
  return SERVICE_TYPE_LABELS[type];
}
