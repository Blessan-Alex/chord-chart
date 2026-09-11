type PageLoadingProps = {
  message?: string;
};

export function PageLoading({ message = "Loading…" }: PageLoadingProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center p-4">
      <p className="text-neutral-400" role="status">{message}</p>
    </main>
  );
}
