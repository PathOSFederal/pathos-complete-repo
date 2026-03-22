'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { usePrivacy } from '@/contexts/privacy-context';
import { SensitiveValue } from '@/components/sensitive-value';

export function RetirementReadinessCard() {
  usePrivacy(); // Call hook for potential side effects even if value not directly used
  const [localPrivacy, setLocalPrivacy] = useState<'default' | 'show' | 'hide'>('default');

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Retirement Readiness</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
                {localPrivacy === 'hide' ? (
                  <EyeOff className="w-3 h-3" />
                ) : (
                  <Eye className="w-3 h-3" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLocalPrivacy('default')}>
                Use global setting
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocalPrivacy('show')}>
                Always show values
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocalPrivacy('hide')}>
                Always hide values
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          On track at age 62
        </Badge>

        <div className="h-24 bg-secondary/10 rounded-lg flex items-center justify-center border border-secondary/20">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">TSP Projection at 62</p>
            <p className="text-xl font-bold text-accent mt-1">
              <SensitiveValue value="$1.24M" localOverride={localPrivacy} />
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">TSP Balance</p>
            <p className="font-medium text-foreground">
              <SensitiveValue value="$487K" localOverride={localPrivacy} />
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Contrib. Rate</p>
            <p className="font-medium text-foreground">
              <SensitiveValue value="10%" localOverride={localPrivacy} />
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">FERS Pension</p>
            <p className="font-medium text-foreground">
              <SensitiveValue value="$3,240" localOverride={localPrivacy} />
            </p>
          </div>
        </div>

        <a
          href="/fedpath/retirement-tsp"
          className="inline-flex items-center gap-1 text-accent hover:text-accent/80 text-sm font-medium transition-colors"
        >
          Open retirement & TSP
          <Link className="w-3 h-3" />
        </a>
      </CardContent>
    </Card>
  );
}
