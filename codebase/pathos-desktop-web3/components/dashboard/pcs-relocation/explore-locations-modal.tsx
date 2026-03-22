'use client';

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CardVisibilityToggle } from '@/components/compensation/card-visibility-toggle';
import { SensitiveValue } from '@/components/sensitive-value';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  MapPin,
  Building2,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowLeft,
  Info,
  Search,
  Home,
  Train,
  TrendingUp,
  Star,
} from 'lucide-react';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';

interface ExploreLocationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LocationData {
  id: string;
  city: string;
  state: string;
  colDelta: number;
  agencies: number;
  salaryMin: number;
  salaryMax: number;
  medianRent: number;
  homeIndex: number;
  transitOptions: string;
  tags: string[];
  details: string[];
}

const SERIES_OPTIONS = [
  { code: '2210', title: 'IT Specialist' },
  { code: '0343', title: 'Management Analyst' },
  { code: '1550', title: 'Computer Science' },
  { code: '0301', title: 'Miscellaneous Admin' },
  { code: '0201', title: 'Human Resources' },
  { code: '1102', title: 'Contracting' },
  { code: '0511', title: 'Auditor' },
  { code: '0110', title: 'Economist' },
];

const GRADES = ['GS-5', 'GS-7', 'GS-9', 'GS-11', 'GS-12', 'GS-13', 'GS-14', 'GS-15'];

const REGIONS = ['Northeast', 'Southeast', 'Midwest', 'West', 'Overseas / OCONUS'];

const CITY_SIZES = [
  { value: 'major', label: 'Major metro' },
  { value: 'mid', label: 'Mid-size city' },
  { value: 'small', label: 'Smaller city / town' },
  { value: 'any', label: 'Any' },
];

const BASELINES = [
  { value: 'current', label: 'Your current location' },
  { value: 'national', label: 'National average' },
  { value: 'dc', label: 'Washington, DC' },
];

