/**
 * Shared utility functions for PathOS.
 * This file MUST NOT import from next/* or electron/*.
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
