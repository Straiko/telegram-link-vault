'use client';

import React, { useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './FilterBar.module.css';
import { Category, CategoryCount } from '@/domain/link.types';

interface FilterBarProps {
  categoryCounts: CategoryCount[];
  totalCount: number;
}

const CATEGORY_NAMES: Record<Category, string> = {
  'ai-models': 'AI Models',
  'dev-tools': 'Dev Tools',
  'articles': 'Articles',
  'gaming': 'Gaming',
  'media': 'Media',
  'apps': 'Apps',
  'telegram': 'Telegram',
  'social': 'Social',
  'utilities': 'Utilities'
};

export function FilterBar({ categoryCounts, totalCount }: FilterBarProps): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const selectedCategory = searchParams.get('category') || 'all';
  const selectedStatus = searchParams.get('status') || 'all';

  const setFilter = (key: string, value: string): void => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.set('page', '1');

    startTransition(() => {
      router.replace(`/?${params.toString()}`);
    });
  };

  return (
    <div className={styles.filterSection}>
      <nav className={styles.categoryTabs}>
        <button
          type="button"
          className={`${styles.tabButton} ${selectedCategory === 'all' ? styles.activeTab : ''}`}
          onClick={() => setFilter('category', 'all')}
        >
          All <span className={styles.tabCount}>({totalCount.toLocaleString()})</span>
        </button>

        {categoryCounts.map((cat) => {
          const isActive = selectedCategory === cat.category;
          const label = CATEGORY_NAMES[cat.category] || cat.category;
          return (
            <button
              key={cat.category}
              type="button"
              className={`${styles.tabButton} ${isActive ? styles.activeTab : ''}`}
              onClick={() => setFilter('category', cat.category)}
            >
              {label} <span className={styles.tabCount}>({cat.count.toLocaleString()})</span>
            </button>
          );
        })}
      </nav>

      <div className={styles.subBar}>
        <div className={styles.segmentedStatus}>
          {(['all', 'unread', 'read'] as const).map((status) => (
            <button
              key={status}
              type="button"
              className={`${styles.statusButton} ${selectedStatus === status ? styles.activeStatus : ''}`}
              onClick={() => setFilter('status', status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