const MOCK_LOCATIONS: LocationData[] = [
  {
    id: 'san-antonio',
    city: 'San Antonio',
    state: 'TX',
    colDelta: -18,
    agencies: 12,
    salaryMin: 54000,
    salaryMax: 66000,
    medianRent: 1250,
    homeIndex: 185000,
    transitOptions: 'Bus, Limited rail',
    tags: ['Best overall fit', 'Budget friendly'],
    details: [
      'Lower housing costs than your baseline.',
      'Multiple agencies hiring in your target series.',
      'Strong promotion potential over 3–5 years.',
    ],
  },
  {
    id: 'denver',
    city: 'Denver',
    state: 'CO',
    colDelta: 5,
    agencies: 8,
    salaryMin: 58000,
    salaryMax: 71000,
    medianRent: 1650,
    homeIndex: 525000,
    transitOptions: 'Light rail, Bus',
    tags: ['High opportunity'],
    details: [
      'Growing federal presence in the region.',
      'Higher locality pay offsets COL increase.',
      'Strong tech sector with federal partnerships.',
    ],
  },
  {
    id: 'colorado-springs',
    city: 'Colorado Springs',
    state: 'CO',
    colDelta: -8,
    agencies: 6,
    salaryMin: 56000,
    salaryMax: 69000,
    medianRent: 1450,
    homeIndex: 420000,
    transitOptions: 'Bus',
    tags: ['Budget friendly'],
    details: [
      'Lower COL than Denver with similar opportunities.',
      'Strong defense and space sector presence.',
      'Growing remote work options available.',
    ],
  },
  {
    id: 'orlando',
    city: 'Orlando',
    state: 'FL',
    colDelta: -12,
    agencies: 5,
    salaryMin: 52000,
    salaryMax: 64000,
    medianRent: 1550,
    homeIndex: 350000,
    transitOptions: 'Bus, SunRail',
    tags: ['Budget friendly'],
    details: [
      'No state income tax advantage.',
      'Growing federal presence in healthcare and defense.',
      'Affordable compared to other major metros.',
    ],
  },
  {
    id: 'austin',
    city: 'Austin',
    state: 'TX',
    colDelta: 2,
    agencies: 4,
    salaryMin: 55000,
    salaryMax: 68000,
    medianRent: 1600,
    homeIndex: 480000,
    transitOptions: 'Bus, MetroRail',
    tags: ['High opportunity'],
    details: [
      'No state income tax advantage.',
      'Strong tech ecosystem with federal contractors.',
      'Growing but competitive housing market.',
    ],
  },
  {
    id: 'tampa',
    city: 'Tampa',
    state: 'FL',
    colDelta: -10,
    agencies: 7,
    salaryMin: 53000,
    salaryMax: 65000,
    medianRent: 1480,
    homeIndex: 380000,
    transitOptions: 'Bus',
    tags: ['Budget friendly', 'High opportunity'],
    details: [
      'No state income tax advantage.',
      'Strong VA and military presence.',
      'Affordable with good career growth potential.',
    ],
  },
  {
    id: 'raleigh',
    city: 'Raleigh',
    state: 'NC',
    colDelta: -5,
    agencies: 5,
    salaryMin: 54000,
    salaryMax: 67000,
    medianRent: 1520,
    homeIndex: 410000,
    transitOptions: 'Bus',
    tags: [],
    details: [
      'Growing Research Triangle federal presence.',
      'Moderate COL with good quality of life.',
      'Strong education and healthcare sectors.',
    ],
  },
  {
    id: 'phoenix',
    city: 'Phoenix',
    state: 'AZ',
    colDelta: -6,
    agencies: 9,
    salaryMin: 54000,
    salaryMax: 66000,
    medianRent: 1400,
    homeIndex: 380000,
    transitOptions: 'Light rail, Bus',
    tags: ['High opportunity'],
    details: [
      'Large VA and DHS presence.',
      'Affordable housing relative to other metros.',
      'Year-round outdoor activities available.',
    ],
  },
  {
    id: 'atlanta',
    city: 'Atlanta',
    state: 'GA',
    colDelta: 3,
    agencies: 11,
    salaryMin: 56000,
    salaryMax: 69000,
    medianRent: 1580,
    homeIndex: 380000,
    transitOptions: 'MARTA rail, Bus',
    tags: ['High opportunity'],
    details: [
      'Major CDC and other agency headquarters.',
      'Strong public transit options.',
      'Diverse federal opportunities across sectors.',
    ],
  },
  {
    id: 'indianapolis',
    city: 'Indianapolis',
    state: 'IN',
    colDelta: -22,
    agencies: 4,
    salaryMin: 51000,
    salaryMax: 63000,
    medianRent: 1150,
    homeIndex: 220000,
    transitOptions: 'Bus',
    tags: ['Budget friendly', 'Best overall fit'],
    details: [
      'Very affordable housing market.',
      'Lower COL significantly stretches salary.',
      'Growing federal and defense contractor presence.',
    ],
  },
];

