import React from 'react';
import styles from './StatsHeader.module.css';
import { VaultStats } from '@/domain/link.types';

interface StatsHeaderProps {
  stats: VaultStats;
}

export function StatsHeader({ stats }: StatsHeaderProps): React.JSX.Element {
  const percentRead = stats.total > 0 ? ((stats.read / stats.total) * 100).toFixed(1) : '0';

  return (
    <header className={styles.header}>
      <div className={styles.titleArea}>
        <h1 className={styles.title}>Telegram Vault</h1>
        <span className={styles.badge}>Live Sync</span>
      </div>

      <div className={styles.statsCard}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Total Links</span>
          <span className={styles.statValue}>{stats.total.toLocaleString()}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Read</span>
          <span className={styles.statValueSuccess}>{stats.read.toLocaleString()}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Progress</span>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${percentRead}%` }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
