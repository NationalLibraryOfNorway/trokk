import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const knownError = error as { message?: string; error?: string };
    if (knownError.message) return knownError.message;
    if (knownError.error) return knownError.error;
  }
  return String(error);
}

export type ErrorDiagnostics = {
  detail?: string;
  stackTrace?: string;
  logs?: string[];
}

export function getErrorDiagnostics(error: unknown): ErrorDiagnostics {
  const stackTrace = error instanceof Error ? error.stack : undefined;

  return {
    detail: getErrorMessage(error),
    stackTrace,
    logs: stackTrace ? [stackTrace] : [],
  };
}
