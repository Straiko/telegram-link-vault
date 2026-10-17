'use client';

import React, { useState, useTransition } from 'react';
import styles from './LinkCard.module.css';
import { LinkItem } from '@/domain/link.types';
import { toggleReadAction, deleteLinkAction } from '@/actions/link.actions';

interface LinkCardProps {
  item: LinkItem;
}

const LONG_TEXT_THRESHOLD = 280;

export function LinkCard({ item }: LinkCardProps): React.JSX.Element {
  const [isPending, startTransition] = useTransition();
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

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
    navigator.clipboard.writeText(item.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  let hostname = '';
  try {
    hostname = new URL(item.url).hostname.replace(/^www\./, '');
  } catch {
    hostname = '';
  }

  const displayDate = item.originalDate ? item.originalDate.substring(0, 10) : '';

  const fullText = item.snippet;
  const isLong = fullText.length > LONG_TEXT_THRESHOLD;
  const displayedContent = isLong && !isExpanded
    ? `${fullText.substring(0, LONG_TEXT_THRESHOLD)}...`
    : fullText;

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
          {hostname && <span className={styles.domainText}>{hostname}</span>}
          {displayDate && <span className={styles.dateText}>{displayDate}</span>}
        </div>

        {item.title && item.title !== item.url && (
          <h2 className={styles.postTitle}>{item.title}</h2>
        )}

        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.linkUrl}
        >
          {item.url}
        </a>

        {fullText && (
          <div className={styles.fullContent}>
            <span>{displayedContent}</span>
            {isLong && (
              <div>
                <button
                  type="button"
                  className={styles.expandBtn}
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? 'Collapse' : `Show full text (${fullText.length} chars)`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={handleCopy}
          title="Copy link to clipboard"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`${styles.actionBtn} ${styles.primaryBtn}`}
        >
          Open ↗
        </a>
        <button
          type="button"
          className={`${styles.actionBtn} ${styles.deleteBtn}`}
          onClick={handleDelete}
          title="Delete link"
        >
          Delete
        </button>
      </div>
    </article>
  );
}
