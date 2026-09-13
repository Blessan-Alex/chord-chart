export default function GroupsPage() {
  const exampleMembers = ["@alexrivera", "@morganp", "@jamie_k"];

  return (
    <div className="mx-auto w-full max-w-2xl p-4 sm:p-8">
      <h1 className="text-2xl font-semibold text-lf-text-primary">Groups</h1>
      <p className="mt-2 text-sm text-lf-text-secondary">
        Band groups and shared playlists are coming in Phase G. Use Playlists for
        now.
      </p>

      <section className="mt-8 rounded-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-elevated p-4">
        <h2 className="text-sm font-semibold text-lf-text-primary">Members</h2>
        <p className="mt-1 text-sm text-lf-text-secondary">
          Member lists will show @usernames instead of user IDs.
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {exampleMembers.map((handle) => (
            <li
              key={handle}
              className="rounded-full bg-lf-bg-muted px-3 py-1 text-sm text-lf-text-secondary"
            >
              {handle}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
