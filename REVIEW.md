# Telegram Link Vault: Code Review Guidelines (REVIEW.md)

> Project-specific code review criteria for `telegram-link-vault`.
> Complies with the Anthropic Review Stack and Next.js App Router Senior Architecture Standards.

---

## 1. What Failure Looks Like

Reviewers must prioritize detecting critical architecture and domain failures:

- **Type Safety**: Any implicit or explicit `any`, missing return type annotations on exported functions or Server Actions.
- **RSC Architecture**: Placing `'use client'` at root/branch levels instead of strictly leaf-level.
- **Data Fetching**: Unhandled waterfalls, client-side fetching where RSC is expected, lack of Zod boundary validation.
- **Styling**: Direct Tailwind usage or inline styles when not dynamically calculated; missing `:root` design token usage.
- **Security**: Missing webhook secret validation, unescaped queries, injection risks.

---

## 2. Reviewer Guardrails & Evidence Requirements

1. **Concrete Evidence Required**:
   - Every finding MUST cite an exact file and line number (`path/to/file:line`) and quote the code hunk.
2. **Cap on Nits**:
   - Maximum **3 minor nits** per review pass. Focus only on impactful improvements.
3. **Paths to Skip**:
   - `.next/`, `node_modules/`, `data/vault.db`, `package-lock.json`.
4. **Summary Format**:
   - Reviews MUST begin with `[Critical: N, Important: N, Nit: N, Pre-existing: N]`.

---

## 3. Severity Classification

- **`[Critical]` / `[Important]`**: Real bugs, security vulnerabilities, regression risks, broken navigation, missing validation. **Blocks PR merge.**
- **`[Nit]`**: Non-blocking minor improvements (naming clarity, minor simplification). Capped to ≤ 3.
- **`[Pre-existing]`**: Technical debt or issues in untouched code adjacent to the diff.

---

## 4. Risk Tiers for Human Approval

| Tier | Change Type | Approval Requirement |
| :--- | :--- | :--- |
| **Low** | Docs, README, static copy | Automated checks + AI review passing |
| **Medium** | UI components, CSS modules, filter logic | **1 human approval** |
| **High** | Telegram Webhook, AI classification, DB schema, deployment | **2 human approvals** |

---

## 5. Convergence & Rollback

- Re-reviews are strictly **diff-only**.
- Review cycles are capped at **3 rounds maximum**.
- Rollback plan: 1-step `git revert <commit-sha>`.
