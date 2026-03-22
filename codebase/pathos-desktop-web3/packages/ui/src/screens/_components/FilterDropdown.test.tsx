/**
 * FilterDropdown tests: trigger uses shared Interactive Hover v1 class.
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { FilterDropdown } from './FilterDropdown';
import { INTERACTIVE_HOVER_CLASS } from '../../styles/interactiveHover';

const OPTIONS = [
  { value: '', label: 'All' },
  { value: 'a', label: 'Option A' },
];

describe('FilterDropdown', function () {
  it('trigger button includes interactive hover class', function () {
    const output = renderToString(
      <FilterDropdown
        value=""
        label="Test"
        options={OPTIONS}
        onSelect={function () {}}
      />
    );
    expect(output).toContain(INTERACTIVE_HOVER_CLASS);
  });
});
