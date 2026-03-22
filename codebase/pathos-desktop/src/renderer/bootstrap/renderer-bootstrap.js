import { bootstrapRenderer } from "../renderer.js";

if (window.__PATHOS_RENDERER_BOOTED__) {
  console.warn("Renderer already booted, skipping re-init.");
} else {
  window.__PATHOS_RENDERER_BOOTED__ = true;
  bootstrapRenderer();
}
