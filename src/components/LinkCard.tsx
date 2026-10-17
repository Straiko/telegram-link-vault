'use client';

import React, { useTransition } from 'react';
import styles from './LinkCard.module.css';
import { LinkItem } from '@/domain/link.types';
import { toggleReadAction, deleteLinkAction } from '@/actions/link.actions';

interface LinkCardProps {
  item: LinkItem;
}

export function LinkCard({ item }: LinkCardProps): React.JSX.Element {
  const [isPending, startTransition] = useTransition();

  const handleToggle = (): void => {
    startTransition(async () => {
      const res = await toggleReadAction(item.id);
      if (!res.success) {
        alert(`Error updating status: ${res.error}`);
      }
    });
  };

  const handleDelete = (): void => {
    if (!confirm('Are you sure you want to delete this link?')) {
      return;
    }
    startTransition(async () => {
      const res = await deleteLinkAction(item.id);
      if (!res.success) {
        alert(`Error deleting link: ${res.error}`);
      }
    });
  };

  const handleCopy = (): void => {
    navigator.clipboard.writeText(item.url);
  };

  const displayDate = item.originalDate ? item.originalDate.substring(0, 10) : '';

  return (
    <article className={`${styles.card} ${item.isRead ? styles.isRead : ''}`}>
      <div className={styles.checkboxContainer}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={item.isRead}
          disabled={isPending}
          onChange={handleToggle}
          title="Mark as read"
        />
      </div>

      <div className={styles.body}>
        <div className={styles.metaRow}>
          <span className={styles.categoryBadge}>{item.category}</span>
          {item.tags.map((tag) => (
            <span key={tag} className={styles.tagBadge}>
              #{tag}
            </span>
          ))}
          {displayDate && <span className={styles.dateText}>{displayDate}</span>}
        </div>

        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.linkUrl}
        >
          {item.url}
        </a>

        {item.snippet && <p className={styles.snippet}>{item.snippet}</p>}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={handleCopy}
          title="Copy link to clipboard"
        >
          📋 Copy
        </button>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`${styles.actionBtn} ${styles.primaryBtn}`}
        >
          ↗ Open
        </a>
        <button
          type="button"
          className={`${styles.actionBtn} ${styles.deleteBtn}`}
          onClick={handleDelete}
          title="Delete link"
        >
          🗑
        </button>
      </div>
    </article>
  );
}
