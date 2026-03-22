import Link from 'next/link';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const DOWNLOAD_OPTIONS = [
  {
    platform: 'Windows',
    detail: 'Best for agency-issued PCs and most federal desktops.',
    availability: 'Download for Windows',
    href: '/downloads/pathos-setup.exe',
  },
  {
    platform: 'macOS',
    detail: 'Apple Silicon and Intel builds will be provided.',
    availability: 'Coming soon',
  },
  {
    platform: 'Linux',
    detail: 'For secure, self-managed environments.',
    availability: 'Coming soon',
  },
];

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageShell className="px-6 py-16">
        <div className="mx-auto max-w-3xl text-center space-y-5">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Get PathOS</p>
          <h1 className="text-3xl font-semibold">Download the desktop app to do the real work locally.</h1>
          <p className="text-base text-muted-foreground">
            PathOS runs on your machine and keeps USAJOBS authoritative. The web is only the front door.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {DOWNLOAD_OPTIONS.map(function (option) {
            return (
              <Card key={option.platform} className="border-border/60 bg-card p-6 text-left">
                <p className="text-sm font-semibold">{option.platform}</p>
                <p className="mt-2 text-sm text-muted-foreground">{option.detail}</p>
                {option.href ? (
                  <Button className="mt-4 w-full" asChild>
                    <a href={option.href} download>
                      {option.availability}
                    </a>
                  </Button>
                ) : (
                  <Button className="mt-4 w-full" variant="outline" disabled>
                    {option.availability}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Before you download</h2>
            <p className="text-sm text-muted-foreground">
              PathOS is built to keep your USAJOBS activity local and inspectable. There is no web-based job search
              inside PathOS.
            </p>
            <div className="grid gap-3 text-sm text-muted-foreground">
              <p className="rounded-lg border border-border/60 bg-card px-4 py-3">Runs locally in a desktop shell.</p>
              <p className="rounded-lg border border-border/60 bg-card px-4 py-3">
                Does not intercept credentials or read the USAJOBS page DOM.
              </p>
              <p className="rounded-lg border border-border/60 bg-card px-4 py-3">
                Does not modify USAJOBS or submit anything on your behalf.
              </p>
            </div>
          </div>
          <Card className="border-border/60 bg-card p-6 text-left">
            <h3 className="text-base font-semibold">What happens after install</h3>
            <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>1. Launch PathOS on your desktop.</li>
              <li>2. USAJOBS opens in a native BrowserView.</li>
              <li>3. PathAdvisor sits beside the official site to guide your decisions.</li>
            </ol>
            <div className="mt-6">
              <Button size="sm" asChild>
                <Link href="/">Back to overview</Link>
              </Button>
            </div>
          </Card>
        </div>
      </PageShell>
    </div>
  );
}
