'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Briefcase, FileText, Heart, Sparkles, Info, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';

// Types
type NotificationType = 'job_alert' | 'resume' | 'benefits' | 'advisor' | 'system';

interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  timestamp: string;
  isRead: boolean;
  ctaLabel?: string;
  ctaRoute?: string;
}

// Mock data
const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    type: 'job_alert',
    title: 'New GS-13 IT Specialist positions',
    body: '5 new positions match your saved search in the Washington, DC area.',
    timestamp: '5m ago',
    isRead: false,
    ctaLabel: 'View Jobs',
    ctaRoute: '/dashboard/job-search',
  },
  {
    id: '2',
    type: 'resume',
    title: 'Resume tip',
    body: 'Your federal resume is missing quantified achievements. Add metrics to strengthen your application.',
    timestamp: '2h ago',
    isRead: false,
    ctaLabel: 'Edit Resume',
    ctaRoute: '/dashboard/resume-builder',
  },
  {
    id: '3',
    type: 'benefits',
    title: 'Open Season reminder',
    body: 'FEHB Open Season ends in 14 days. Review your health plan options before the deadline.',
    timestamp: '1d ago',
    isRead: false,
    ctaLabel: 'Compare Plans',
    ctaRoute: '/dashboard/benefits',
  },
  {
    id: '4',
    type: 'advisor',
    title: 'PathAdvisor insight',
    body: 'Based on your career goals, consider applying to supervisory positions to accelerate your GS-14 timeline.',
    timestamp: '2d ago',
    isRead: true,
  },
  {
    id: '5',
    type: 'system',
    title: 'Profile updated',
    body: 'Your location preferences have been saved. Job recommendations will now prioritize the DMV area.',
    timestamp: '3d ago',
    isRead: true,
  },
  {
    id: '6',
    type: 'job_alert',
    title: 'Application deadline approaching',
    body: 'The Program Analyst position at HHS closes in 3 days.',
    timestamp: '4d ago',
    isRead: true,
    ctaLabel: 'View Posting',
    ctaRoute: '/dashboard/job-search',
  },
];

// Icon mapping
const NOTIFICATION_ICONS: Record<NotificationType, React.ElementType> = {
  job_alert: Briefcase,
  resume: FileText,
  benefits: Heart,
  advisor: Sparkles,
  system: Info,
};

const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  job_alert: 'bg-blue-500/20 text-blue-400',
  resume: 'bg-purple-500/20 text-purple-400',
  benefits: 'bg-pink-500/20 text-pink-400',
  advisor: 'bg-amber-500/20 text-amber-400',
  system: 'bg-slate-500/20 text-slate-400',
};

// Notification Item Component
function NotificationItemRow({
  notification,
  onMarkRead,
  onDismiss,
  onNavigate,
}: {
  notification: NotificationItem;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onNavigate: (route: string) => void;
}) {
  const Icon = NOTIFICATION_ICONS[notification.type];
  const colorClass = NOTIFICATION_COLORS[notification.type];

  return (
    <div
      className={cn(
        'group relative flex gap-3 p-3 rounded-lg transition-colors',
        notification.isRead
          ? 'bg-transparent hover:bg-muted/50'
          : 'bg-accent/10 hover:bg-accent/20',
      )}
    >
      {/* Unread indicator */}
      {!notification.isRead && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent" />
      )}

      {/* Icon */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          colorClass,
        )}
      >
        <Icon className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-sm font-medium', !notification.isRead && 'text-foreground')}>
            {notification.title}
          </p>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {notification.timestamp}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{notification.body}</p>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-2">
          {notification.ctaLabel && notification.ctaRoute && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs text-accent hover:text-accent/80"
              onClick={() => onNavigate(notification.ctaRoute!)}
            >
              {notification.ctaLabel}
            </Button>
          )}
          <div className="flex-1" />
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!notification.isRead && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={() => onMarkRead(notification.id)}
              >
                <Check className="w-3.5 h-3.5" />
                <span className="sr-only">Mark as read</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={() => onDismiss(notification.id)}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="sr-only">Dismiss</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main NotificationCenter Component
export function NotificationCenter() {
  const router = useRouter();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [open, setOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationItem[]>(MOCK_NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleDismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const handleNavigate = (route: string) => {
    setOpen(false);
    router.push(route);
  };

  // Notification list content (shared between dropdown and sheet)
  const notificationContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {unreadCount}
            </Badge>
          )}
        </div>
        {notifications.length > 0 && (
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={handleMarkAllRead}
              >
                Mark all read
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Notification list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="w-10 h-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No notifications</p>
              <p className="text-xs text-muted-foreground/70 mt-1">You&apos;re all caught up!</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationItemRow
                key={notification.id}
                notification={notification}
                onMarkRead={handleMarkRead}
                onDismiss={handleDismiss}
                onNavigate={handleNavigate}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-8 text-xs text-muted-foreground hover:text-destructive"
            onClick={handleClearAll}
          >
            Clear all notifications
          </Button>
        </div>
      )}
    </>
  );

  // Trigger button (shared)
  const triggerButton = (
    <Button
      variant="ghost"
      size="icon"
      className="relative h-8 w-8 lg:h-9 lg:w-9 text-slate-300 hover:text-white hover:bg-slate-800"
    >
      <Bell className="w-4 h-4" />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
      )}
      <span className="sr-only">Notifications {unreadCount > 0 && `(${unreadCount} unread)`}</span>
    </Button>
  );

  // Desktop: Dropdown
  if (isDesktop) {
    return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[380px] p-0 flex flex-col max-h-[500px]">
          {notificationContent}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Mobile: Sheet
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-8 w-8 lg:h-9 lg:w-9 text-slate-300 hover:text-white hover:bg-slate-800"
        onClick={() => setOpen(true)}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
        )}
        <span className="sr-only">
          Notifications {unreadCount > 0 && `(${unreadCount} unread)`}
        </span>
      </Button>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="sr-only">
          <SheetTitle>Notifications</SheetTitle>
        </SheetHeader>
        {notificationContent}
      </SheetContent>
    </Sheet>
  );
}
