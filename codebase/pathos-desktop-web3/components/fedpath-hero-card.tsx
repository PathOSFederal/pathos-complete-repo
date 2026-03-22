'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SensitiveValue } from '@/components/sensitive-value';
import { usePrivacy } from '@/contexts/privacy-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export function FedPathHeroCard() {
  const { globalHide } = usePrivacy();
  const [localOverride, setLocalOverride] = useState<boolean | null>(null);
  const shouldHide = localOverride !== null ? localOverride : globalHide;

  return (
    <Card className="border-border bg-gradient-to-r from-card to-card/80 mb-6">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-foreground">Good afternoon, Sarah</h2>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    {shouldHide ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setLocalOverride(true)}>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Hide this card
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocalOverride(false)}>
                    <Eye className="w-4 h-4 mr-2" />
                    Show this card
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocalOverride(null)}>
                    Use global setting
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              <SensitiveValue
                value="GS-13 Step 3 · Department of Veterans Affairs"
                masked="GS-•• Step • · •••••••••••"
                hide={shouldHide}
              />
              {' · Washington, DC'}
            </p>
            <div className="flex items-center gap-2 mt-4">
              <Badge variant="secondary">Status: Active</Badge>
              <Badge variant="outline">Service: 9.4 years</Badge>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-accent">78</div>
            <p className="text-xs text-muted-foreground mt-1">FedPath Score</p>
            <Badge className="mt-2 bg-accent/20 text-accent border-accent/30">
              2 recommended actions
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
