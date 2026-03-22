'use client';

import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface MetricInfoPopoverProps {
  title: string;
  description: string;
  details?: string;
}

export function MetricInfoPopover({ title, description, details }: MetricInfoPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 hover:bg-accent/20">
          <Info className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="sr-only">More info about {title}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="space-y-2">
          <h4 className="font-medium text-sm">{title}</h4>
          <p className="text-xs text-muted-foreground">{description}</p>
          {details && (
            <p className="text-xs text-muted-foreground border-t border-border pt-2 mt-2">
              {details}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
