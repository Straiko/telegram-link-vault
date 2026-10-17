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
        <div className={styles.iconBox}>⚡</div>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>
            Telegram Link Vault
            <span className={styles.badge}>
              <span className={styles.liveDot} /> Live Channel Sync
            </span>
          </h1>
          <p className={styles.subtitle}>
            Автоматический архив полезных ссылок и полных постов из Telegram (@whackdoor)
          </p>
        </div>
      </div>

      <div className={styles.statsCard}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Всего ссылок</span>
          <span className={styles.statValue}>{stats.total.toLocaleString()}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Прочитано</span>
          <span className={styles.statValueSuccess}>{stats.read.toLocaleString()}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Прогресс {percentRead}%</span>
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
