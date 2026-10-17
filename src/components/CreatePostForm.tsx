'use client';

import React, { useState, useTransition } from 'react';
import styles from './CreatePostForm.module.css';
import { createPostAction } from '@/actions/link.actions';
import { Category } from '@/domain/link.types';

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'ai-models', label: 'AI & Models' },
  { value: 'dev-tools', label: 'Dev & GitHub' },
  { value: 'articles', label: 'Articles & News' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'media', label: 'Media & Video' },
  { value: 'apps', label: 'Apps & Extensions' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'social', label: 'Social' },
  { value: 'utilities', label: 'Utilities & Web' }
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
        setSuccess(`Link added successfully to category: ${result.data.category}`);
        formElement.reset();
        setTimeout(() => {
          setIsOpen(false);
          setSuccess(null);
        }, 1800);
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
          + Add Link / Post
        </button>
      ) : (
        <div className={styles.formCard}>
          <div className={styles.formTitle}>
            <span>Add New Link or Post</span>
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
                URL <span style={{ color: 'var(--danger-color)' }}>*</span>
              </label>
              <input
                type="url"
                name="url"
                required
                placeholder="https://example.com"
                className={styles.input}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                Title <span className={styles.labelDesc}>(Optional, generated automatically if left blank)</span>
              </label>
              <input
                type="text"
                name="title"
                placeholder="Title or headline"
                className={styles.input}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                Full Post Content <span className={styles.labelDesc}>(Unabbreviated message or guide text)</span>
              </label>
              <textarea
                name="content"
                rows={4}
                placeholder="Paste the full Telegram message or article content..."
                className={styles.textarea}
              />
            </div>

            <div className={styles.row}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>
                  Category <span className={styles.labelDesc}>(Optional)</span>
                </label>
                <select name="category" defaultValue="" className={styles.select}>
                  <option value="">Auto-classify</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>
                  Tags <span className={styles.labelDesc}>(Comma-separated)</span>
                </label>
                <input
                  type="text"
                  name="tags"
                  placeholder="ai, dev, python"
                  className={styles.input}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className={styles.submitBtn}
            >
              {isPending ? 'Publishing...' : 'Add Link'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
