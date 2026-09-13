# Phase B — Auth, Login UI & Username System

**Prerequisite:** Phase A (shell)  
**Outcome:** Login matches mockup; every user has unique `@username`; profile page shows it.

---

## Tickets

### B-01 — Login page UI
**Files:** `webmvp/src/app/login/page.tsx`, `webmvp/src/components/LoginForm.tsx`  
**Do:** Match `login.png`: cream bg, logo, email/password, black Sign in, rounded inputs.  
**Accept:** Visual match at 390px and 1280px; Firebase sign-in still works.

### B-02 — Sign up flow with username
**Files:** `webmvp/src/app/signup/page.tsx`, `webmvp/src/components/SignupForm.tsx`  
**Do:** Fields: display name, username, email, password. Validate username regex.  
**Accept:** Cannot submit invalid username; shows inline error.

### B-03 — Username uniqueness check
**Files:** `webmvp/src/lib/firestore/users.ts`  
**Do:** `isUsernameAvailable(lower)` query on `users` where `usernameLower==`.  
**Accept:** Duplicate username rejected before create.

### B-04 — Create user profile on signup
**Files:** `webmvp/src/lib/hooks/useAuth.ts`, `users.ts`  
**Do:** On first auth, write `users/{uid}` with all fields from data model doc.  
**Accept:** Firestore shows profile after signup.

### B-05 — Username in AppShell footer
**Files:** `AppShell.tsx`  
**Do:** Show displayName + role; avatar initials from name.  
**Accept:** Matches mockup bottom-left profile block.

### B-06 — Profile page
**Files:** `webmvp/src/app/profile/page.tsx`  
**Do:** Show @username, email, display name edit, theme toggle (from A-07).  
**Accept:** User can update displayName only (not username v1).

### B-07 — Types update
**Files:** `webmvp/src/lib/types.ts`, `validation.ts`  
**Do:** Add `UserProfile` type; validation for username.  
**Accept:** `npm run test` passes.

### B-08 — Firestore rules: user create/update
**Files:** `firestore.rules`  
**Do:** Allow create with username fields; prevent role escalation.  
**Accept:** Rules test: musician cannot set role admin.

### B-09 — Show @username in playlist/group member lists (stub)
**Files:** Placeholder in group/playlist components  
**Do:** Use `ownerUsername` when available.  
**Accept:** No uid shown in UI.

### B-10 — Remove production demo accounts
**Files:** `login/page.tsx`  
**Do:** Demo list only if `process.env.NEXT_PUBLIC_DEMO_LOGIN === 'true'`.  
**Accept:** Production build has no demo block.

---

## Phase B acceptance

- [ ] New user picks unique @username
- [ ] Login UI matches mockup
- [ ] Profile shows @username everywhere in shell
