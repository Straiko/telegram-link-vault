'use client';

import React, { useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './Pagination.module.css';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems
}: PaginationProps): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  if (totalPages <= 1) {
    return <></>;
  }

  const navigateToPage = (page: number): void => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    startTransition(() => {
      router.replace(`/?${params.toString()}`);
    });
  };

  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <button
        type="button"
        className={styles.pageBtn}
        disabled={currentPage <= 1}
        onClick={() => navigateToPage(currentPage - 1)}
      >
        ← Previous
      </button>

      <span className={styles.pageInfo}>
        Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalItems.toLocaleString()} total)
      </span>

      <button
        type="button"
        className={styles.pageBtn}
        disabled={currentPage >= totalPages}
        onClick={() => navigateToPage(currentPage + 1)}
      >
        Next →
      </button>
    </nav>
  );
}
