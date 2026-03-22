/**
 * Filter guides: Series, Agency, Location (all full). Drawer portaled to OverlayRoot;
 * token-only styling; shared zIndex.
 */

export { FilterGuideDrawer, type FilterGuideDrawerProps } from './FilterGuideDrawer';
export type { FilterGuideKind, AgencyGuideEntry, LocationGuideEntry } from './filterGuideTypes';
export {
  SERIES_GUIDE_DATA,
  SERIES_CATEGORIES,
  filterSeriesGuide,
  type SeriesGuideEntry,
} from './seriesGuideData';
export {
  AGENCY_GUIDE_DATA,
  AGENCY_CATEGORIES,
  filterAgencyGuide,
} from './agencyGuideData';
export {
  LOCATION_GUIDE_DATA,
  filterLocationGuide,
} from './locationGuideData';
