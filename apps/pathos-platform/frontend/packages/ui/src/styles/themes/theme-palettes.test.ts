import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

type TokenMap = Record<string, string>;

function extractThemeBlock(css: string, themeName: string): string {
  const pattern = new RegExp(
    String.raw`\[data-theme=['"]` + themeName + String.raw`['"]\]\s*\{([\s\S]*?)\}`,
    'm'
  );
  const match = css.match(pattern);
  if (!match) {
    throw new Error("Selector not found: [data-theme='" + themeName + "']");
  }
  return match[1];
}

function extractPTokensFromBlock(block: string): TokenMap {
  const tokens: TokenMap = {};
  const tokenPattern = /(--p-[\w-]+)\s*:\s*([^;]+);/g;

  let match = tokenPattern.exec(block);
  while (match !== null) {
    const key = match[1].trim();
    const value = match[2].trim();
    tokens[key] = value;
    match = tokenPattern.exec(block);
  }
  return tokens;
}

function readJson(path: string): TokenMap {
  return JSON.parse(readFileSync(path, 'utf8')) as TokenMap;
}

function formatTokenDiff(expected: TokenMap, actual: TokenMap): string {
  const expectedKeys = Object.keys(expected).sort();
  const actualKeys = Object.keys(actual).sort();

  const missing = expectedKeys.filter(function (k) { return !(k in actual); });
  const extra = actualKeys.filter(function (k) { return !(k in expected); });
  const changed = expectedKeys.filter(function (k) {
    return k in actual && expected[k] !== actual[k];
  });

  const lines: string[] = [];

  if (missing.length > 0) {
    lines.push('Missing tokens:');
    for (const key of missing) {
      lines.push('  - ' + key + ' (expected: ' + expected[key] + ')');
    }
  }

  if (extra.length > 0) {
    lines.push('Extra tokens:');
    for (const key of extra) {
      lines.push('  - ' + key + ' (actual: ' + actual[key] + ')');
    }
  }

  if (changed.length > 0) {
    lines.push('Changed tokens:');
    for (const key of changed) {
      lines.push('  - ' + key + ':');
      lines.push('    expected: ' + expected[key]);
      lines.push('    actual:   ' + actual[key]);
    }
  }

  if (lines.length === 0) {
    lines.push('No differences found.');
  }

  return lines.join('\n');
}

function assertThemeMatchesPalette(themeName: 'legacy' | 'mix' | 'shared') {
  const themesDir = join(process.cwd(), 'packages', 'ui', 'src', 'styles', 'themes');
  const cssPath = join(themesDir, 'theme-' + themeName + '.css');
  const palettePath = join(themesDir, 'palettes', 'theme-' + themeName + '.palette.json');

  const css = readFileSync(cssPath, 'utf8');
  const block = extractThemeBlock(css, themeName);
  const actualTokens = extractPTokensFromBlock(block);
  const expectedTokens = readJson(palettePath);

  const expectedString = JSON.stringify(expectedTokens, null, 2);
  const actualString = JSON.stringify(actualTokens, null, 2);

  if (actualString !== expectedString) {
    throw new Error(
      'Theme token drift detected for "' + themeName + '".\n' +
      formatTokenDiff(expectedTokens, actualTokens)
    );
  }

  expect(actualTokens).toEqual(expectedTokens);
}

describe('Theme palette snapshots', function () {
  it('freezes legacy tokens', function () {
    assertThemeMatchesPalette('legacy');
  });

  it('freezes mix tokens', function () {
    assertThemeMatchesPalette('mix');
  });

  it('freezes shared tokens', function () {
    assertThemeMatchesPalette('shared');
  });
});
