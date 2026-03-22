/**
 * ============================================================================
 * SETTINGS PAGE
 * ============================================================================
 *
 * FILE PURPOSE:
 * The main settings page where users can view and edit their profile,
 * career goals, location preferences, benefits settings, and app preferences.
 *
 * WHERE IT FITS IN THE ARCHITECTURE:
 * - Page Layer: /settings route
 * - Reads from: profileStore, userPreferencesStore
 * - Writes to: Same stores (persisted to localStorage)
 *
 * KEY CONCEPTS:
 * - Organized into collapsible sections for different setting categories
 * - "Save" feedback shows briefly after each change
 * - Avatar upload with preview and crop functionality
 * - Privacy toggle affects sensitive data display across the app
 *
 * HOW IT WORKS (STEP BY STEP):
 * 1. Load profile and preferences from stores
 * 2. Display settings in organized, collapsible sections
 * 3. On change, update store and show "Saved" feedback
 * 4. Store changes are automatically persisted to localStorage
 *
 * WHY THIS DESIGN:
 * - Collapsible sections reduce visual overwhelm
 * - Immediate save with feedback feels responsive
 * - Grouped by category for logical organization
 * - Privacy controls are prominently placed
 *
 * HOW TO EXTEND SAFELY:
 * - Add new sections following the existing pattern
 * - Use the showSaved() helper for consistent feedback
 * - Keep SSR safety in mind (check window before localStorage)
 *
 * TESTING / VALIDATION:
 * - pnpm typecheck (ensure no type errors)
 * - Manual: Change each setting and verify persistence
 * - Check that privacy toggle affects sensitive values
 * ============================================================================
 */

'use client';

import type React from 'react';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Eye,
  EyeOff,
  User,
  Target,
  MapPin,
  DollarSign,
  Settings,
  ChevronDown,
  ChevronUp,
  Check,
  Camera,
  X,
  PanelRight,
  PanelLeft,
  Monitor,
  Sun,
  Moon,
  Shield,
  Trash2,
  RefreshCcw,
  Search,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useDeleteAllLocalData } from '@/hooks/use-delete-all-local-data';
import { SetupChecklistCard } from '@/components/settings';
import {
  useProfileStore,
  type EducationLevel,
  type GoalTimeHorizon,
  type RelocationWillingness,
  type WorkArrangement,
  type AdvisorTone,
  type ThemePreference,
} from '@/store/profileStore';
import { useUserPreferencesStore, useCardVisibility } from '@/store/userPreferencesStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useGuidedTourStore } from '@/store/guidedTourStore';
import { useAdvisorContext } from '@/contexts/advisor-context';
import { OnboardingWizard } from '@/components/onboarding-wizard';
import { cn } from '@/lib/utils';
import { PageShell } from '@/components/layout/page-shell';

const gradeOptions = [
  'GS-5',
  'GS-6',
  'GS-7',
  'GS-8',
  'GS-9',
  'GS-10',
  'GS-11',
  'GS-12',
  'GS-13',
  'GS-14',
  'GS-15',
];
const stepOptions = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

const educationOptions: { value: EducationLevel; label: string }[] = [
  { value: 'high_school', label: 'High School' },
  { value: 'associate', label: 'Associate Degree' },
  { value: 'bachelor', label: "Bachelor's Degree" },
  { value: 'master', label: "Master's Degree" },
  { value: 'doctorate', label: 'Doctorate' },
  { value: 'other', label: 'Other' },
];

const timeHorizonOptions: { value: GoalTimeHorizon; label: string }[] = [
  { value: '6_12_months', label: '6-12 months' },
  { value: '1_3_years', label: '1-3 years' },
  { value: '3_5_years_plus', label: '3-5+ years' },
];

/**
 * Relocation willingness options with "No preference" for neutral filter state.
 * CONUS = Continental United States (48 contiguous states)
 * OCONUS = Outside CONUS (Alaska, Hawaii, Puerto Rico, overseas bases)
 */
const relocationOptions: { value: RelocationWillingness; label: string; description?: string }[] = [
  { value: 'no_preference', label: 'No preference', description: 'Show all locations' },
  { value: 'stay_local', label: 'Stay local', description: 'Same metro area only' },
  { value: 'nearby_regions', label: 'Nearby regions', description: 'Within a few hours drive' },
  { value: 'open_conus', label: 'Open CONUS', description: 'Continental US (48 states)' },
  { value: 'open_conus_oconus', label: 'Open anywhere', description: 'Including overseas' },
];

/**
 * Work arrangement options with "No preference" for neutral filter state.
 */
const workArrangementOptions: { value: WorkArrangement; label: string }[] = [
  { value: 'no_preference', label: 'No preference' },
  { value: 'on_site', label: 'On-site' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'remote_okay', label: 'Remote okay' },
];

const priorityOptions = [
  'Higher pay',
  'Location',
  'Work-life balance',
  'Remote / hybrid',
  'Mission / impact',
];

const seriesOptions = [
  'IT Specialist (2210)',
  'Program Analyst (0343)',
  'Contract Specialist (1102)',
  'Management Analyst (0343)',
  'Human Resources (0201)',
  'Financial Management (0501)',
  'Administrative Officer (0341)',
  'Budget Analyst (0560)',
];

function SavedIndicator(props: { show: boolean }) {
  if (!props.show) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-accent">
      <Check className="w-3 h-3" />
      Saved
    </span>
  );
}

