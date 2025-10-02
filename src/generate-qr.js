#!/usr/bin/env node

import { generateQRCodesFromJSON } from './utils.js';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'path';

async function generateQRCodes() {
  try {
    console.log('🚀 Starting QR Code Generation...');
    
    // Read the hashes file
    const hashesData = JSON.parse(await readFile('./data/hashes.json', 'utf8'));
    
    console.log(`📄 Found ${hashesData.hash.length} hashes in hashes.json`);
    console.log(`🔗 Base URL: ${hashesData.baseUrl}`);
    
    // Create output directory with timestamp
    const timestamp = Date.now();
    const outputDir = `./outputs/qr-codes-${timestamp}`;
    const qrsDir = path.join(outputDir, 'qrs');
    
    await mkdir(qrsDir, { recursive: true });
    console.log(`📁 Created output directory: ${outputDir}`);
    
    // Create a copy of the hashes file in the output directory
    const outputJsonPath = path.join(outputDir, 'hashes.json');
    await import('node:fs/promises').then(fs => 
      fs.writeFile(outputJsonPath, JSON.stringify(hashesData, null, 2))
    );
    
    // Generate QR codes using the existing system
    await generateQRCodesFromJSON(outputJsonPath, qrsDir);
    
    console.log('\n✅ QR Code generation completed successfully!');
    console.log(`📁 Output directory: ${outputDir}`);
    console.log(`🖼️  QR codes saved in: ${qrsDir}`);
    console.log(`📊 Total QR codes generated: ${hashesData.hash.length}`);
    
  } catch (error) {
    console.error('❌ Error generating QR codes:', error.message);
    process.exit(1);
  }
}

// Run the generation
generateQRCodes();