export function ExploreLocationsModal({ open, onOpenChange }: ExploreLocationsModalProps) {
  // Local visibility state
  const [localHide, setLocalHide] = useState(false);

  // Filter states
  const [baseline, setBaseline] = useState('national');
  const [targetSeries, setTargetSeries] = useState('2210');
  const [targetGrade, setTargetGrade] = useState('GS-7');
  const [includePromotion, setIncludePromotion] = useState(false);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [citySize, setCitySize] = useState('any');
  const [colRange, setColRange] = useState([-30, 20]);
  const [salaryRange, setSalaryRange] = useState([45000, 85000]);
  const [minAgencies, setMinAgencies] = useState(1);
  const [showTargetAgencies, setShowTargetAgencies] = useState(false);
  const [showRemoteFriendly, setShowRemoteFriendly] = useState(false);

  // UI states
  const [expandedLocation, setExpandedLocation] = useState<string | null>(null);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  // Filter locations based on criteria
  const filteredLocations = useMemo(() => {
    return MOCK_LOCATIONS.filter((loc) => {
      // COL range filter
      if (loc.colDelta < colRange[0] || loc.colDelta > colRange[1]) return false;
      // Salary range filter
      if (loc.salaryMax < salaryRange[0] || loc.salaryMin > salaryRange[1]) return false;
      // Min agencies filter
      if (loc.agencies < minAgencies) return false;
      return true;
    });
  }, [colRange, salaryRange, minAgencies]);

  const comparedLocations = useMemo(() => {
    return MOCK_LOCATIONS.filter((loc) => selectedForCompare.includes(loc.id));
  }, [selectedForCompare]);

  const toggleRegion = (region: string) => {
    setSelectedRegions((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region],
    );
  };

  const toggleCompare = (id: string) => {
    setSelectedForCompare((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const resetFilters = () => {
    setBaseline('national');
    setTargetSeries('2210');
    setTargetGrade('GS-7');
    setIncludePromotion(false);
    setSelectedRegions([]);
    setCitySize('any');
    setColRange([-30, 20]);
    setSalaryRange([45000, 85000]);
    setMinAgencies(1);
    setShowTargetAgencies(false);
    setShowRemoteFriendly(false);
  };

  const formatCurrency = (value: number) => {
    return `$${Math.round(value / 1000)}k`;
  };

  const getLocalOverride = (): 'default' | 'show' | 'hide' => {
    return localHide ? 'hide' : 'default';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-w-5xl lg:max-w-6xl mx-auto max-h-[90vh] flex flex-col p-0 gap-0"
        showCloseButton={false}
      >
        {/* ================================================================
            ACCESSIBILITY: VisuallyHidden title and description
            ================================================================
            Radix Dialog requires both DialogTitle and DialogDescription
            for screen reader accessibility. Since this dialog uses a
            custom visual header, we hide the semantic elements while
            keeping them accessible.
            ================================================================ */}
        <VisuallyHidden.Root>
          <DialogTitle>Explore Locations & COL</DialogTitle>
          <DialogDescription>
            Compare locations by cost of living, locality pay, and agencies hiring for your target roles.
          </DialogDescription>
        </VisuallyHidden.Root>

        {/* Header */}
        <div className="shrink-0 p-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">Explore Locations & COL</h2>
              <p className="text-sm text-muted-foreground">
                Compare locations by cost of living, locality pay, and agencies hiring for your
                target roles.
              </p>
              {/* Context strip */}
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="secondary" className="text-xs">
                  Target series: {targetSeries} –{' '}
                  {SERIES_OPTIONS.find((s) => s.code === targetSeries)?.title}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  Target grade: {targetGrade}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  Timeline: Next 12–18 months
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CardVisibilityToggle
                isHidden={localHide}
                onToggle={() => setLocalHide(!localHide)}
              />
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                <X className="w-4 h-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[80vh]">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-6 p-6">
            {/* Left column - Filters */}
            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-sm font-medium">Filters & Scenario</h3>
              </div>

              {/* Baseline for COL comparison */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Compare against</Label>
                <Select value={baseline} onValueChange={setBaseline}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BASELINES.map((b) => (
                      <SelectItem key={b.value} value={b.value}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  COL deltas will be shown compared to this baseline.
                </p>
              </div>

              {/* Target job parameters */}
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground">Target job parameters</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Series</Label>
                    <Select value={targetSeries} onValueChange={setTargetSeries}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SERIES_OPTIONS.map((s) => (
                          <SelectItem key={s.code} value={s.code}>
                            {s.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Grade</Label>
                    <Select value={targetGrade} onValueChange={setTargetGrade}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADES.map((g) => (
                          <SelectItem key={g} value={g}>
                            {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="promotion-path"
                    checked={includePromotion}
                    onCheckedChange={(checked) => setIncludePromotion(checked === true)}
                  />
                  <Label htmlFor="promotion-path" className="text-xs cursor-pointer">
                    Include higher-grade promotion path (e.g., GS-7 → GS-9)
                  </Label>
                </div>
              </div>

              {/* Location filters */}
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground">Regions</Label>
                <div className="flex flex-wrap gap-1.5">
                  {REGIONS.map((region) => (
                    <Badge
                      key={region}
                      variant={selectedRegions.includes(region) ? 'default' : 'outline'}
                      className="cursor-pointer text-xs"
                      onClick={() => toggleRegion(region)}
                    >
                      {region}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">City size</Label>
                <div className="flex flex-wrap gap-1.5">
                  {CITY_SIZES.map((size) => (
                    <Badge
                      key={size.value}
                      variant={citySize === size.value ? 'default' : 'outline'}
                      className="cursor-pointer text-xs"
                      onClick={() => setCitySize(size.value)}
                    >
                      {size.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* COL and salary tolerance */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Acceptable COL range</Label>
                    <span className="text-xs text-muted-foreground">
                      {colRange[0]}% to {colRange[1] > 0 ? `+${colRange[1]}` : colRange[1]}%
                    </span>
                  </div>
                  <Slider
                    value={colRange}
                    onValueChange={setColRange}
                    min={-50}
                    max={50}
                    step={5}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Target salary band</Label>
                    <SensitiveValue
                      value={`${formatCurrency(salaryRange[0])} – ${formatCurrency(salaryRange[1])}`}
                      localOverride={getLocalOverride()}
                      className="text-xs text-muted-foreground"
                    />
                  </div>
                  <Slider
                    value={salaryRange}
                    onValueChange={setSalaryRange}
                    min={30000}
                    max={120000}
                    step={5000}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Agency and remote preferences */}
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground">Agency & remote preferences</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="target-agencies"
                      checked={showTargetAgencies}
                      onCheckedChange={(checked) => setShowTargetAgencies(checked === true)}
                    />
                    <Label htmlFor="target-agencies" className="text-xs cursor-pointer">
                      Show locations with my target agencies
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remote-friendly"
                      checked={showRemoteFriendly}
                      onCheckedChange={(checked) => setShowRemoteFriendly(checked === true)}
                    />
                    <Label htmlFor="remote-friendly" className="text-xs cursor-pointer">
                      Highlight remote-friendly locations
                    </Label>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Min agencies hiring:</Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={minAgencies}
                    onChange={(e) => setMinAgencies(Number.parseInt(e.target.value) || 1)}
                    className="w-16 h-7 text-xs"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-2 pt-2">
                <Button className="w-full" size="sm">
                  Update locations
                </Button>
                <Button variant="ghost" size="sm" className="w-full" onClick={resetFilters}>
                  Reset filters
                </Button>
              </div>
            </div>

            {/* Right column - Results */}
            <div className="space-y-4">
              {showComparison ? (
                /* Comparison view */
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mb-4"
                    onClick={() => setShowComparison(false)}
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to list
                  </Button>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">
                            Metric
                          </th>
                          {comparedLocations.map((loc) => (
                            <th key={loc.id} className="text-left py-2 px-3 font-medium">
                              {loc.city}, {loc.state}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-border/50">
                          <td className="py-3 px-3 text-muted-foreground">COL vs baseline</td>
                          {comparedLocations.map((loc) => (
                            <td key={loc.id} className="py-3 px-3">
                              <Badge
                                variant="outline"
                                className={loc.colDelta < 0 ? 'text-green-500' : ''}
                              >
                                {loc.colDelta > 0 ? `+${loc.colDelta}` : loc.colDelta}%
                              </Badge>
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-3 px-3 text-muted-foreground">
                            Est. {targetGrade} salary
                          </td>
                          {comparedLocations.map((loc) => (
                            <td key={loc.id} className="py-3 px-3">
                              <SensitiveValue
                                value={`${formatCurrency(loc.salaryMin)}–${formatCurrency(loc.salaryMax)}`}
                                localOverride={getLocalOverride()}
                              />
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-3 px-3 text-muted-foreground">Agencies hiring</td>
                          {comparedLocations.map((loc) => (
                            <td key={loc.id} className="py-3 px-3">
                              {loc.agencies}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-3 px-3 text-muted-foreground">Median rent (1BR)</td>
                          {comparedLocations.map((loc) => (
                            <td key={loc.id} className="py-3 px-3">
                              <SensitiveValue
                                value={`$${loc.medianRent.toLocaleString()}`}
                                localOverride={getLocalOverride()}
                              />
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-3 px-3 text-muted-foreground">Home price index</td>
                          {comparedLocations.map((loc) => (
                            <td key={loc.id} className="py-3 px-3">
                              <SensitiveValue
                                value={`$${loc.homeIndex.toLocaleString()}`}
                                localOverride={getLocalOverride()}
                              />
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="py-3 px-3 text-muted-foreground">Transit options</td>
                          {comparedLocations.map((loc) => (
                            <td key={loc.id} className="py-3 px-3">
                              {loc.transitOptions}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* PathAdvisor insight */}
                  <Card className="mt-4 border-accent/30 bg-accent/5">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-accent mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium">PathAdvisor Summary</p>
                          <p className="text-xs text-muted-foreground">
                            Based on your target grade and series, {comparedLocations[0]?.city}{' '}
                            offers the best balance of lower COL and strong agency presence.
                            Consider {comparedLocations[1]?.city} if career growth opportunities are
                            a priority.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                /* Location list view */
                <>
                  {/* Summary bar */}
                  <div className="p-4 border border-border rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium">Top locations for your scenario</h4>
                        <p className="text-xs text-muted-foreground">
                          Showing {filteredLocations.length} locations that match your filters.
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Info className="w-3 h-3" />
                        COL and pay values are estimates.
                      </div>
                    </div>
                  </div>

                  {/* Location cards */}
                  <div className="space-y-3">
                    {filteredLocations.map((loc) => (
                      <Card key={loc.id} className="border-border">
                        <CardContent className="p-4 space-y-3">
                          {/* Primary row */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={selectedForCompare.includes(loc.id)}
                                onCheckedChange={() => toggleCompare(loc.id)}
                                disabled={
                                  !selectedForCompare.includes(loc.id) &&
                                  selectedForCompare.length >= 3
                                }
                              />
                              <MapPin className="w-4 h-4 text-accent" />
                              <span className="font-medium">
                                {loc.city}, {loc.state}
                              </span>
                            </div>
                            <Badge
                              variant="outline"
                              className={loc.colDelta < 0 ? 'text-green-500' : ''}
                            >
                              {loc.colDelta > 0 ? `+${loc.colDelta}` : loc.colDelta}% COL
                            </Badge>
                          </div>

                          {/* Secondary row */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {loc.agencies} agencies hiring
                            </div>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              <span>Est. {targetGrade}: </span>
                              <SensitiveValue
                                value={`${formatCurrency(loc.salaryMin)}–${formatCurrency(loc.salaryMax)}`}
                                localOverride={getLocalOverride()}
                                className="text-xs"
                              />
                            </div>
                          </div>

                          {/* Tags */}
                          {loc.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {loc.tags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className={`text-xs ${
                                    tag === 'Best overall fit'
                                      ? 'bg-accent/20 text-accent'
                                      : tag === 'Budget friendly'
                                        ? 'bg-green-500/20 text-green-500'
                                        : 'bg-amber-500/20 text-amber-500'
                                  }`}
                                >
                                  {tag === 'Best overall fit' && <Star className="w-3 h-3 mr-1" />}
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="flex items-center gap-3 pt-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() =>
                                setExpandedLocation(expandedLocation === loc.id ? null : loc.id)
                              }
                            >
                              Details
                              {expandedLocation === loc.id ? (
                                <ChevronUp className="w-3 h-3 ml-1" />
                              ) : (
                                <ChevronDown className="w-3 h-3 ml-1" />
                              )}
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs">
                              <Search className="w-3 h-3 mr-1" />
                              View jobs here
                            </Button>
                          </div>

                          {/* Expanded details */}
                          {expandedLocation === loc.id && (
                            <div className="pt-3 border-t border-border space-y-3">
                              <ul className="space-y-1">
                                {loc.details.map((detail, i) => (
                                  <li
                                    key={i}
                                    className="text-xs text-muted-foreground flex items-start gap-2"
                                  >
                                    <span className="text-accent">•</span>
                                    {detail}
                                  </li>
                                ))}
                              </ul>
                              <div className="grid grid-cols-3 gap-3 text-xs">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <Home className="w-3 h-3" />
                                    Median rent (1BR)
                                  </div>
                                  <SensitiveValue
                                    value={`$${loc.medianRent.toLocaleString()}`}
                                    localOverride={getLocalOverride()}
                                    className="font-medium"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <Home className="w-3 h-3" />
                                    Home price index
                                  </div>
                                  <SensitiveValue
                                    value={`$${loc.homeIndex.toLocaleString()}`}
                                    localOverride={getLocalOverride()}
                                    className="font-medium"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <Train className="w-3 h-3" />
                                    Transit
                                  </div>
                                  <p className="font-medium">{loc.transitOptions}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Comparison strip */}
                  {selectedForCompare.length >= 2 && (
                    <div className="p-4 border border-border rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          Comparing {selectedForCompare.length} locations
                        </span>
                        <Button size="sm" onClick={() => setShowComparison(true)}>
                          Open comparison
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 p-4 border-t border-border bg-background">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground max-w-xl">
              Location, COL, and salary estimates are for planning only and may differ from actual
              OPM and GSA data.
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button size="sm">Save short list</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
