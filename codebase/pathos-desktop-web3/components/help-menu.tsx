'use client';

import { useState } from 'react';
import { CircleHelp, Lightbulb, MessageSquare, ExternalLink, Sparkles } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAdvisorContext } from '@/contexts/advisor-context';
import { toast } from '@/hooks/use-toast';
// Day 43: Import anchor system for setting dashboard anchor (right rail context)
import { usePathAdvisorStore } from '@/store/pathAdvisorStore';
import { buildAnchorId, normalizeSourceLabel, type PathAdvisorAnchor } from '@/lib/pathadvisor/anchors';

function getSuggestedQuestions(screenName: string): string[] {
  const name = screenName.toLowerCase();

  if (name.indexOf('dashboard') >= 0) {
    return ['How close am I to my target grade?', 'Explain my FEHB options based on my profile.'];
  }
  if (name.indexOf('job search') >= 0 || name.indexOf('job-search') >= 0) {
    return [
      'Which of these jobs is my best fit and why?',
      'How will this job affect my retirement and COL?',
    ];
  }
  if (name.indexOf('resume') >= 0) {
    return [
      'What should I fix first in my resume for my target role?',
      'Help me rewrite my bullets with better metrics.',
    ];
  }
  if (name.indexOf('career') >= 0) {
    return [
      'What skills should I develop for my target grade?',
      'Show me a realistic timeline to reach my goal.',
    ];
  }
  if (name.indexOf('benefits') >= 0 || name.indexOf('retirement') >= 0) {
    return [
      'How do my current benefits compare to other options?',
      "What's my projected retirement income?",
    ];
  }
  if (name.indexOf('settings') >= 0 || name.indexOf('profile') >= 0) {
    return [
      'How can I improve my profile for better recommendations?',
      'What information should I add to get better matches?',
    ];
  }

  // Generic fallback
  return ['What should I focus on next in PathOS?', 'How can PathAdvisor help me today?'];
}

export function HelpMenu() {
  const [helpOpen, setHelpOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'other'>('other');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const advisorContextData = useAdvisorContext();
  const screenName = advisorContextData.screenName;
  const screenPurpose = advisorContextData.screenPurpose;
  const setPendingPrompt = advisorContextData.setPendingPrompt;
  const setIsPanelOpen = advisorContextData.setIsPanelOpen;

  const title = screenName || 'this screen';
  const purpose = screenPurpose || 'help you plan your federal career path.';
  const suggestedQuestions = getSuggestedQuestions(screenName);

  const handleSendToAdvisor = function (question: string) {
    // Day 43: Set dashboard anchor for Focus Mode right rail context
    const anchorId = buildAnchorId('dashboard');
    const sourceLabel = screenName || 'Help Menu';
    const normalizedLabel = normalizeSourceLabel(sourceLabel, 'dashboard');
    const anchor: PathAdvisorAnchor = {
      id: anchorId,
      source: 'dashboard',
      sourceLabel: normalizedLabel,
      summary: 'Help question',
      // eslint-disable-next-line react-hooks/purity -- This is an event handler, not render code
      createdAt: Date.now(),
    };
    usePathAdvisorStore.getState().setActiveAnchor(anchor);

    // TODO: Wire this into PathAdvisor input when ready
    console.log('Send to PathAdvisor:', question);
    setPendingPrompt(question);
    setIsPanelOpen(true);
  };

  const handleSubmitFeedback = function () {
    if (!feedbackText.trim()) return;

    setIsSubmitting(true);
    // TODO: Wire to backend API
    console.log('Feedback submitted:', {
      type: feedbackType,
      text: feedbackText,
      screen: screenName,
    });

    // Simulate API call
    setTimeout(function () {
      toast({
        title: 'Feedback received',
        description: 'Thank you for helping us improve PathOS!',
      });

      setFeedbackText('');
      setFeedbackOpen(false);
      setIsSubmitting(false);
    }, 500);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="relative hidden sm:inline-flex h-8 w-8 lg:h-9 lg:w-9 items-center justify-center rounded-full hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Help and feedback"
          >
            <CircleHelp className="h-4 w-4 text-slate-300" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Help & Feedback
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Screen context help */}
          <DropdownMenuItem onClick={function () { setHelpOpen(true); }}>
            <CircleHelp className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>How to use {title}</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Suggested questions */}
          <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
            Ask PathAdvisor
          </DropdownMenuLabel>
          {suggestedQuestions.map(function (question, idx) {
            return (
              <DropdownMenuItem
                key={idx}
                onClick={function () { handleSendToAdvisor(question); }}
                className="cursor-pointer"
              >
                <Sparkles className="h-4 w-4 mr-2 text-accent" />
                <span className="text-sm line-clamp-2">{question}</span>
              </DropdownMenuItem>
            );
          })}

          <DropdownMenuSeparator />

          {/* Feedback */}
          <DropdownMenuItem onClick={function () { setFeedbackOpen(true); }}>
            <MessageSquare className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>Send feedback</span>
          </DropdownMenuItem>

          {/* External docs link */}
          <DropdownMenuItem asChild>
            <a
              href="https://docs.pathos.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center"
            >
              <ExternalLink className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>View documentation</span>
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* How to use this screen dialog */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CircleHelp className="h-5 w-5 text-accent" />
              How to use {title}
            </DialogTitle>
            <DialogDescription>{purpose}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                This screen helps you {purpose.toLowerCase().replace(/\.$/, '')}. Use the cards and
                controls to explore your options.
              </p>
              <p>
                Need more help? Click one of the suggested questions above to ask PathAdvisor, or
                use the feedback option to let us know how we can improve.
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full bg-transparent"
              onClick={function () { setHelpOpen(false); }}
            >
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feedback dialog */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-accent" />
              Send feedback
            </DialogTitle>
            <DialogDescription>
              Help us improve PathOS. Your feedback is anonymous.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Feedback type selector */}
            <div className="flex gap-2">
              {(['bug', 'feature', 'other'] as const).map(function (type) {
                return (
                  <Button
                    key={type}
                    variant={feedbackType === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={function () { setFeedbackType(type); }}
                    className="flex-1 capitalize"
                  >
                    {type === 'bug' ? 'Bug report' : type === 'feature' ? 'Feature idea' : 'Other'}
                  </Button>
                );
              })}
            </div>

            <Textarea
              placeholder="Tell us what's on your mind..."
              value={feedbackText}
              onChange={function (e) { setFeedbackText(e.target.value); }}
              rows={4}
            />

            <p className="text-xs text-muted-foreground">Current screen: {screenName}</p>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={function () { setFeedbackOpen(false); }}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitFeedback}
                disabled={!feedbackText.trim() || isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Send feedback'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
