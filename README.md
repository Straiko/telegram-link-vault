# 🚀 Telegram Link Vault

An orchestrated, high-performance link aggregator and reading dashboard built with **Next.js 14 (App Router)**, **TypeScript**, **SQLite (WAL mode)**, and **Groq AI (Llama 3)**.

Incoming links from Telegram (channels, personal forwards, or group chats) are automatically extracted, stripped of tracking parameters, classified with AI into domain categories, and stored in a searchable, filterable reading dashboard.

---

## ✨ Features

- **Automated Telegram Webhook**: Forward links or add the bot to a channel to ingest links automatically.
- **AI Categorization (Groq Llama 3)**: High-speed classification into structured categories (`ai-models`, `dev-tools`, `articles`, `gaming`, `media`, `apps`, `telegram`, `social`, `utilities`) with auto-tagging and 1-sentence summaries.
- **Offline Heuristic Fallback**: Zero downtime or classification failure even without an API key or internet access.
- **Next.js App Router Architecture**:
  - React Server Components (RSC) by default with parallel `Promise.all` fetching.
  - Leaf-level client components for search and live category filters.
  - Type-safe Server Actions with union returns: `{ success: true, data: T } | { success: false, error: string }`.
  - Pure CSS Modules & `:root` design tokens (no Tailwind CSS).
  - Strict TypeScript (`strict: true`) with Zod boundary validation.
- **Fast Seeding**: Pre-loaded with 8,600+ curated links from Telegram "Бэкдор".

---

## 🛠 Getting Started

### 1. Installation

```bash
git clone git@github.com:Straiko/telegram-link-vault.git
cd telegram-link-vault
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Add your credentials:
```env
GROQ_API_KEY=gsk_...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_WEBHOOK_SECRET=...
```

### 3. Seed Database (Optional)

To seed with the 8,600 links:

```bash
npm run seed
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📡 Webhook Setup (Telegram to Site)

Set your Telegram bot webhook to your deployed endpoint:

```bash
curl -F "url=https://your-domain.com/api/telegram/webhook" \
     -F "secret_token=your_secure_random_webhook_secret_here" \
     https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
```

---

## 🛡 Standards

Follows the [Anthropic Review Stack](REVIEW.md) and strict Next.js App Router architectural principles.
