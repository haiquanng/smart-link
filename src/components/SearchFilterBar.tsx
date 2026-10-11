import { FilterChip } from '@/components/FilterChip';
import { vi } from '@/i18n/vi';
import { sourceSchema, type Source } from '@/lib/ingestPayload';
import { TIME_RANGES, type SearchFilters } from '@/lib/searchParams';
import type { TagCount } from '@/lib/api';

// "other" is a catch-all with no useful meaning as a filter.
const SOURCE_CHOICES = sourceSchema.options.filter(
  (s): s is Exclude<Source, 'other'> => s !== 'other',
);

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

interface SearchFilterBarProps {
  filters: SearchFilters;
  tags: TagCount[];
  onChange: (filters: SearchFilters) => void;
}

/** One horizontally scrollable row: sources, time (cycles), then top tags. */
export function SearchFilterBar({ filters, tags, onChange }: SearchFilterBarProps) {
  const nextRange = TIME_RANGES[(TIME_RANGES.indexOf(filters.range) + 1) % TIME_RANGES.length];

  return (
    <div
      role="group"
      aria-label={vi.search.filtersLabel}
      className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0"
    >
      {SOURCE_CHOICES.map((source) => (
        <FilterChip
          key={source}
          active={filters.sources.includes(source)}
          onClick={() => onChange({ ...filters, sources: toggle(filters.sources, source) })}
        >
          {vi.sources[source]}
        </FilterChip>
      ))}
      <FilterChip
        active={filters.range !== 'all'}
        onClick={() => onChange({ ...filters, range: nextRange })}
      >
        {vi.search.timeLabel}: {vi.search.ranges[filters.range]}
      </FilterChip>
      {tags.map((tag) => (
        <FilterChip
          key={tag.name}
          active={filters.tags.includes(tag.name)}
          onClick={() => onChange({ ...filters, tags: toggle(filters.tags, tag.name) })}
        >
          #{tag.name}
        </FilterChip>
      ))}
    </div>
  );
}