export default function SettingsPage() {
  const profile = useProfileStore(function (state) {
    return state.profile;
  });
  const updateProfile = useProfileStore(function (state) {
    return state.updateProfile;
  });
  const updateCurrent = useProfileStore(function (state) {
    return state.updateCurrent;
  });
  const updateJobSeeker = useProfileStore(function (state) {
    return state.updateJobSeeker;
  });
  const updateGoals = useProfileStore(function (state) {
    return state.updateGoals;
  });
  const updateLocation = useProfileStore(function (state) {
    return state.updateLocation;
  });
  const updateBenefits = useProfileStore(function (state) {
    return state.updateBenefits;
  });
  const updatePreferences = useProfileStore(function (state) {
    return state.updatePreferences;
  });
  const setAvatarUrl = useProfileStore(function (state) {
    return state.setAvatarUrl;
  });
  const clearAvatar = useProfileStore(function (state) {
    return state.clearAvatar;
  });

  const globalHide = useUserPreferencesStore(function (state) {
    return state.isSensitiveHidden;
  });

  // Day 36: Onboarding store actions
  const restartOnboarding = useOnboardingStore(function (state) {
    return state.restartOnboarding;
  });

  // Day 36: Guided tour store actions
  const startTour = useGuidedTourStore(function (state) {
    return state.startTour;
  });

  const router = useRouter();
  const setGlobalHide = useUserPreferencesStore(function (state) {
    return state.setSensitiveHidden;
  });

  const advisorContextData = useAdvisorContext();
  const setScreenInfo = advisorContextData.setScreenInfo;

  // Card visibility hooks
  const identityVisibility = useCardVisibility('settings.identity');
  const goalsVisibility = useCardVisibility('settings.goals');
  const locationVisibility = useCardVisibility('settings.location');
  const benefitsVisibility = useCardVisibility('settings.benefits');

  const toastHook = useToast();
  const toast = toastHook.toast;

  const deleteAllLocalDataHook = useDeleteAllLocalData();
  const deleteAllLocalData = deleteAllLocalDataHook.deleteAllLocalData;

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    identity: true,
    goals: true,
    location: true,
    benefits: false,
    preferences: false,
  });

  const [savedFields, setSavedFields] = useState<Record<string, boolean>>({});
  /**
   * Global last saved timestamp - shows when the most recent change was persisted.
   * This provides consistent "Saved" feedback near the page title rather than
   * per-field toasts that can become noisy.
   */
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  /**
   * Series search filter for Target series selection.
   * Allows users to quickly find series by code or name.
   */
  const [seriesSearch, setSeriesSearch] = useState('');
  /**
   * Delete confirmation - requires typing "DELETE" to confirm.
   * This prevents accidental data deletion.
   */
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Section refs for scroll/focus functionality
  const identityRef = useRef<HTMLDivElement>(null);
  const goalsRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);
  const benefitsRef = useRef<HTMLDivElement>(null);
  const preferencesRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  /**
   * Input refs for focus after scrolling.
   * When the user clicks "Set up" on a checklist item, we scroll to the section
   * AND focus the first relevant input for immediate action.
   */
  const metroAreaInputRef = useRef<HTMLInputElement>(null);
  const seriesSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(function () {
    const mainElement = document.querySelector('main');
    if (mainElement) mainElement.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }, []);

  /**
   * Set PathAdvisor to "Setup Coach" mode when on Settings page.
   * This changes the AI prompts to be configuration-focused rather than
   * showing job-offer or PCS prompts.
   */
  useEffect(function () {
    setScreenInfo(
      'Settings',
      'help the user configure their profile for better job matches. Offer configuration-focused suggestions like "Set your metro area for locality pay estimates" or "Select target series to filter job results". Do not show job-offer or PCS prompts here.',
    );
  }, [setScreenInfo]);

  /**
   * scrollToSection - scrolls to and focuses a section by ID.
   *
   * WHY THIS EXISTS:
   * The Setup Checklist provides CTA buttons that need to scroll the user
   * to the relevant control. This function handles both the scroll and
   * (optionally) focusing the first input in that section.
   *
   * HOW IT WORKS:
   * 1. Expands the target section (in case it's collapsed)
   * 2. Scrolls the section into view with smooth animation
   * 3. Focuses the first relevant input after a brief delay
   */
  const scrollToSection = function (sectionId: string) {
    // First, expand the section
    setExpandedSections(function (prev) {
      const newState = Object.assign({}, prev);
      newState[sectionId] = true;
      return newState;
    });

    // Use setTimeout to allow the collapsible to expand before scrolling
    setTimeout(function () {
      let ref: React.RefObject<HTMLDivElement | null> | null = null;
      let inputRef: React.RefObject<HTMLInputElement | null> | null = null;

      if (sectionId === 'identity') {
        ref = identityRef;
      } else if (sectionId === 'goals') {
        ref = goalsRef;
        inputRef = seriesSearchInputRef;
      } else if (sectionId === 'location') {
        ref = locationRef;
        inputRef = metroAreaInputRef;
      } else if (sectionId === 'benefits') {
        ref = benefitsRef;
      } else if (sectionId === 'preferences') {
        ref = preferencesRef;
      }

      if (ref && ref.current) {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Focus the input after scroll completes
        if (inputRef && inputRef.current) {
          setTimeout(function () {
            if (inputRef && inputRef.current) {
              inputRef.current.focus();
            }
          }, 400);
        }
      }
    }, 100);
  };

  /**
   * showSaved - displays saved feedback for a field and updates global timestamp.
   *
   * WHY THIS DESIGN:
   * Instead of spamming toasts for every field change, we use:
   * 1. Per-card "Saved" indicator that appears briefly
   * 2. Global "Last saved" timestamp near the page title
   *
   * This provides clear feedback that changes persist without being intrusive.
   */
  const showSaved = function (field: string) {
    // Update global timestamp
    setLastSavedAt(new Date());

    // Show per-card indicator
    setSavedFields(function (prev) {
      const newState = Object.assign({}, prev);
      newState[field] = true;
      return newState;
    });
    setTimeout(function () {
      setSavedFields(function (prev) {
        const newState = Object.assign({}, prev);
        newState[field] = false;
        return newState;
      });
    }, 2000);
  };

  const handleThemeChange = function (theme: ThemePreference) {
    updatePreferences({ theme: theme });
    showSaved('preferences');
  };

  const handleSeriesToggle = function (series: string) {
    const current = profile.goals.targetSeries;
    const updated: string[] = [];
    let found = false;
    for (let i = 0; i < current.length; i++) {
      if (current[i] === series) {
        found = true;
      } else {
        updated.push(current[i]);
      }
    }
    if (!found) {
      updated.push(series);
    }
    updateGoals({ targetSeries: updated });
    showSaved('targetSeries');
  };

  const handlePriorityToggle = function (priority: string) {
    const current = profile.preferences.priorities;
    const updated: string[] = [];
    let found = false;
    for (let i = 0; i < current.length; i++) {
      if (current[i] === priority) {
        found = true;
      } else {
        updated.push(current[i]);
      }
    }
    if (!found) {
      updated.push(priority);
    }
    updatePreferences({ priorities: updated });
    showSaved('priorities');
  };

  const handleLocationTagAdd = function (location: string) {
    const trimmed = location.trim();
    if (trimmed && profile.location.preferredLocations.indexOf(trimmed) < 0) {
      const newLocations = profile.location.preferredLocations.slice();
      newLocations.push(trimmed);
      updateLocation({ preferredLocations: newLocations });
      showSaved('preferredLocations');
    }
  };

  const handleLocationTagRemove = function (location: string) {
    const newLocations: string[] = [];
    for (let i = 0; i < profile.location.preferredLocations.length; i++) {
      if (profile.location.preferredLocations[i] !== location) {
        newLocations.push(profile.location.preferredLocations[i]);
      }
    }
    updateLocation({ preferredLocations: newLocations });
    showSaved('preferredLocations');
  };

  /**
   * Filter series options based on search query.
   * Matches against both the series name and code.
   */
  const filteredSeriesOptions = seriesOptions.filter(function (series) {
    if (seriesSearch.trim().length === 0) {
      return true;
    }
    const searchLower = seriesSearch.toLowerCase();
    return series.toLowerCase().indexOf(searchLower) >= 0;
  });

  const handleAvatarChange = function (event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    const file = files && files.length > 0 ? files[0] : null;
    if (!file) return;

    // Validate file type
    if (file.type.indexOf('image/') !== 0) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file (PNG, JPG, GIF, etc.)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: 'Please select an image under 5MB',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = function () {
      const result = reader.result;
      if (typeof result === 'string') {
        setAvatarUrl(result);
        toast({
          title: 'Photo updated',
          description: 'Your profile photo has been changed.',
        });
      }
    };
    reader.onerror = function () {
      toast({
        title: 'Upload failed',
        description: 'Failed to read the image file. Please try again.',
        variant: 'destructive',
      });
    };
    reader.readAsDataURL(file);

    // Reset input so the same file can be selected again
    event.target.value = '';
  };

  const handleRemoveAvatar = function () {
    clearAvatar();
    toast({
      title: 'Photo removed',
      description: 'Your profile photo has been removed.',
    });
  };

  const getStatusSummary = function () {
    if (profile.persona === 'federal_employee' && profile.current) {
      const grade = profile.current.grade || '';
      const series = profile.current.series || 'IT Specialist';
      const dutyLocation = profile.current.dutyLocation || 'Washington, DC';
      return grade + ' · ' + series + ' · ' + dutyLocation;
    }
    const targetFrom = profile.goals.targetGradeFrom || '';
    const targetTo = profile.goals.targetGradeTo || '';
    const metroArea = profile.location.currentMetroArea || 'Location not set';
    return 'Aspiring ' + targetFrom + '–' + targetTo + ' · ' + metroArea;
  };

  const handleDeleteAllLocalData = function () {
    deleteAllLocalData();
    setShowDeleteConfirm(false);
    setDeleteConfirmText('');
    toast({
      title: 'All local data deleted',
      description: 'Your PathOS data has been erased from this device.',
    });
  };

  // Compute initials
  let initials = '?';
  if (profile.name) {
    initials = profile.name
      .split(' ')
      .map(function (n) {
        return n[0];
      })
      .join('')
      .toUpperCase();
  }

  /**
   * Format time for "Saved at" display.
   * Shows just the time (e.g., "2:34 PM") since it's always recent.
   */
  const formatSavedTime = function (date: Date): string {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <PageShell fullWidth>
      <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
        {/* ============================================================
            PAGE HEADER
            ============================================================
            Shows title, description, persona badge, and global saved indicator.
            The saved indicator provides quiet feedback that changes persist.
        ============================================================ */}
        {/* data-tour anchors are used by GuidedTourOverlay for stable spotlight targeting */}
        <div data-tour="settings-entry" className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-foreground">Profile & Settings</h1>
                {/* Global saved indicator */}
                {lastSavedAt && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Check className="w-3 h-3 text-accent" />
                    Saved at {formatSavedTime(lastSavedAt)}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground max-w-2xl mt-2">
                Manage your personal details, career goals, and preferences so PathOS can give more
                accurate guidance.
              </p>
              <p className="text-xs text-muted-foreground/70 mt-2 flex items-center gap-1.5">
                <Shield className="w-3 h-3" />
                All data stays on this device. Nothing is uploaded to the cloud.
              </p>
            </div>
            <Badge
              variant="outline"
              className={cn(
                'flex items-center gap-1.5 flex-shrink-0',
                profile.persona === 'job_seeker'
                  ? 'border-blue-500/50 text-blue-400'
                  : 'border-accent/50 text-accent',
              )}
            >
              {profile.persona === 'job_seeker' ? 'Job Seeker' : 'Federal Employee'}
            </Badge>
          </div>
        </div>

        {/* ============================================================
            SETUP CHECKLIST
            ============================================================
            Shows profile completion progress and guides users to
            complete high-leverage items that unlock better results.
        ============================================================ */}
        <SetupChecklistCard scrollToSection={scrollToSection} />

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Left Column - Profile Summary */}
          <div className="lg:self-start space-y-4">
            {/* data-tour anchors are used by GuidedTourOverlay for stable spotlight targeting */}
            <Card data-tour="persona-switch" className="border-accent/30">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-16 w-16">
                      <AvatarImage
                        src={profile.avatarUrl || undefined}
                        alt={profile.name || 'User avatar'}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-accent/20 text-accent text-xl font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div>
                    <CardTitle className="text-lg">{profile.name || 'Your Name'}</CardTitle>
                    <Badge
                      variant="secondary"
                      className={cn(
                        'mt-1 text-xs',
                        profile.persona === 'job_seeker'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-accent/20 text-accent',
                      )}
                    >
                      {profile.persona === 'job_seeker' ? 'Job Seeker' : 'Federal Employee'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground hover:text-foreground"
                      onClick={function () {
                        if (avatarInputRef.current) {
                          avatarInputRef.current.click();
                        }
                      }}
                    >
                      <Camera className="w-3.5 h-3.5 mr-1.5" />
                      Change photo
                    </Button>
                    {profile.avatarUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground hover:text-destructive"
                        onClick={handleRemoveAvatar}
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground/70">
                    Profile photos are used only inside this dashboard.
                  </p>
                  {/* Hidden file input */}
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>

                <p className="text-sm text-muted-foreground">{getStatusSummary()}</p>

                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <Target className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">
                      {profile.goals.targetSeries.length > 0
                        ? profile.goals.targetSeries.slice(0, 2).join(', ')
                        : 'Target series not set'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">
                      {profile.location.preferredLocations.length > 0
                        ? profile.location.preferredLocations.slice(0, 2).join(', ')
                        : 'Locations not set'}
                    </span>
                  </div>
                </div>

                {/* ============================================================
                    QUICK JUMP LINKS
                    ============================================================
                    Instead of a single "Edit profile" button, we provide
                    specific links to each section. This is clearer and
                    more actionable.
                ============================================================ */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground mb-2">Quick links:</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-8 text-xs text-muted-foreground hover:text-foreground"
                    onClick={function () { scrollToSection('identity'); }}
                  >
                    <User className="w-3.5 h-3.5 mr-2" />
                    Identity & Role
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-8 text-xs text-muted-foreground hover:text-foreground"
                    onClick={function () { scrollToSection('goals'); }}
                  >
                    <Target className="w-3.5 h-3.5 mr-2" />
                    Career Goals
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-8 text-xs text-muted-foreground hover:text-foreground"
                    onClick={function () { scrollToSection('location'); }}
                  >
                    <MapPin className="w-3.5 h-3.5 mr-2" />
                    Location & Mobility
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* ============================================================
                TROUBLESHOOTING / RESET AREA
                ============================================================
                Moved "Re-run onboarding wizard" here so it's not a primary
                action. This is for users who need to start over or fix
                issues, not the main workflow.
            ============================================================ */}
            <Card className="border-muted-foreground/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Troubleshooting</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-8 text-xs text-muted-foreground hover:text-foreground"
                  onClick={function () { setShowOnboarding(true); }}
                >
                  <RefreshCcw className="w-3.5 h-3.5 mr-2" />
                  Re-run onboarding wizard
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Editable Sections */}
          <div className="space-y-4">
            {/* Section 1: Identity & Persona */}
            <Card ref={identityRef}>
              <Collapsible
                open={expandedSections.identity}
                onOpenChange={function (open) {
                  setExpandedSections(function (prev) {
                    return { ...prev, identity: open };
                  });
                }}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                          <User className="w-4 h-4 text-accent" />
                        </div>
                        <div>
                          <CardTitle className="text-base">Identity & Role</CardTitle>
                          <CardDescription className="text-xs">
                            Tell PathOS who you are so we can tailor guidance
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <SavedIndicator show={savedFields.identity || false} />
                        {/* ============================================================
                            CARD VISIBILITY CONTROL WITH TOOLTIP
                            ============================================================
                            The eye icon controls whether this card's data is visible.
                            Added explicit label and tooltip explaining this is local-only.
                        ============================================================ */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={function (e) {
                                  e.stopPropagation();
                                  identityVisibility.toggle();
                                }}
                                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                              >
                                {identityVisibility.visible ? (
                                  <Eye className="w-3 h-3" />
                                ) : (
                                  <EyeOff className="w-3 h-3" />
                                )}
                                <span className="hidden sm:inline">
                                  {identityVisibility.visible ? 'Visible' : 'Hidden'}
                                </span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{identityVisibility.visible ? 'Click to hide this card' : 'Click to show this card'}</p>
                              <p className="text-xs opacity-80 mt-1">Local setting on this device only</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {expandedSections.identity ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-0">
                    {!identityVisibility.visible ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <EyeOff className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="mb-4">This card is hidden.</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={function () {
                            identityVisibility.setVisible(true);
                          }}
                        >
                          Show this card
                        </Button>
                      </div>
                    ) : (
                      <>
                    <div className="space-y-2">
                      <Label htmlFor="name">Full name</Label>
                      <Input
                        id="name"
                        value={profile.name}
                        onChange={function (e) {
                          updateProfile({ name: e.target.value });
                          showSaved('identity');
                        }}
                        placeholder="Enter your name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Persona type</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={function () {
                            updateProfile({ persona: 'job_seeker' });
                            showSaved('identity');
                          }}
                          className={cn(
                            'p-3 rounded-lg border-2 text-left transition-colors',
                            profile.persona === 'job_seeker'
                              ? 'border-accent bg-accent/10'
                              : 'border-muted-foreground/20 hover:border-muted-foreground/40',
                          )}
                        >
                          <p className="font-medium text-sm text-foreground">Job Seeker</p>
                          <p className="text-xs text-muted-foreground">
                            Looking for federal positions
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={function () {
                            updateProfile({ persona: 'federal_employee' });
                            showSaved('identity');
                          }}
                          className={cn(
                            'p-3 rounded-lg border-2 text-left transition-colors',
                            profile.persona === 'federal_employee'
                              ? 'border-accent bg-accent/10'
                              : 'border-muted-foreground/20 hover:border-muted-foreground/40',
                          )}
                        >
                          <p className="font-medium text-sm text-foreground">Federal Employee</p>
                          <p className="text-xs text-muted-foreground">Currently in government</p>
                        </button>
                      </div>
                    </div>

                    {profile.persona === 'job_seeker' ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Highest education</Label>
                          <Select
                            value={(profile.jobSeeker && profile.jobSeeker.highestEducation) || 'bachelor'}
                            onValueChange={function (v) {
                              updateJobSeeker({ highestEducation: v as EducationLevel });
                              showSaved('identity');
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {educationOptions.map(function (opt) {
                                return (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Years of experience</Label>
                          <Input
                            type="number"
                            min="0"
                            value={(profile.jobSeeker && profile.jobSeeker.yearsOfExperience) || 0}
                            onChange={function (e) {
                              updateJobSeeker({
                                yearsOfExperience: parseInt(e.target.value, 10) || 0,
                              });
                              showSaved('identity');
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Agency</Label>
                            <Input
                              value={(profile.current && profile.current.agency) || ''}
                              onChange={function (e) {
                                updateCurrent({ agency: e.target.value });
                                showSaved('identity');
                              }}
                              placeholder="e.g., USDA"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Current series</Label>
                            <Input
                              value={(profile.current && profile.current.series) || ''}
                              onChange={function (e) {
                                updateCurrent({ series: e.target.value });
                                showSaved('identity');
                              }}
                              placeholder="e.g., 2210"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Grade</Label>
                            <Select
                              value={(profile.current && profile.current.grade) || 'GS-9'}
                              onValueChange={function (v) {
                                updateCurrent({ grade: v });
                                showSaved('identity');
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {gradeOptions.map(function (g) {
                                  return (
                                    <SelectItem key={g} value={g}>
                                      {g}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Step</Label>
                            <Select
                              value={(profile.current && profile.current.step) || '1'}
                              onValueChange={function (v) {
                                updateCurrent({ step: v });
                                showSaved('identity');
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {stepOptions.map(function (s) {
                                  return (
                                    <SelectItem key={s} value={s}>
                                      {s}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Duty location</Label>
                            <Input
                              value={(profile.current && profile.current.dutyLocation) || ''}
                              onChange={function (e) {
                                updateCurrent({ dutyLocation: e.target.value });
                                showSaved('identity');
                              }}
                              placeholder="City, State"
                            />
                          </div>
                        </div>
                      </div>
                          )}
                        </>
                      )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Section 2: Career Goals */}
            <Card ref={goalsRef}>
              <Collapsible
                open={expandedSections.goals}
                onOpenChange={function (open) {
                  setExpandedSections(function (prev) {
                    return { ...prev, goals: open };
                  });
                }}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                          <Target className="w-4 h-4 text-accent" />
                        </div>
                        <div>
                          <CardTitle className="text-base">Career Goals</CardTitle>
                          <CardDescription className="text-xs">
                            Set your target roles and time horizon
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <SavedIndicator
                          show={savedFields.targetSeries || savedFields.goals || false}
                        />
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={function (e) {
                                  e.stopPropagation();
                                  goalsVisibility.toggle();
                                }}
                                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                              >
                                {goalsVisibility.visible ? (
                                  <Eye className="w-3 h-3" />
                                ) : (
                                  <EyeOff className="w-3 h-3" />
                                )}
                                <span className="hidden sm:inline">
                                  {goalsVisibility.visible ? 'Visible' : 'Hidden'}
                                </span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{goalsVisibility.visible ? 'Click to hide this card' : 'Click to show this card'}</p>
                              <p className="text-xs opacity-80 mt-1">Local setting on this device only</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {expandedSections.goals ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-0">
                    {!goalsVisibility.visible ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <EyeOff className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="mb-4">This card is hidden.</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={function () {
                            goalsVisibility.setVisible(true);
                          }}
                        >
                          Show this card
                        </Button>
                      </div>
                    ) : (
                      <>
                    {/* ============================================================
                        TARGET SERIES SELECTION WITH SEARCH
                        ============================================================
                        Improved UX: Instead of scanning a long static chip list,
                        users can now search by series code or name.
                    ============================================================ */}
                    <div className="space-y-2">
                      <Label>Target series or fields</Label>
                      {/* Search input */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          ref={seriesSearchInputRef}
                          placeholder="Search by code (e.g., 2210) or name..."
                          value={seriesSearch}
                          onChange={function (e) { setSeriesSearch(e.target.value); }}
                          className="pl-9 text-sm"
                        />
                        {seriesSearch.length > 0 && (
                          <button
                            type="button"
                            onClick={function () { setSeriesSearch(''); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {/* Selected series count */}
                      {profile.goals.targetSeries.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {profile.goals.targetSeries.length} selected
                        </p>
                      )}
                      {/* Series chips */}
                      <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto">
                        {filteredSeriesOptions.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-2">
                            No series found matching &quot;{seriesSearch}&quot;
                          </p>
                        ) : (
                          filteredSeriesOptions.map(function (series) {
                            return (
                              <button
                                key={series}
                                type="button"
                                onClick={function () { handleSeriesToggle(series); }}
                                className={cn(
                                  'px-3 py-1.5 rounded-full text-sm border transition-colors',
                                  profile.goals.targetSeries.indexOf(series) >= 0
                                    ? 'bg-accent text-accent-foreground border-accent'
                                    : 'border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50',
                                )}
                              >
                                {series}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Target grade from</Label>
                        {/* Convert null to undefined for Select compatibility */}
                        <Select
                          value={profile.goals.targetGradeFrom ?? undefined}
                          onValueChange={function (v) {
                            updateGoals({ targetGradeFrom: v });
                            showSaved('goals');
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {gradeOptions.map(function (g) {
                              return (
                                <SelectItem key={g} value={g}>
                                  {g}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Target grade to</Label>
                        {/* Convert null to undefined for Select compatibility */}
                        <Select
                          value={profile.goals.targetGradeTo ?? undefined}
                          onValueChange={function (v) {
                            updateGoals({ targetGradeTo: v });
                            showSaved('goals');
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {gradeOptions.map(function (g) {
                              return (
                                <SelectItem key={g} value={g}>
                                  {g}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Goal time horizon</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {timeHorizonOptions.map(function (opt) {
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={function () {
                                updateGoals({ goalTimeHorizon: opt.value });
                                showSaved('goals');
                              }}
                              className={cn(
                                'py-2 px-3 rounded-lg border text-sm transition-colors',
                                profile.goals.goalTimeHorizon === opt.value
                                  ? 'bg-accent text-accent-foreground border-accent'
                                  : 'border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50',
                              )}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nextMove">What is your next big career move?</Label>
                      <Textarea
                        id="nextMove"
                        value={profile.goals.nextCareerMove}
                        onChange={function (e) {
                          updateGoals({ nextCareerMove: e.target.value });
                          showSaved('goals');
                        }}
                        placeholder="e.g., I want to move from GS-11 to GS-13 in policy analysis."
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">
                        Used for: Job Search matches, promotion readiness, and PathAdvisor
                        recommendations.
                      </p>
                    </div>
                      </>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Section 3: Location & Mobility */}
            <Card ref={locationRef}>
              <Collapsible
                open={expandedSections.location}
                onOpenChange={function (open) {
                  setExpandedSections(function (prev) {
                    return { ...prev, location: open };
                  });
                }}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                          <MapPin className="w-4 h-4 text-accent" />
                        </div>
                        <div>
                          <CardTitle className="text-base">Location & Mobility</CardTitle>
                          <CardDescription className="text-xs">
                            Where you are now and where you are open to working
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <SavedIndicator
                          show={savedFields.preferredLocations || savedFields.location || false}
                        />
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={function (e) {
                                  e.stopPropagation();
                                  locationVisibility.toggle();
                                }}
                                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                              >
                                {locationVisibility.visible ? (
                                  <Eye className="w-3 h-3" />
                                ) : (
                                  <EyeOff className="w-3 h-3" />
                                )}
                                <span className="hidden sm:inline">
                                  {locationVisibility.visible ? 'Visible' : 'Hidden'}
                                </span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{locationVisibility.visible ? 'Click to hide this card' : 'Click to show this card'}</p>
                              <p className="text-xs opacity-80 mt-1">Local setting on this device only</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {expandedSections.location ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-0">
                    {!locationVisibility.visible ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <EyeOff className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="mb-4">This card is hidden.</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={function () {
                            locationVisibility.setVisible(true);
                          }}
                        >
                          Show this card
                        </Button>
                      </div>
                    ) : (
                      <>
                    <div className="space-y-2">
                      <Label htmlFor="metro-area">Current metro area</Label>
                      <Input
                        id="metro-area"
                        ref={metroAreaInputRef}
                        value={profile.location.currentMetroArea}
                        onChange={function (e) {
                          updateLocation({ currentMetroArea: e.target.value });
                          showSaved('location');
                        }}
                        placeholder="e.g., Washington, DC Metro"
                      />
                      <p className="text-xs text-muted-foreground">
                        Used for: locality pay calculations and nearby job filtering.
                      </p>
                    </div>

                    {/* ============================================================
                        WILLINGNESS TO RELOCATE WITH TOOLTIP
                        ============================================================
                        Added "No preference" option and CONUS/OCONUS explanation.
                        The tooltip clarifies federal jargon at point of use.
                    ============================================================ */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label>Willingness to relocate</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground hover:text-foreground">
                                <HelpCircle className="w-4 h-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="font-medium mb-1">Location terms:</p>
                              <p><strong>CONUS</strong> = Continental US (48 contiguous states)</p>
                              <p><strong>OCONUS</strong> = Outside CONUS (Alaska, Hawaii, Puerto Rico, overseas)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                        {relocationOptions.map(function (opt) {
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={function () {
                                updateLocation({ relocationWillingness: opt.value });
                                showSaved('location');
                              }}
                              className={cn(
                                'py-2 px-3 rounded-lg border text-xs transition-colors text-left',
                                profile.location.relocationWillingness === opt.value
                                  ? 'bg-accent text-accent-foreground border-accent'
                                  : 'border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50',
                              )}
                            >
                              <span className="font-medium block">{opt.label}</span>
                              {opt.description && (
                                <span className="text-[10px] opacity-80 block mt-0.5">{opt.description}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Preferred locations</Label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {profile.location.preferredLocations.map(function (loc) {
                          return (
                            <span
                              key={loc}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-muted text-foreground"
                            >
                              {loc}
                              <button
                                type="button"
                                onClick={function () { handleLocationTagRemove(loc); }}
                                className="hover:text-destructive"
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                      </div>
                      <Input
                        placeholder="Type a city and press Enter"
                        onKeyDown={function (e) {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const target = e.target as HTMLInputElement;
                            handleLocationTagAdd(target.value);
                            target.value = '';
                          }
                        }}
                      />
                    </div>

                    {/* ============================================================
                        WORK ARRANGEMENT WITH "NO PREFERENCE"
                        ============================================================
                        Added "No preference" option so users can explicitly opt out
                        of filtering by work arrangement, rather than being forced
                        to pick an option they don't care about.
                    ============================================================ */}
                    <div className="space-y-2">
                      <Label>Work arrangement preference</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {workArrangementOptions.map(function (opt) {
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={function () {
                                updateLocation({ workArrangement: opt.value });
                                showSaved('location');
                              }}
                              className={cn(
                                'py-2 px-3 rounded-lg border text-sm transition-colors',
                                profile.location.workArrangement === opt.value
                                  ? 'bg-accent text-accent-foreground border-accent'
                                  : 'border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50',
                              )}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        &quot;No preference&quot; shows all positions regardless of telework policy.
                      </p>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Used for: Location & COL insights and default Job Search filters.
                    </p>
                      </>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Section 4: Benefits & Money */}
            <Card ref={benefitsRef}>
              <Collapsible
                open={expandedSections.benefits}
                onOpenChange={function (open) {
                  setExpandedSections(function (prev) {
                    return { ...prev, benefits: open };
                  });
                }}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                          <DollarSign className="w-4 h-4 text-accent" />
                        </div>
                        <div>
                          <CardTitle className="text-base">Benefits & Money</CardTitle>
                          <CardDescription className="text-xs">
                            Help estimate compensation and FEHB scenarios
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <SavedIndicator show={savedFields.benefits || false} />
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={function (e) {
                                  e.stopPropagation();
                                  benefitsVisibility.toggle();
                                }}
                                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                              >
                                {benefitsVisibility.visible ? (
                                  <Eye className="w-3 h-3" />
                                ) : (
                                  <EyeOff className="w-3 h-3" />
                                )}
                                <span className="hidden sm:inline">
                                  {benefitsVisibility.visible ? 'Visible' : 'Hidden'}
                                </span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{benefitsVisibility.visible ? 'Click to hide this card' : 'Click to show this card'}</p>
                              <p className="text-xs opacity-80 mt-1">Local setting on this device only</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {expandedSections.benefits ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-0">
                    {!benefitsVisibility.visible ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <EyeOff className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="mb-4">This card is hidden.</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={function () {
                            benefitsVisibility.setVisible(true);
                          }}
                        >
                          Show this card
                        </Button>
                      </div>
                    ) : (
                      <>
                    <div className="space-y-2">
                      <Label>Household coverage needs</Label>
                      <Select
                        value={profile.benefits.householdCoverage}
                        onValueChange={function (v: 'self_only' | 'self_plus_one' | 'family') {
                          updateBenefits({ householdCoverage: v });
                          showSaved('benefits');
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="self_only">Self only</SelectItem>
                          <SelectItem value="self_plus_one">Self + one</SelectItem>
                          <SelectItem value="family">Family</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>
                        Target TSP contribution rate: {profile.benefits.targetTspContribution}%
                      </Label>
                      <Slider
                        value={[profile.benefits.targetTspContribution]}
                        onValueChange={function (values) {
                          updateBenefits({ targetTspContribution: values[0] });
                          showSaved('benefits');
                        }}
                        min={0}
                        max={25}
                        step={1}
                      />
                      <p className="text-xs text-muted-foreground">
                        5% minimum to get full agency match
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Comfort with financial risk</Label>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>More security</span>
                        <span>More growth</span>
                      </div>
                      <Slider
                        value={[profile.benefits.riskComfort]}
                        onValueChange={function (values) {
                          updateBenefits({ riskComfort: values[0] });
                          showSaved('benefits');
                        }}
                        min={1}
                        max={5}
                        step={1}
                      />
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Used for: Total compensation estimates, FEHB insights, and PathAdvisor
                      trade-off explanations.
                    </p>
                      </>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Section 5: Preferences & Privacy */}
            <Card ref={preferencesRef}>
              <Collapsible
                open={expandedSections.preferences}
                onOpenChange={function (open) {
                  setExpandedSections(function (prev) {
                    return { ...prev, preferences: open };
                  });
                }}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                          <Settings className="w-4 h-4 text-accent" />
                        </div>
                        <div>
                          <CardTitle className="text-base">Preferences & Privacy</CardTitle>
                          <CardDescription className="text-xs">
                            Control how PathOS talks to you and data visibility
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <SavedIndicator
                          show={savedFields.priorities || savedFields.preferences || false}
                        />
                        {expandedSections.preferences ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-0">
                    <div className="space-y-2">
                      <Label>What matters most right now?</Label>
                      <div className="flex flex-wrap gap-2">
                        {priorityOptions.map(function (priority) {
                          return (
                            <button
                              key={priority}
                              type="button"
                              onClick={function () { handlePriorityToggle(priority); }}
                              className={cn(
                                'px-3 py-1.5 rounded-full text-sm border transition-colors',
                                profile.preferences.priorities.indexOf(priority) >= 0
                                  ? 'bg-accent text-accent-foreground border-accent'
                                  : 'border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50',
                              )}
                            >
                              {priority}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>PathAdvisor tone</Label>
                      <Select
                        value={profile.preferences.advisorTone}
                        onValueChange={function (v: AdvisorTone) {
                          updatePreferences({ advisorTone: v });
                          showSaved('preferences');
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="straight_to_point">Straight to the point</SelectItem>
                          <SelectItem value="more_context">More context and teaching</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* ---------------------------------------------------------------
                        PathAdvisor dock position selector
                        ---------------------------------------------------------------
                        WHY: Allows user to choose left or right dock placement.
                        NOTE: 'bottom' position was removed (Day 17) as it wasn't
                        well-supported in the layout. Any prior 'bottom' preference
                        is auto-normalized to 'right' on load (see profile-context).
                        --------------------------------------------------------------- */}
                    <div className="space-y-2 pt-4 border-t border-border/50">
                      <Label>PathAdvisor position</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Choose where PathAdvisor appears on your screen
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={function () {
                            updatePreferences({ pathAdvisorDock: 'left' });
                            showSaved('preferences');
                          }}
                          className={cn(
                            'py-2 px-3 rounded-lg border text-sm transition-colors flex items-center justify-center gap-2',
                            profile.preferences.pathAdvisorDock === 'left'
                              ? 'bg-accent text-accent-foreground border-accent'
                              : 'border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50',
                          )}
                        >
                          <PanelLeft className="w-4 h-4" />
                          Left
                        </button>
                        <button
                          type="button"
                          onClick={function () {
                            updatePreferences({ pathAdvisorDock: 'right' });
                            showSaved('preferences');
                          }}
                          className={cn(
                            'py-2 px-3 rounded-lg border text-sm transition-colors flex items-center justify-center gap-2',
                            (profile.preferences.pathAdvisorDock || 'right') === 'right'
                              ? 'bg-accent text-accent-foreground border-accent'
                              : 'border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50',
                          )}
                        >
                          <PanelRight className="w-4 h-4" />
                          Right
                        </button>
                      </div>
                    </div>

                    {/* Theme Selection */}
                    <div className="space-y-2 pt-4 border-t border-border/50">
                      <Label>App theme</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={function () { handleThemeChange('system'); }}
                          className={cn(
                            'py-2 px-3 rounded-lg border text-sm transition-colors flex items-center justify-center gap-2',
                            profile.preferences.theme === 'system'
                              ? 'bg-accent text-accent-foreground border-accent'
                              : 'border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50',
                          )}
                        >
                          <Monitor className="w-4 h-4" />
                          System
                        </button>
                        <button
                          type="button"
                          onClick={function () { handleThemeChange('light'); }}
                          className={cn(
                            'py-2 px-3 rounded-lg border text-sm transition-colors flex items-center justify-center gap-2',
                            profile.preferences.theme === 'light'
                              ? 'bg-accent text-accent-foreground border-accent'
                              : 'border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50',
                          )}
                        >
                          <Sun className="w-4 h-4" />
                          Light
                        </button>
                        <button
                          type="button"
                          onClick={function () { handleThemeChange('dark'); }}
                          className={cn(
                            'py-2 px-3 rounded-lg border text-sm transition-colors flex items-center justify-center gap-2',
                            profile.preferences.theme === 'dark'
                              ? 'bg-accent text-accent-foreground border-accent'
                              : 'border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50',
                          )}
                        >
                          <Moon className="w-4 h-4" />
                          Dark
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg border border-muted-foreground/20">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Global privacy mode</Label>
                        <p className="text-xs text-muted-foreground">
                          Hide sensitive values like salaries and benefits by default
                        </p>
                      </div>
                      <Switch
                        checked={globalHide}
                        onCheckedChange={function (checked) {
                          setGlobalHide(checked);
                          showSaved('preferences');
                        }}
                      />
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {globalHide ? (
                        <>
                          <EyeOff className="w-4 h-4" />
                          <span>Privacy mode is ON - sensitive values are hidden</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          <span>Privacy mode is OFF - all values are visible</span>
                        </>
                      )}
                    </div>

                    <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
                      This setting only controls what is displayed on screen. All your data
                      remains stored locally in your browser and is never sent to a server.
                    </p>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Section 6: Privacy & Security */}
            <Card className="border-destructive/30">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-destructive/20 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-destructive" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Privacy & Security</CardTitle>
                    <CardDescription className="text-xs">
                      Your data stays on this device, and nothing is stored on a server.
                    </CardDescription>

                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Restart onboarding (Day 36) */}
                <div className="p-4 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-start gap-3">
                    <RefreshCcw className="w-5 h-5 text-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 space-y-3">
                      <div>
                        <h4 className="font-medium text-sm text-foreground">Restart onboarding</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Re-enter onboarding mode to update your profile information. This will guide you through the
                          onboarding process again on the dashboard.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={function () {
                          restartOnboarding();
                          router.push('/dashboard');
                        }}
                      >
                        <RefreshCcw className="w-4 h-4 mr-2" />
                        Restart onboarding
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Replay guided tour (Day 36) */}
                <div className="p-4 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-start gap-3">
                    <HelpCircle className="w-5 h-5 text-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 space-y-3">
                      <div>
                        <h4 className="font-medium text-sm text-foreground">Replay guided tour</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Take a quick 60-second tour of the dashboard to learn about key features and areas. You can replay this anytime.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={function () {
                          startTour();
                          router.push('/dashboard');
                        }}
                      >
                        <HelpCircle className="w-4 h-4 mr-2" />
                        Replay guided tour
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                  <div className="flex items-start gap-3">
                    <Trash2 className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                    <div className="flex-1 space-y-3">
                      <div>
                        <h4 className="font-medium text-sm text-foreground">Delete all local data</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Erase all PathOS data stored in your browser on this device, including
                          your profile, scenarios, and job search preferences. Because your data is not
                          stored on a server, this action only affects this device and cannot be undone.
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={function () { setShowDeleteConfirm(true); }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete all data on this device
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ============================================================
            DELETE CONFIRMATION DIALOG (STRENGTHENED)
            ============================================================
            Requires typing "DELETE" to confirm, preventing accidental
            data loss. Lists exactly what will be deleted and explains
            the local-only nature of the data.
        ============================================================ */}
        <Dialog
          open={showDeleteConfirm}
          onOpenChange={function (open) {
            setShowDeleteConfirm(open);
            // Clear confirmation text when dialog closes
            if (!open) {
              setDeleteConfirmText('');
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Delete all local data?
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-3 pt-2">
                  <p>This will permanently erase the following from this device:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Your profile (name, persona, current position)</li>
                    <li>Career goals and preferences</li>
                    <li>Saved job searches and alerts</li>
                    <li>Saved jobs and filter settings</li>
                    <li>Resume builder progress</li>
                    <li>Benefits assumptions</li>
                    <li>Card visibility settings</li>
                  </ul>
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm">
                    <p className="font-medium text-foreground">Cannot be undone</p>
                    <p className="text-muted-foreground mt-1">
                      Because nothing is stored on a server, there is no way to recover this data.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Label htmlFor="delete-confirm" className="text-sm">
                      Type <span className="font-mono font-bold text-destructive">DELETE</span> to confirm:
                    </Label>
                    <Input
                      id="delete-confirm"
                      value={deleteConfirmText}
                      onChange={function (e) { setDeleteConfirmText(e.target.value); }}
                      placeholder="Type DELETE"
                      className="mt-2 font-mono"
                      autoComplete="off"
                    />
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={function () {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAllLocalData}
                disabled={deleteConfirmText !== 'DELETE'}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Yes, delete everything
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Onboarding Wizard */}
        <OnboardingWizard open={showOnboarding} onOpenChange={setShowOnboarding} />
      </div>
    </PageShell>
  );
}
