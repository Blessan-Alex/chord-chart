"use client";

import { userInitials } from "@/lib/userDisplay";

type DemoAccount = {
  name: string;
  email: string;
  password: string;
  role: "user" | "admin";
};

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    name: "Morgan Phillips",
    email: "user@worship.org",
    password: "demo1234",
    role: "user",
  },
  {
    name: "Alex Rivera",
    email: "admin@worship.org",
    password: "demo1234",
    role: "admin",
  },
];

type DemoAccountsProps = {
  onSelect: (email: string, password: string) => void;
};

export function DemoAccounts({ onSelect }: DemoAccountsProps) {
  return (
    <section className="w-full rounded-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-elevated p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-lf-text-tertiary">
        Demo accounts
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {DEMO_ACCOUNTS.map((account) => (
          <li key={account.email}>
            <button
              type="button"
              onClick={() => onSelect(account.email, account.password)}
              className="flex w-full items-center gap-3 rounded-[var(--lf-radius-md)] p-2 text-left transition-colors hover:bg-lf-bg-muted"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  account.role === "admin"
                    ? "bg-lf-brand-soft text-lf-brand"
                    : "bg-lf-bg-muted text-lf-text-secondary"
                }`}
              >
                {userInitials(account.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-lf-text-primary">
                  {account.name}
                </p>
                <p className="truncate text-xs text-lf-text-secondary">
                  {account.email}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                  account.role === "admin"
                    ? "bg-lf-brand-soft text-lf-brand"
                    : "bg-lf-bg-muted text-lf-text-secondary"
                }`}
              >
                {account.role}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
