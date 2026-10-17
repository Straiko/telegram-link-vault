'use client';

import React, { useTransition, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './SearchInput.module.css';

export function SearchInput(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={styles.searchWrapper}>
      <span className={styles.searchIcon}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </span>
      <input
        ref={inputRef}
        type="text"
        className={styles.searchInput}
        placeholder={isPending ? 'Searching...' : 'Search links by keyword, title, domain, or snippet...'}
        defaultValue={currentQuery}
        onChange={(e) => handleSearch(e.target.value)}
      />
      <span className={styles.kbd}>/</span>
    </div>
  );
}
