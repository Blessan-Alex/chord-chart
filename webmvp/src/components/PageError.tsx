import { formatError } from "@/lib/formatError";

type PageErrorProps = {
  title: string;
  error: unknown;
};

export function PageError({ title, error }: PageErrorProps) {
  return (
    <p className="text-sm text-red-600 dark:text-red-400" role="alert">
      {title}: {formatError(error)}
    </p>
  );
}
