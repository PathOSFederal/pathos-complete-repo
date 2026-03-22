#!/usr/bin/env node

/*
 * ============================================================================
 * OWNER MAP GENERATOR DETERMINISM TEST (Day 41)
 * ============================================================================
 *
 * PURPOSE:
 * Smoke test to ensure generate-owner-map.mjs produces deterministic output.
 * Runs the generator twice and verifies both runs produce identical output.
 *
 * USAGE:
 *   node scripts/generate-owner-map.test.mjs
 *   pnpm test scripts/generate-owner-map.test.mjs
 *
 * @version Day 41 - Determinism validation
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

/**
 * Determinism smoke test.
 * 
 * Runs the generator twice in a row and asserts no diff between runs.
 * This ensures the generator output is deterministic and won't fail CI
 * due to date rollover or other non-deterministic content.
 */
function testDeterminism() {
  console.log('[test-determinism] Running owner map generator determinism test...');
  
  const outputPath = path.join(projectRoot, 'docs', 'owner-map.generated.md');
  const backupPath = path.join(projectRoot, 'docs', 'owner-map.generated.backup.md');
  
  // Save current state (if file exists)
  let originalContent = null;
  if (fs.existsSync(outputPath)) {
    originalContent = fs.readFileSync(outputPath, 'utf8');
  }
  
  try {
    // Run generator first time
    console.log('[test-determinism] First generation run...');
    execSync('pnpm docs:owner-map', { cwd: projectRoot, stdio: 'inherit' });
    
    if (!fs.existsSync(outputPath)) {
      throw new Error('Generator did not create output file');
    }
    
    const firstRun = fs.readFileSync(outputPath, 'utf8');
    
    // Save first run as backup
    fs.writeFileSync(backupPath, firstRun, 'utf8');
    
    // Run generator second time (same inputs, should produce identical output)
    console.log('[test-determinism] Second generation run...');
    execSync('pnpm docs:owner-map', { cwd: projectRoot, stdio: 'inherit' });
    
    const secondRun = fs.readFileSync(outputPath, 'utf8');
    
    // Compare outputs
    if (firstRun !== secondRun) {
      console.error('[test-determinism] FAILED: Generator output differs between runs');
      console.error('[test-determinism] First run length: ' + firstRun.length);
      console.error('[test-determinism] Second run length: ' + secondRun.length);
      
      // Find first difference
      const minLength = Math.min(firstRun.length, secondRun.length);
      for (let i = 0; i < minLength; i++) {
        if (firstRun[i] !== secondRun[i]) {
          const contextStart = Math.max(0, i - 50);
          const contextEnd = Math.min(minLength, i + 50);
          console.error('[test-determinism] First difference at position: ' + i);
          console.error('[test-determinism] First run context:');
          console.error(firstRun.substring(contextStart, contextEnd));
          console.error('[test-determinism] Second run context:');
          console.error(secondRun.substring(contextStart, contextEnd));
          break;
        }
      }
      
      // Clean up backup
      fs.unlinkSync(backupPath);
      
      process.exit(1);
    }
    
    console.log('[test-determinism] PASSED: Generator produces deterministic output');
    console.log('[test-determinism] Output length: ' + firstRun.length + ' bytes');
    
    // Restore original if it existed
    if (originalContent !== null) {
      fs.writeFileSync(outputPath, originalContent, 'utf8');
    } else {
      // If original didn't exist, keep the generated file
      // (test should leave system in a consistent state)
    }
    
    // Clean up backup
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('[test-determinism] ERROR: ' + error.message);
    console.error(error.stack);
    
    // Restore original if it existed
    if (originalContent !== null && fs.existsSync(backupPath)) {
      fs.writeFileSync(outputPath, originalContent, 'utf8');
    }
    
    // Clean up backup
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
    }
    
    process.exit(1);
  }
}

// Run
testDeterminism();
