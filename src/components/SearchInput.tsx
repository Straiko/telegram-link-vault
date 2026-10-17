'use client';

import React, { useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './SearchInput.module.css';

export function SearchInput(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentQuery = searchParams.get('q') || '';

  const handleSearch = (term: string): void => {
    const params = new URLSearchParams(searchParams.toString());
    if (term.trim()) {
      params.set('q', term.trim());
    } else {
      params.delete('q');
    }
    params.set('page', '1');

    startTransition(() => {
      router.replace(`/?${params.toString()}`);
    });
  };

  return (
    <div className={styles.searchWrapper}>
      <span className={styles.searchIcon}>🔍</span>
      <input
        type="text"
        className={styles.searchInput}
        placeholder={isPending ? 'Searching...' : 'Search links by keyword, domain, or snippet...'}
        defaultValue={currentQuery}
        onChange={(e) => handleSearch(e.target.value)}
      />
    </div>
  );
}
