'use client';

import { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useJobSearchStore } from '@/store/jobSearchStore';

// Series data - can be expanded or fetched from API later
const SERIES_DATA = [
  {
    seriesCode: '0301',
    title: 'Miscellaneous Administration & Program',
    typicalRoles: 'Admin Officer, Program Specialist',
    commonGrades: 'GS-5–15',
    family: 'Admin',
  },
  {
    seriesCode: '0343',
    title: 'Management & Program Analysis',
    typicalRoles: 'Program Analyst, Management Analyst',
    commonGrades: 'GS-9–15',
    family: 'Analysis',
  },
  {
    seriesCode: '0560',
    title: 'Budget Analysis',
    typicalRoles: 'Budget Analyst, Budget Officer',
    commonGrades: 'GS-9–15',
    family: 'Financial',
  },
  {
    seriesCode: '0510',
    title: 'Accounting',
    typicalRoles: 'Accountant, Financial Manager',
    commonGrades: 'GS-7–15',
    family: 'Financial',
  },
  {
    seriesCode: '0201',
    title: 'Human Resources Management',
    typicalRoles: 'HR Specialist, HR Manager',
    commonGrades: 'GS-5–15',
    family: 'HR',
  },
  {
    seriesCode: '0212',
    title: 'Personnel Management',
    typicalRoles: 'Personnel Specialist, Staffing Manager',
    commonGrades: 'GS-5–14',
    family: 'HR',
  },
  {
    seriesCode: '2210',
    title: 'Information Technology Management',
    typicalRoles: 'IT Specialist, Sys Admin, DevOps',
    commonGrades: 'GS-7–14',
    family: 'IT & Cyber',
  },
  {
    seriesCode: '2220',
    title: 'Information Technology Project Management',
    typicalRoles: 'IT Project Manager, Program Manager',
    commonGrades: 'GS-12–15',
    family: 'IT & Cyber',
  },
  {
    seriesCode: '1550',
    title: 'Computer Science',
    typicalRoles: 'Computer Scientist, Software Engineer',
    commonGrades: 'GS-9–15',
    family: 'IT & Cyber',
  },
  {
    seriesCode: '0801',
    title: 'General Engineering',
    typicalRoles: 'General Engineer, Project Engineer',
    commonGrades: 'GS-5–15',
    family: 'Engineering',
  },
  {
    seriesCode: '0830',
    title: 'Mechanical Engineering',
    typicalRoles: 'Mechanical Engineer, Design Engineer',
    commonGrades: 'GS-5–15',
    family: 'Engineering',
  },
  {
    seriesCode: '0855',
    title: 'Electronics Engineering',
    typicalRoles: 'Electronics Engineer, Systems Engineer',
    commonGrades: 'GS-5–15',
    family: 'Engineering',
  },
  {
    seriesCode: '1102',
    title: 'Contracting',
    typicalRoles: 'Contract Specialist, Contracting Officer',
    commonGrades: 'GS-7–15',
    family: 'Analysis',
  },
  {
    seriesCode: '1101',
    title: 'General Business & Industry',
    typicalRoles: 'Business Specialist, Industry Analyst',
    commonGrades: 'GS-5–15',
    family: 'Analysis',
  },
  {
    seriesCode: '0132',
    title: 'Intelligence',
    typicalRoles: 'Intelligence Analyst, Intel Specialist',
    commonGrades: 'GS-7–15',
    family: 'Analysis',
  },
];

const FAMILY_OPTIONS = ['All', 'Analysis', 'IT & Cyber', 'Engineering', 'Admin', 'HR', 'Financial'];

interface SeriesGuidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SeriesGuidePanel(props: SeriesGuidePanelProps) {
  const open = props.open;
  const onOpenChange = props.onOpenChange;

  const setJobSearchFilters = useJobSearchStore(function (state) {
    return state.setJobSearchFilters;
  });
  const [seriesQuery, setSeriesQuery] = useState('');
  const [selectedFamily, setSelectedFamily] = useState('All');

  const filteredSeries = useMemo(
    function () {
      const result = [];
      for (let i = 0; i < SERIES_DATA.length; i++) {
        const row = SERIES_DATA[i];
        const matchesFamily = selectedFamily === 'All' || row.family === selectedFamily;
        const matchesQuery =
          seriesQuery === '' ||
          row.seriesCode.indexOf(seriesQuery) !== -1 ||
          row.title.toLowerCase().indexOf(seriesQuery.toLowerCase()) !== -1 ||
          row.typicalRoles.toLowerCase().indexOf(seriesQuery.toLowerCase()) !== -1;
        if (matchesFamily && matchesQuery) {
          result.push(row);
        }
      }
      return result;
    },
    [seriesQuery, selectedFamily],
  );

  const handleSelectSeries = function (seriesCode: string, title: string) {
    setJobSearchFilters({
      seriesCode: seriesCode,
      query: title,
      segment: 'federal',
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-xl p-0 flex flex-col sm:max-w-xl"
        showCloseButton={false}
      >
        <SheetHeader className="p-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <SheetTitle className="text-lg">Series & role guide</SheetTitle>
              <SheetDescription className="mt-1">
                Browse federal series codes and typical roles, then apply a series directly to your
                job search.
              </SheetDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-sm opacity-70 hover:opacity-100"
              onClick={function () {
                onOpenChange(false);
              }}
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </SheetHeader>

        <div className="px-6 space-y-3">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by series (0343) or keyword (Program Analyst, IT, HR)..."
              value={seriesQuery}
              onChange={function (e) {
                setSeriesQuery(e.target.value);
              }}
            />
          </div>

          {/* Family filter pills */}
          <div className="flex flex-wrap gap-2 text-xs">
            {FAMILY_OPTIONS.map(function (family) {
              return (
                <Button
                  key={family}
                  variant={selectedFamily === family ? 'secondary' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={function () {
                    setSelectedFamily(family);
                  }}
                >
                  {family}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Series list */}
        <div className="mt-4 mx-6 flex-1 rounded-xl border border-border bg-card overflow-hidden">
          <div className="max-h-[60vh] overflow-y-auto text-sm">
            {/* Header row */}
            <div className="grid grid-cols-[0.6fr_1.5fr_1.4fr_0.7fr] px-4 py-2 border-b border-border/60 text-xs text-muted-foreground bg-muted/50 sticky top-0">
              <span>Series</span>
              <span>Title</span>
              <span>Typical roles</span>
              <span>Common grades</span>
            </div>
            {/* Data rows */}
            {filteredSeries.length > 0 ? (
              filteredSeries.map(function (row) {
                return (
                  <button
                    key={row.seriesCode}
                    className="w-full grid grid-cols-[0.6fr_1.5fr_1.4fr_0.7fr] px-4 py-2.5 text-left hover:bg-accent/40 focus-visible:outline-none focus-visible:bg-accent/40 border-b border-border/30 last:border-b-0 transition-colors"
                    onClick={function () {
                      handleSelectSeries(row.seriesCode, row.title);
                    }}
                  >
                    <span className="font-mono text-xs text-accent">{row.seriesCode}</span>
                    <span className="font-medium text-foreground">{row.title}</span>
                    <span className="text-xs text-muted-foreground">{row.typicalRoles}</span>
                    <span className="text-xs text-muted-foreground">{row.commonGrades}</span>
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No series found matching your search.
              </div>
            )}
          </div>
        </div>

        {/* Footer hint */}
        <div className="p-6 pt-4 text-xs text-muted-foreground">
          Click a row to apply that series to your job search filters.
        </div>
      </SheetContent>
    </Sheet>
  );
}
