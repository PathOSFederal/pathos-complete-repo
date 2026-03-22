import Link from 'next/link';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageShell className="px-6 py-16">
        <div className="mx-auto max-w-4xl text-center space-y-6">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Desktop-first by design</p>
          <h1 className="text-4xl font-semibold leading-tight">
            PathOS is a desktop application that guides you alongside USAJOBS.
          </h1>
          <p className="text-lg text-muted-foreground">
            PathAdvisor is your calm, human copilot. You browse USAJOBS directly while PathOS stays beside you,
            offering guidance without touching your account or submissions.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/download">Get PathOS for Desktop</Link>
            </Button>
            <p className="text-xs text-muted-foreground">Discover online, work locally.</p>
          </div>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          <Card className="border-border/60 bg-card p-6 text-left">
            <p className="text-sm font-semibold">What PathOS is</p>
            <p className="mt-3 text-sm text-muted-foreground">
              A desktop-first guidance layer for federal job seekers. It keeps USAJOBS as the system of record and
              keeps your decisions grounded in the official source.
            </p>
          </Card>
          <Card className="border-border/60 bg-card p-6 text-left">
            <p className="text-sm font-semibold">What PathOS is not</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Not an automation tool. It does not auto-apply, autofill, scrape, or capture credentials. Your USAJOBS
              account stays untouched.
            </p>
          </Card>
          <Card className="border-border/60 bg-card p-6 text-left">
            <p className="text-sm font-semibold">Why desktop</p>
            <p className="mt-3 text-sm text-muted-foreground">
              The work stays local. That keeps the trust boundary clear and reduces surface area for sensitive federal
              job activity.
            </p>
          </Card>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Trust boundary, stated plainly</h2>
            <p className="text-sm text-muted-foreground">
              PathOS runs locally and never interferes with USAJOBS. The architecture is the promise.
            </p>
            <div className="grid gap-3 text-sm text-muted-foreground">
              <p className="rounded-lg border border-border/60 bg-card px-4 py-3">Runs locally in a desktop app.</p>
              <p className="rounded-lg border border-border/60 bg-card px-4 py-3">
                Does not intercept credentials or read the USAJOBS page DOM.
              </p>
              <p className="rounded-lg border border-border/60 bg-card px-4 py-3">
                Does not modify USAJOBS or submit anything on your behalf.
              </p>
              <p className="rounded-lg border border-border/60 bg-card px-4 py-3">
                Uses pixel-only, ephemeral screenshots for PathAdvisor explanations.
              </p>
            </div>
          </div>
          <Card className="border-border/60 bg-card p-6 text-left">
            <h3 className="text-lg font-semibold">How it works</h3>
            <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>1. Discover PathOS online and download the desktop app.</li>
              <li>2. Open USAJOBS in the native desktop view.</li>
              <li>3. Keep PathAdvisor open beside you for guidance and clarity.</li>
            </ol>
            <Button size="sm" className="mt-6" asChild>
              <Link href="/download">Download PathOS</Link>
            </Button>
          </Card>
        </div>
        {/* Desktop Preview Launcher */}
        <div className="mt-16 space-y-4">
          <h2 className="text-2xl font-semibold text-center">Desktop Preview</h2>
          <p className="text-sm text-muted-foreground text-center">
            Preview the shared desktop shell and screens in your browser.
          </p>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-7 max-w-5xl mx-auto">
            <Card className="border-border/60 bg-card p-4 text-left">
              <Button variant="outline" className="w-full" size="sm" asChild>
                <Link href="/desktop-preview">Dashboard</Link>
              </Button>
            </Card>
            <Card className="border-border/60 bg-card p-4 text-left">
              <Button variant="outline" className="w-full" size="sm" asChild>
                <Link href="/desktop-preview?screen=career">Career</Link>
              </Button>
            </Card>
            <Card className="border-border/60 bg-card p-4 text-left">
              <Button variant="outline" className="w-full" size="sm" asChild>
                <Link href="/desktop-preview?screen=settings">Settings</Link>
              </Button>
            </Card>
            <Card className="border-border/60 bg-card p-4 text-left">
              <Button variant="outline" className="w-full" size="sm" asChild>
                <Link href="/desktop-preview?screen=guided-apply">Guided Apply</Link>
              </Button>
            </Card>
            <Card className="border-border/60 bg-card p-4 text-left">
              <Button variant="outline" className="w-full" size="sm" asChild>
                <Link href="/desktop-preview?screen=job-search">Job Search</Link>
              </Button>
            </Card>
            <Card className="border-border/60 bg-card p-4 text-left">
              <Button variant="outline" className="w-full" size="sm" asChild>
                <Link href="/desktop-preview?screen=saved-jobs">Saved Jobs</Link>
              </Button>
            </Card>
            <Card className="border-border/60 bg-card p-4 text-left">
              <Button variant="outline" className="w-full" size="sm" asChild>
                <Link href="/desktop-preview?screen=resume">Resume</Link>
              </Button>
            </Card>
          </div>
        </div>
      </PageShell>
    </div>
  );
}
