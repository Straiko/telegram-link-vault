'use client';

import React, { useState, useTransition } from 'react';
import styles from './CreatePostForm.module.css';
import { createPostAction } from '@/actions/link.actions';
import { Category } from '@/domain/link.types';

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'ai-models', label: '🤖 AI & Models' },
  { value: 'dev-tools', label: '💻 Dev & GitHub' },
  { value: 'articles', label: '📖 Articles & News' },
  { value: 'gaming', label: '🎮 Gaming & Steam' },
  { value: 'media', label: '🎬 Video & Streams' },
  { value: 'apps', label: '📱 Apps & Extensions' },
  { value: 'telegram', label: '💬 Telegram' },
  { value: 'social', label: '🌐 Social' },
  { value: 'utilities', label: '🛠 Tools & Web' }
];

export function CreatePostForm(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const formElement = e.currentTarget;

    startTransition(async () => {
      const result = await createPostAction(formData);
      if (result.success) {
        setSuccess(`Post published successfully! Categorized as #${result.data.category}`);
        formElement.reset();
        setTimeout(() => {
          setIsOpen(false);
          setSuccess(null);
        }, 2000);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className={styles.container}>
      {!isOpen ? (
        <button
          type="button"
          className={styles.toggleBtn}
          onClick={() => setIsOpen(true)}
        >
          <span>➕</span> New Post / Add Link
        </button>
      ) : (
        <div className={styles.formCard}>
          <div className={styles.formTitle}>
            <span>Publish New Post to Vault</span>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
          </div>

          {error && <div className={styles.errorBanner}>{error}</div>}
          {success && <div className={styles.successBanner}>{success}</div>}

          <form onSubmit={handleSubmit} className={styles.formGrid}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                Link URL <span style={{ color: 'var(--danger-color)' }}>*</span>
              </label>
              <input
                type="url"
                name="url"
                required
                placeholder="https://example.com/article"
                className={styles.input}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                Title <span className={styles.labelDesc}>(Optional, AI will generate from content if left blank)</span>
              </label>
              <input
                type="text"
                name="title"
                placeholder="Post headline or guide title"
                className={styles.input}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                Full Post Content <span className={styles.labelDesc}>(Unabbreviated message text, steps, or notes)</span>
              </label>
              <textarea
                name="content"
                rows={5}
                placeholder="Paste the full Telegram message or article text here..."
                className={styles.textarea}
              />
            </div>

            <div className={styles.row}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>
                  Category <span className={styles.labelDesc}>(Optional, AI auto-detects)</span>
                </label>
                <select name="category" defaultValue="" className={styles.select}>
                  <option value="">🤖 Auto-classify with Groq AI</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>
                  Tags <span className={styles.labelDesc}>(Optional, comma-separated)</span>
                </label>
                <input
                  type="text"
                  name="tags"
                  placeholder="ai, python, tutorial"
                  className={styles.input}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className={styles.submitBtn}
            >
              {isPending ? '🤖 Publishing & AI Classifying...' : '🚀 Publish Post'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
