# Day 17 — Settings Page First-Principles Refactor

**Date:** December 14, 2025  
**Status:** Complete

---

## What Changed

The Settings / Profile & Settings page has been refactored to be faster to configure, clearer about impact, and more trust-forward about local-only data storage.

### 1. Setup Checklist Added

A new **Setup Checklist** card appears at the top of Settings, showing:
- How many high-leverage profile items are configured (e.g., "3/4 completed")
- Progress bar visualization
- Each item explains why it matters for job matches
- **"Set up"** buttons that scroll directly to the relevant control

This helps users know what to do first and unlocks better job search results faster.

### 2. Profile Card Simplified

The left profile summary card now shows:
- **Quick jump links** to each settings section (Identity, Career Goals, Location) instead of a single "Edit profile" button
- **Troubleshooting section** for "Re-run onboarding wizard" (moved out of main actions)

This makes the profile card a summary + navigation hub rather than a competing editor.

### 3. "No Preference" Options Added

Both **Work Arrangement** and **Willingness to Relocate** controls now include:
- **"No preference"** option that doesn't filter out any jobs
- This prevents users from being forced to pick a preference they don't actually have

### 4. Federal Jargon Explained

- **CONUS/OCONUS tooltip** added next to relocation options
- Explains: CONUS = Continental US (48 states), OCONUS = Outside CONUS (Alaska, Hawaii, overseas)
- Reduces confusion for job seekers unfamiliar with federal terminology

### 5. Target Series Search

- **Search input** added to find series by code or name
- Faster than scanning a long list of chips
- Shows "X selected" count for clarity

### 6. Clearer Saving Feedback

- **Global "Saved at [time]"** indicator near page title
- Per-card saved indicators still appear briefly
- No toast spam for every field change

### 7. Visibility Icons Explained

- Card visibility controls now show **"Visible" / "Hidden"** text label
- **Tooltip** explains this is a local setting on this device only
- Builds trust that these are display preferences, not data uploads

### 8. Stronger Delete Confirmation

The "Delete All Local Data" flow now requires:
- Viewing a **detailed list** of what will be deleted
- **Typing "DELETE"** to confirm
- Clear messaging that this cannot be undone because nothing is stored on a server

### 9. PathAdvisor Setup Coach Mode

When on the Settings page, PathAdvisor switches to **configuration-focused prompts**:
- Suggests actions like "Set your metro area for locality pay estimates"
- Does not show job-offer or PCS prompts while configuring

---

## Why It Changed

The previous Settings page had several UX issues:
- Users didn't know what to configure first for best results
- Confusion between the profile summary card and editable sections
- Controls forced selections even when users had no preference
- Federal jargon (CONUS/OCONUS) confused job seekers
- No search for series made finding the right one tedious
- Delete confirmation was too easy to click accidentally

---

## How It Improves User Experience and Trust

### Speed
- Checklist guides users to complete high-impact items first
- Search finds series faster than scanning
- Jump links get users to the right section instantly

### Clarity
- Every checklist item explains why it matters
- CONUS/OCONUS are explained at point of use
- Visibility controls have clear labels and tooltips

### Trust
- Privacy messaging is prominent (data stays on device)
- Delete confirmation lists exactly what will be erased
- Type-to-confirm prevents accidental deletion
- Visibility tooltip confirms settings are local-only

---

## Known Limitations / Next Steps

1. **Series list is static** - Could add recommended series based on resume content
2. **Metro area is free text** - Could add autocomplete with locality pay data
3. **No undo for delete** - Could add export before delete in future
4. **PathAdvisor prompts are static** - Could make them context-aware based on incomplete checklist items
5. **PathAdvisor Bottom dock position removed** - The dock no longer offers a "Bottom" position (for now). Any prior "Bottom" preference saved in user settings will be auto-normalized to "Right" on load

---

## Technical Summary

### New Files
- `components/settings/SetupChecklistCard.tsx` - Profile completion checklist
- `components/settings/index.ts` - Barrel export

### Modified Files
- `app/settings/page.tsx` - All Settings page changes
- `lib/mock/profile.ts` - Added 'no_preference' to types

### No Breaking Changes
- All existing profile data continues to work
- New type values are additive, not replacing existing ones

---

*For detailed implementation notes, see `merge-notes.md`.*
