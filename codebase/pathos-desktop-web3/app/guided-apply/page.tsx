/**
 * Guided Apply alias route. Redirects to canonical path so Sidebar and
 * external links resolve. Canonical path: /desktop/usajobs-guided.
 */

import { redirect } from 'next/navigation';

export default function GuidedApplyRedirectPage() {
  redirect('/desktop/usajobs-guided');
}
