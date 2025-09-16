#!/usr/bin/env node

/**
 * Example script demonstrating how to use the QR code verification feature
 * 
 * This script shows how to:
 * 1. Generate QR codes and PDFs
 * 2. Verify the generated PDFs contain correct QR codes
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

async function runExample() {
  console.log("🚀 QR Code Generation and Verification Example\n");
  
  try {
    // Step 1: Generate QR codes and PDFs
    console.log("📝 Step 1: Generating QR codes and PDFs...");
    console.log("Running: node src/index.js 5 'https://scanquest.xyz/treasure-hunt/qr' '' true\n");
    
    const { stdout: generateOutput, stderr: generateError } = await execAsync(
      "node src/index.js 5 'https://scanquest.xyz/treasure-hunt/qr' '' true"
    );
    
    console.log("Generation output:");
    console.log(generateOutput);
    if (generateError) {
      console.log("Generation errors:");
      console.log(generateError);
    }
    
    // Step 2: Find the generated output directory
    console.log("\n📁 Step 2: Finding generated output directory...");
    
    const { stdout: findOutput } = await execAsync("find outputs -name 'qr-codes-*' -type d | head -1");
    const outputDir = findOutput.trim();
    
    if (!outputDir) {
      throw new Error("No output directory found. Make sure QR codes were generated successfully.");
    }
    
    console.log(`Found output directory: ${outputDir}`);
    
    // Step 3: Verify the generated PDFs
    console.log("\n🔍 Step 3: Verifying generated PDFs...");
    
    const pdfDir = path.join(outputDir, "flyers", "pdf");
    const qrDir = path.join(outputDir, "qrs");
    const jsonFile = path.join(outputDir, path.basename(outputDir) + ".json");
    
    console.log(`PDF Directory: ${pdfDir}`);
    console.log(`QR Directory: ${qrDir}`);
    console.log(`JSON File: ${jsonFile}`);
    console.log(`Running: npm run verify '${pdfDir}' '${qrDir}' '${jsonFile}'\n`);
    
    const { stdout: verifyOutput, stderr: verifyError } = await execAsync(
      `npm run verify '${pdfDir}' '${qrDir}' '${jsonFile}'`
    );
    
    console.log("Verification output:");
    console.log(verifyOutput);
    if (verifyError) {
      console.log("Verification errors:");
      console.log(verifyError);
    }
    
    console.log("\n✅ Example completed successfully!");
    console.log("\n📊 Check the verification report in the PDF directory for detailed results.");
    
  } catch (error) {
    console.error("❌ Example failed:", error.message);
    process.exit(1);
  }
}

// Run the example
runExample();
