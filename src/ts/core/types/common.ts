/**
 * Common TypeScript type definitions
 */

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}
