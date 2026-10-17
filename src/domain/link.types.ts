export type Category =
  | 'ai-models'
  | 'dev-tools'
  | 'articles'
  | 'gaming'
  | 'media'
  | 'apps'
  | 'telegram'
  | 'social'
  | 'utilities';

export interface LinkItem {
  id: number;
  url: string;
  title: string;
  snippet: string;
  category: Category;
  tags: string[];
  isRead: boolean;
  originalDate: string;
  createdAt: string;
}

export interface LinkCreateInput {
  url: string;
  title: string;
  snippet: string;
  category?: Category;
  tags?: string[];
  originalDate?: string;
}

export interface CategoryCount {
  category: Category;
  count: number;
}

export interface VaultStats {
  total: number;
  read: number;
  unread: number;
}

export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };
