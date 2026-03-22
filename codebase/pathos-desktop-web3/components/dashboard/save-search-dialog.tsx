/**
 * ============================================================================
 * SAVE SEARCH DIALOG
 * ============================================================================
 *
 * FILE PURPOSE:
 * This dialog allows users to save their current job search filters as a
 * named "saved search" for quick access later. It also allows configuring
 * job alerts for the saved search.
 *
 * WHERE IT FITS IN ARCHITECTURE:
 * UI Component → calls store actions → store persists to localStorage
 *
 * KEY FEATURES:
 * 1. Name the saved search
 * 2. Optionally set as default (loads on app start)
 * 3. Configure job alerts (frequency, match threshold, channel)
 *
 * @version Day 11 - Job Search Filters & Saved Searches v1
 * ============================================================================
 */

'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useJobSearchStore, type JobAlertConfig } from '@/store/jobSearchStore';
import { toast } from '@/hooks/use-toast';

interface SaveSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaveSearchDialog(props: SaveSearchDialogProps) {
  const open = props.open;
  const onOpenChange = props.onOpenChange;

  const jobSearchFilters = useJobSearchStore(function (state) {
    return state.jobSearchFilters;
  });
  const addSavedJobSearch = useJobSearchStore(function (state) {
    return state.addSavedJobSearch;
  });
  const setJobSearchDefaults = useJobSearchStore(function (state) {
    return state.setJobSearchDefaults;
  });

  const [newSearchName, setNewSearchName] = useState('');
  const [makeDefault, setMakeDefault] = useState(false);
  const [enableAlerts, setEnableAlerts] = useState(false);
  const [alertFrequency, setAlertFrequency] = useState<'daily' | 'weekly'>('weekly');
  const [alertMinMatch, setAlertMinMatch] = useState(80);
  const [alertChannel, setAlertChannel] = useState<'in-app' | 'email'>('in-app');

  /**
   * Handler: Save the current search.
   *
   * HOW IT WORKS:
   * 1. Build the alerts configuration
   * 2. Add the saved search to the store
   * 3. If set as default, also update defaults
   * 4. Show toast notification
   * 5. Reset form and close dialog
   */
  const handleSave = function () {
    // Build alerts config based on form state
    let alerts: JobAlertConfig;
    if (enableAlerts) {
      alerts = {
        enabled: true,
        frequency: alertFrequency,
        minMatch: alertMinMatch,
        channel: alertChannel,
      };
    } else {
      alerts = {
        enabled: false,
        frequency: 'off',
        minMatch: 80,
        channel: 'in-app',
      };
    }

    // Get the search name (or default)
    const searchName = newSearchName || 'Saved search';

    // Add to store
    addSavedJobSearch({
      name: searchName,
      filters: jobSearchFilters,
      isDefault: makeDefault,
      alerts: alerts,
    });

    // Update defaults if requested
    if (makeDefault) {
      setJobSearchDefaults(jobSearchFilters);
    }

    // Show success toast
    toast({
      title: 'Search saved',
      description: '"' + searchName + '" has been saved to your searches.' +
        (makeDefault ? ' It will be your default on next visit.' : ''),
    });

    // Reset form
    setNewSearchName('');
    setMakeDefault(false);
    setEnableAlerts(false);
    setAlertFrequency('weekly');
    setAlertMinMatch(80);
    setAlertChannel('in-app');

    // Close dialog
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle>Save current search</DialogTitle>
          <DialogDescription>
            Save your current filters and query as a reusable search.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={newSearchName}
              onChange={function (e) { setNewSearchName(e.target.value); }}
              placeholder="e.g. DC GS-13 Analyst roles"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <Checkbox
              checked={makeDefault}
              onCheckedChange={function (value) { setMakeDefault(Boolean(value)); }}
            />
            Set as my default job search
          </label>

          <div className="space-y-3 border-t border-border/60 pt-4 mt-4">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-1">
                <p className="text-sm font-medium">Job alerts</p>
                <p className="text-xs text-muted-foreground">
                  Track when new jobs match this search.
                </p>
              </div>
              <Switch
                checked={enableAlerts}
                onCheckedChange={function (value) { setEnableAlerts(Boolean(value)); }}
              />
            </div>

            {/* ================================================================
                ALERT SETTINGS GRID (Day 15 - Fix frequency dropdown width)
                ================================================================
                
                Added min-w-[120px] and whitespace-nowrap to the SelectTrigger
                to ensure "Daily" and "Weekly" labels never truncate.
                ================================================================ */}
            {enableAlerts && (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Frequency</label>
                  <Select
                    value={alertFrequency}
                    onValueChange={function (value) { setAlertFrequency(value as 'daily' | 'weekly'); }}
                  >
                    <SelectTrigger className="h-9 min-w-[120px] whitespace-nowrap">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">Min Match %</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-20 h-9"
                      value={alertMinMatch}
                      onChange={function (e) {
                        let val = Number(e.target.value) || 0;
                        if (val < 0) val = 0;
                        if (val > 100) val = 100;
                        setAlertMinMatch(val);
                      }}
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">Channel</label>
                  <Select
                    value={alertChannel}
                    onValueChange={function (value) { setAlertChannel(value as 'in-app' | 'email'); }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select channel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in-app">In-app only</SelectItem>
                      <SelectItem value="email">Email (future)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={function () { onOpenChange(false); }}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
