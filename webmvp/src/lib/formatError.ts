export function formatError(value: unknown): string {
  if (value instanceof Error) {
    return value.message;
  }

  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    if (
      "message" in value &&
      typeof (value as { message: unknown }).message === "string"
    ) {
      return (value as { message: string }).message;
    }

    if (typeof (value as Event).type === "string") {
      return `Unexpected browser event: ${(value as Event).type}`;
    }
  }

  return "Something went wrong";
}
