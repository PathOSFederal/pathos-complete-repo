'use client';

import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CardVisibilityToggleProps {
  isHidden: boolean;
  onToggle: () => void;
}

export function CardVisibilityToggle({ isHidden, onToggle }: CardVisibilityToggleProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-accent/20"
          >
            {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{isHidden ? 'Show values' : 'Hide values'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
