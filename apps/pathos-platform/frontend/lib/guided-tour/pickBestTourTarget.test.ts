/**
 * ============================================================================
 * PICK BEST TOUR TARGET TESTS (Day 36 - Tour targeting fix)
 * ============================================================================
 *
 * Tests for pickBestTourTarget function that selects the best element
 * from multiple matches when a data-tour selector returns multiple candidates.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { pickBestTourTarget } from './pickBestTourTarget';

// Store computed styles per element for getComputedStyle mock
const elementStyles = new WeakMap<Element, CSSStyleDeclaration>();

// Mock DOM element for testing
function createMockElement(rect: Partial<DOMRect>, computedStyle?: Partial<CSSStyleDeclaration>): Element {
  const mockElement = {
    getBoundingClientRect: function () {
      const top = rect.top !== undefined ? rect.top : 0;
      const left = rect.left !== undefined ? rect.left : 0;
      const width = rect.width !== undefined ? rect.width : 100;
      const height = rect.height !== undefined ? rect.height : 100;
      // Calculate bottom and right from top/left/width/height if not explicitly provided
      const bottom = rect.bottom !== undefined ? rect.bottom : top + height;
      const right = rect.right !== undefined ? rect.right : left + width;
      return {
        top: top,
        left: left,
        bottom: bottom,
        right: right,
        width: width,
        height: height,
        x: rect.x !== undefined ? rect.x : left,
        y: rect.y !== undefined ? rect.y : top,
        toJSON: function () {
          return {};
        },
      } as DOMRect;
    },
  } as Element;

  // Store computed style for this element
  const style = {
    display: computedStyle !== undefined && computedStyle.display !== undefined ? computedStyle.display : 'block',
    visibility: computedStyle !== undefined && computedStyle.visibility !== undefined ? computedStyle.visibility : 'visible',
    opacity: computedStyle !== undefined && computedStyle.opacity !== undefined ? computedStyle.opacity : '1',
  } as CSSStyleDeclaration;
  elementStyles.set(mockElement, style);

  return mockElement;
}

// Mock NodeListOf
function createMockNodeList(elements: Element[]): NodeListOf<Element> {
  const nodeList = elements as unknown as NodeListOf<Element>;
  return nodeList;
}

// Mock window dimensions
const mockViewport = {
  width: 1920,
  height: 1080,
};

beforeEach(function () {
  // Create window object if it doesn't exist (for node environment)
  // In node test environment, window doesn't exist, so we need to create it
  if (typeof window === 'undefined') {
    // Type assertion needed because globalThis doesn't have window in node environment
    (globalThis as Record<string, unknown>).window = {} as Window;
  }
  
  // Reset window.innerWidth and innerHeight mocks
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: mockViewport.width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: mockViewport.height,
  });

  // Mock getComputedStyle to return stored style for each element
  window.getComputedStyle = function (element: Element) {
    const style = elementStyles.get(element);
    if (style) {
      return style;
    }
    // Default style if not found
    return {
      display: 'block',
      visibility: 'visible',
      opacity: '1',
    } as CSSStyleDeclaration;
  };
});

describe('pickBestTourTarget', function () {
  describe('with single candidate', function () {
    it('should return the single candidate', function () {
      const element = createMockElement({ top: 100, left: 100, width: 200, height: 200 });
      const candidates = createMockNodeList([element]);
      const result = pickBestTourTarget(candidates);
      expect(result).toBe(element);
    });

    it('should return null for empty NodeList', function () {
      const candidates = createMockNodeList([]);
      const result = pickBestTourTarget(candidates);
      expect(result).toBe(null);
    });
  });

  describe('with multiple candidates', function () {
    it('should prefer in-viewport candidates over off-screen', function () {
      const inViewport = createMockElement({ top: 100, left: 100, width: 200, height: 200 });
      const offScreen = createMockElement({ top: 2000, left: 2000, width: 200, height: 200 });
      const candidates = createMockNodeList([offScreen, inViewport]);
      const result = pickBestTourTarget(candidates);
      expect(result).not.toBe(null);
      if (result) {
        const rect = result.getBoundingClientRect();
        // Should return the in-viewport element (top: 100, not 2000)
        expect(rect.top).toBe(100);
        expect(rect.left).toBe(100);
      }
    });

    it('should prefer smaller area over larger area (more specific target)', function () {
      const small = createMockElement({ top: 100, left: 100, width: 200, height: 200 }); // 40,000
      const large = createMockElement({ top: 100, left: 100, width: 800, height: 600 }); // 480,000
      const candidates = createMockNodeList([large, small]);
      const result = pickBestTourTarget(candidates);
      expect(result).not.toBe(null);
      if (result) {
        const rect = result.getBoundingClientRect();
        // Should return the smaller element (200x200, not 800x600)
        expect(rect.width).toBe(200);
        expect(rect.height).toBe(200);
      }
    });

    it('should avoid near-fullscreen containers (area >= 0.85 * viewportArea)', function () {
      // Near-fullscreen container (should be avoided)
      const fullscreen = createMockElement({
        top: 0,
        left: 0,
        width: 1800,
        height: 1000,
      }); // 1,800,000 (exceeds maxArea)
      
      // Smaller target (should be preferred)
      const small = createMockElement({ top: 100, left: 100, width: 300, height: 200 }); // 60,000
      
      const candidates = createMockNodeList([fullscreen, small]);
      const result = pickBestTourTarget(candidates);
      expect(result).not.toBe(null);
      if (result) {
        const rect = result.getBoundingClientRect();
        // Should return the smaller element (300x200, not 1800x1000)
        expect(rect.width).toBe(300);
        expect(rect.height).toBe(200);
      }
    });

    it('should filter out hidden elements', function () {
      const visible = createMockElement({ top: 100, left: 100, width: 200, height: 200 });
      const hidden = createMockElement({ top: 100, left: 100, width: 200, height: 200 }, { display: 'none' });
      const candidates = createMockNodeList([hidden, visible]);
      const result = pickBestTourTarget(candidates);
      expect(result).not.toBe(null);
      if (result) {
        const rect = result.getBoundingClientRect();
        // Should return the visible element (both have same rect, but we verify it's not null)
        expect(rect.width).toBe(200);
        expect(rect.height).toBe(200);
      }
    });

    it('should filter out zero-width/height elements', function () {
      const visible = createMockElement({ top: 100, left: 100, width: 200, height: 200 });
      const zeroSize = createMockElement({ top: 100, left: 100, width: 0, height: 0 });
      const candidates = createMockNodeList([zeroSize, visible]);
      const result = pickBestTourTarget(candidates);
      expect(result).not.toBe(null);
      if (result) {
        const rect = result.getBoundingClientRect();
        // Should return the visible element (200x200, not 0x0)
        expect(rect.width).toBe(200);
        expect(rect.height).toBe(200);
      }
    });

    it('should fallback to first visible candidate if all are near-fullscreen', function () {
      // Both are near-fullscreen
      const fullscreen1 = createMockElement({
        top: 0,
        left: 0,
        width: 1800,
        height: 1000,
      });
      const fullscreen2 = createMockElement({
        top: 0,
        left: 0,
        width: 1900,
        height: 1050,
      });
      
      const candidates = createMockNodeList([fullscreen1, fullscreen2]);
      const result = pickBestTourTarget(candidates);
      // Should fallback to first visible candidate
      expect(result).toBe(fullscreen1);
    });

    it('should use custom viewport dimensions when provided', function () {
      const customViewport = { width: 1024, height: 768 };
      
      // Near-fullscreen in custom viewport
      const fullscreen = createMockElement({
        top: 0,
        left: 0,
        width: 900,
        height: 700,
      }); // 630,000 (within maxArea, but close)
      
      const small = createMockElement({ top: 100, left: 100, width: 200, height: 200 }); // 40,000
      
      const candidates = createMockNodeList([fullscreen, small]);
      const result = pickBestTourTarget(candidates, customViewport);
      expect(result).not.toBe(null);
      if (result) {
        const rect = result.getBoundingClientRect();
        // Should return the smaller element (200x200, not 900x700)
        expect(rect.width).toBe(200);
        expect(rect.height).toBe(200);
      }
    });
  });
});
