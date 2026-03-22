'use client';

import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  useCardVisibility,
  type CardKey,
} from '@/store/userPreferencesStore';

interface DashboardCardVisibilityToggleProps {
  cardKey: CardKey;
}

/**
 * A toggle button for dashboard card visibility that persists to the user preferences store.
 * Shows an eye icon when visible, eye-off when hidden.
 */
export function DashboardCardVisibilityToggle({ cardKey }: DashboardCardVisibilityToggleProps) {
  const { visible, toggle } = useCardVisibility(cardKey);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-accent/20"
          >
            {visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{visible ? 'Hide this card' : 'Show this card'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface CardHiddenPlaceholderProps {
  /** Title of the hidden card (reserved for future UI use) */
  title: string;
  cardKey: CardKey;
  /** Icon for the hidden card (reserved for future UI use) */
  icon?: React.ReactNode;
}

/**
 * Placeholder content shown when a card is hidden.
 * Displays a message and a button to show the card again.
 *
 * NOTE: title and icon props are defined in the interface for future
 * enhanced placeholder UI but are not currently displayed.
 */
export function CardHiddenPlaceholder(props: CardHiddenPlaceholderProps) {
  // title and icon are reserved props for future UI enhancements
  const cardKey = props.cardKey;
  const { setVisible } = useCardVisibility(cardKey);

  const handleShowCard = function () {
    setVisible(true);
  };

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <p className="text-sm text-muted-foreground mb-3">This card is hidden.</p>
      <Button
        variant="outline"
        size="sm"
        onClick={handleShowCard}
        className="text-xs"
      >
        <Eye className="w-3.5 h-3.5 mr-1.5" />
        Show this card
      </Button>
    </div>
  );
}

/**
 * Hook that returns visibility state and global privacy state for a dashboard card.
 * Use this in card components to determine what content to render.
 * 
 * Behavior:
 * - If visible === false: show "This card is hidden" placeholder
 * - If visible === true && isSensitiveHidden === true: show content with masked values
 * - If visible === true && isSensitiveHidden === false: show content with real values
 */
export function useDashboardCardVisibility(cardKey: CardKey) {
  const { visible, setVisible, toggle, isSensitiveHidden } = useCardVisibility(cardKey);

  return {
    /** Whether the card should show its content (true) or placeholder (false) */
    visible,
    /** Toggle the card visibility */
    toggle,
    /** Set the card visibility directly */
    setVisible,
    /** Whether sensitive values should be masked (global privacy mode) */
    isSensitiveHidden,
    /** Combined: card visible but values should be hidden */
    shouldMaskValues: visible && isSensitiveHidden,
  };
}
