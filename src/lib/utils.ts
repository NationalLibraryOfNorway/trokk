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
