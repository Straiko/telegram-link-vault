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
        <h1 className={styles.title}>Telegram Link Vault</h1>
        <span className={styles.statusBadge}>
          <span className={styles.statusDot} /> Sync Active (@whackdoor)
        </span>
      </div>

      <div className={styles.statsArea}>
        <span>
          Total: <strong className={styles.statValue}>{stats.total.toLocaleString()}</strong>
        </span>
        <span>
          Read: <strong className={styles.statValueSuccess}>{stats.read.toLocaleString()}</strong>
        </span>
        <span>
          Progress: <strong className={styles.statValue}>{percentRead}%</strong>
          <span className={styles.progressTrack}>
            <span
              className={styles.progressFill}
              style={{ width: `${percentRead}%` }}
            />
          </span>
        </span>
      </div>
    </header>
  );
}
