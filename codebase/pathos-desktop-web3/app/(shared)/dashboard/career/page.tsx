import { redirect } from 'next/navigation';

/**
 * Alias for Resume Readiness. Redirect to canonical path so old links and bookmarks still work.
 */
export default function CareerPage() {
  redirect('/dashboard/resume-readiness');
}
