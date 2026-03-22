'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePrivacy } from '@/contexts/privacy-context';
import { SensitiveValue } from '@/components/sensitive-value';
import { useState } from 'react';

export default function FEHBOptimizerPage() {
  const { globalHide } = usePrivacy();
  const [localOverrides, setLocalOverrides] = useState<Record<string, boolean>>({});

  const getCardPrivacy = (cardId: string) => {
    return localOverrides[cardId] !== undefined ? localOverrides[cardId] : globalHide;
  };

  const toggleCardPrivacy = (cardId: string) => {
    setLocalOverrides((prev) => ({
      ...prev,
      [cardId]: prev[cardId] !== undefined ? !prev[cardId] : !globalHide,
    }));
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">FEHB Optimizer</h1>
          <p className="text-muted-foreground">
            Current plan analysis and open season recommendations
          </p>
        </div>
        <Badge
          variant="outline"
          className={`flex items-center gap-1.5 ${
            globalHide
              ? 'border-accent/50 text-accent'
              : 'border-muted-foreground/30 text-muted-foreground'
          }`}
        >
          {globalHide ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          Privacy: {globalHide ? 'Active' : 'Off'}
        </Badge>
      </div>

      <Card className="border-accent/50 bg-accent/5">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">Your Current Plan: BCBS</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Blue Cross Blue Shield Standard</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    {getCardPrivacy('current-plan') ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => toggleCardPrivacy('current-plan')}>
                    {getCardPrivacy('current-plan') ? (
                      <>
                        <EyeOff className="mr-2 h-4 w-4" />
                        Hide this card
                      </>
                    ) : (
                      <>
                        <Eye className="mr-2 h-4 w-4" />
                        Show this card
                      </>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-background border border-border">
              <p className="text-xs text-muted-foreground mb-1">Monthly Premium</p>
              <SensitiveValue
                value="$450"
                className="text-2xl font-bold"
                hide={getCardPrivacy('current-plan')}
              />
              <p className="text-xs text-muted-foreground mt-2">Employee portion</p>
            </div>
            <div className="p-3 rounded-lg bg-background border border-border">
              <p className="text-xs text-muted-foreground mb-1">Family Coverage</p>
              <p className="text-2xl font-bold">Self+Family</p>
              <p className="text-xs text-muted-foreground mt-2">4 family members</p>
            </div>
            <div className="p-3 rounded-lg bg-background border border-border">
              <p className="text-xs text-muted-foreground mb-1">Annual Cost</p>
              <SensitiveValue
                value="$5,400"
                className="text-2xl font-bold"
                hide={getCardPrivacy('current-plan')}
              />
              <p className="text-xs text-muted-foreground mt-2">Out of gross pay</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Alternative Plans (Next Open Season: Nov 3)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Alternative Plan 1 */}
          <div className="border border-border rounded-lg p-4 hover:border-accent/50 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-foreground">Aetna Open Access</p>
                <p className="text-xs text-muted-foreground">PPO with broad network</p>
              </div>
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">-$12/month</Badge>
            </div>
            <div className="grid md:grid-cols-5 gap-2 text-sm mb-4">
              <div>
                <p className="text-muted-foreground text-xs">Premium</p>
                <p className="font-bold">$438</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Deductible</p>
                <p className="font-bold">$500</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Copay</p>
                <p className="font-bold">$30</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">OOP Max</p>
                <p className="font-bold">$2,500</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Rating</p>
                <p className="font-bold text-accent">4.2/5</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full bg-transparent">
              Switch to Aetna
            </Button>
          </div>

          {/* Alternative Plan 2 */}
          <div className="border border-border rounded-lg p-4 hover:border-accent/50 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-foreground">United Health Plus</p>
                <p className="text-xs text-muted-foreground">HMO with lower costs</p>
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                -$48/month
              </Badge>
            </div>
            <div className="grid md:grid-cols-5 gap-2 text-sm mb-4">
              <div>
                <p className="text-muted-foreground text-xs">Premium</p>
                <p className="font-bold">$402</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Deductible</p>
                <p className="font-bold">$0</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Copay</p>
                <p className="font-bold">$25</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">OOP Max</p>
                <p className="font-bold">$2,000</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Rating</p>
                <p className="font-bold text-accent">3.8/5</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full bg-transparent">
              Switch to UnitedHealth
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Open Season Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/10 border border-accent/30">
              <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Open Season Begins</p>
                <p className="text-xs text-muted-foreground">November 3, 2024</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/10 border border-secondary/30">
              <div className="w-2 h-2 rounded-full bg-secondary flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Enrollment Deadline</p>
                <p className="text-xs text-muted-foreground">December 11, 2024</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border">
              <div className="w-2 h-2 rounded-full bg-muted flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Coverage Begins</p>
                <p className="text-xs text-muted-foreground">January 1, 2025</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
