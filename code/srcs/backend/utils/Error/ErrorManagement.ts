export type ErrorType =
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'INVALID_ARG'
  | 'CONFLICT'
  | 'DATABASE'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INTERNAL'
  | 'UNKNOWN';

////////////

export interface AppError {
  type: ErrorType;
  message: string;
  cause?: unknown;
}

////////////

export type Success<T> = {
  ok: true;
  data: T;
};

export type Failure = {
  ok: false;
  error: AppError;
};

////////////

export type Result<T> = Success<T> | Failure;

////////////

/* Pagination */

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/* Helpers */

export function success<T>(data: T): Success<T>
{
  return { ok: true, data};
}

export function failure(type: ErrorType, message: string, cause?: unknown): Failure
{
  return {ok: false,  error: { type, message, cause }}
};
