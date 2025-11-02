#!/usr/bin/env node
/**
 * Inventory Generator
 * Generates inventory.ini from template using environment variables
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

async function generateInventory() {
  try {
    // Read template
    const templatePath = join(__dirname, 'inventory.template');
    const template = await fs.readFile(templatePath, 'utf-8');
    
    // Replace environment variables
    let inventory = template;
    
    // Replace all environment variables in format ${VAR_NAME}
    inventory = inventory.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      const value = process.env[varName];
      if (!value) {
        console.warn(`Warning: Environment variable ${varName} not found`);
        return match; // Keep original if not found
      }
      return value;
    });
    
    // Write to parent directory (main Ansible directory)
    const outputPath = join(dirname(__dirname), 'inventory.ini');
    await fs.writeFile(outputPath, inventory);
    
    console.log('✅ Generated inventory.ini from template');
    console.log(`📝 Output: ${outputPath}`);
    
    // Validate the generated inventory
    const lines = inventory.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    console.log(`📊 Generated ${lines.length} non-empty lines`);
    
  } catch (error) {
    console.error('❌ Failed to generate inventory:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateInventory();
}