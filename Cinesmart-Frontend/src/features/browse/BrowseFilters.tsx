import type { UseQueryResult } from '@tanstack/react-query';
import { useId, type RefObject } from 'react';
import type { BrowseFilters as Filters } from '@/api/discovery';
import type { NamedRef } from '@/api/types';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { yearOptions, type FilterName } from './browse-params';

/** Radix Select items can't have an empty value. */
const ANY = 'any';

export type FilterTriggerRefs = Record<
  'genre' | 'language' | 'year',
  RefObject<HTMLButtonElement | null>
>;

interface BrowseFiltersProps {
  filters: Filters;
  genres: UseQueryResult<NamedRef[]>;
  languages: UseQueryResult<NamedRef[]>;
  onChange: (name: FilterName, value: number | undefined) => void;
  triggerRefs: FilterTriggerRefs;
  /** `row` in the page's filter bar, `stack` in the mobile sheet. */
  layout: 'row' | 'stack';
}

/** Genre, language and year selects ([ROUTES-4]). Disabled while their list loads. */
export function BrowseFilters({
  filters,
  genres,
  languages,
  onChange,
  triggerRefs,
  layout,
}: BrowseFiltersProps) {
  const years = yearOptions();
  // A valid year outside the options (the API accepts 1888–2100) stays selectable.
  if (filters.year !== undefined && !years.includes(filters.year)) {
    years.push(filters.year);
    years.sort((a, b) => b - a);
  }

  return (
    <div className={cn('flex gap-3', layout === 'row' ? 'flex-wrap items-end' : 'flex-col')}>
      <FilterSelect
        label="Genre"
        anyLabel="All genres"
        value={filters.genreId}
        options={genres.data?.map(({ id, name }) => ({ value: id, label: name }))}
        error={genres.isError}
        onChange={(value) => onChange('genreId', value)}
        triggerRef={triggerRefs.genre}
        layout={layout}
      />
      <FilterSelect
        label="Language"
        anyLabel="All languages"
        value={filters.languageId}
        options={languages.data?.map(({ id, name }) => ({ value: id, label: name }))}
        error={languages.isError}
        onChange={(value) => onChange('languageId', value)}
        triggerRef={triggerRefs.language}
        layout={layout}
      />
      <FilterSelect
        label="Year"
        anyLabel="Any year"
        value={filters.year}
        options={years.map((year) => ({ value: year, label: String(year) }))}
        error={false}
        onChange={(value) => onChange('year', value)}
        triggerRef={triggerRefs.year}
        layout={layout}
      />
    </div>
  );
}

interface FilterSelectProps {
  label: string;
  anyLabel: string;
  value: number | undefined;
  /** `undefined` while loading. */
  options: { value: number; label: string }[] | undefined;
  error: boolean;
  onChange: (value: number | undefined) => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  layout: 'row' | 'stack';
}

function FilterSelect({
  label,
  anyLabel,
  value,
  options,
  error,
  onChange,
  triggerRef,
  layout,
}: FilterSelectProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const loading = options === undefined;
  return (
    <div className={cn('flex flex-col gap-1.5', layout === 'row' && 'w-44')}>
      <Label htmlFor={id}>{label}</Label>
      <Select
        // '' shows the placeholder while the options are not there yet.
        value={loading ? '' : value === undefined ? ANY : String(value)}
        onValueChange={(next) => onChange(next === ANY ? undefined : Number(next))}
        disabled={loading}
      >
        <SelectTrigger
          id={id}
          ref={triggerRef}
          className="w-full bg-surface-2"
          aria-describedby={error ? hintId : undefined}
        >
          <SelectValue placeholder={loading && !error ? 'Loading…' : anyLabel} />
        </SelectTrigger>
        <SelectContent position="popper" className="max-h-80">
          <SelectItem value={ANY}>{anyLabel}</SelectItem>
          {options?.map((option) => (
            <SelectItem key={option.value} value={String(option.value)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          Couldn&apos;t load the list.
        </p>
      )}
    </div>
  );
}
