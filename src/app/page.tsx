import React from 'react';
import { LinkRepository } from '@/data/link.repository';
import { LinkQuerySchema } from '@/domain/link.schema';
import { StatsHeader } from '@/components/StatsHeader';
import { SearchInput } from '@/components/SearchInput';
import { FilterBar } from '@/components/FilterBar';
import { LinkCard } from '@/components/LinkCard';
import { Pagination } from '@/components/Pagination';
import { Category } from '@/domain/link.types';

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export const dynamic = 'force-dynamic';

export default async function HomePage({ searchParams }: PageProps): Promise<React.JSX.Element> {
  const queryParam = typeof searchParams.q === 'string' ? searchParams.q : '';
  const categoryParam = typeof searchParams.category === 'string' ? searchParams.category : undefined;
  const statusParam = typeof searchParams.status === 'string' ? searchParams.status : 'all';
  const pageParam = typeof searchParams.page === 'string' ? parseInt(searchParams.page, 10) : 1;

  const validQuery = LinkQuerySchema.parse({
    query: queryParam,
    category: categoryParam as Category | undefined,
    readStatus: statusParam,
    page: isNaN(pageParam) ? 1 : pageParam,
    limit: 50
  });

  const limit = validQuery.limit;
  const page = validQuery.page;
  const offset = (page - 1) * limit;

  // Execute queries in parallel using Promise.all to prevent waterfalls
  const [links, totalMatching, stats, categoryCounts] = await Promise.all([
    LinkRepository.findAll({
      category: validQuery.category,
      readStatus: validQuery.readStatus,
      query: validQuery.query,
      limit,
      offset
    }),
    LinkRepository.countAll({
      category: validQuery.category,
      readStatus: validQuery.readStatus,
      query: validQuery.query
    }),
    LinkRepository.getStats(),
    LinkRepository.getCategoryCounts()
  ]);

  const totalPages = Math.ceil(totalMatching / limit);

  return (
    <div>
      <StatsHeader stats={stats} />
      <SearchInput />
      <FilterBar categoryCounts={categoryCounts} totalCount={stats.total} />

      <section aria-label="Links collection">
        {links.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '18px', marginBottom: '8px' }}>No links found matching your criteria.</p>
            <p style={{ fontSize: '14px' }}>Try adjusting your search or category filter.</p>
          </div>
        ) : (
          links.map((link) => <LinkCard key={link.id} item={link} />)
        )}
      </section>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={totalMatching}
      />
    </div>
  );
}
