import { readFile, readdir, stat } from "node:fs/promises";
import path from "path";

/**
 * Simple verification that checks if PDF files exist and correspond to QR codes
 * @param {string} pdfDir - Directory containing PDF files
 * @param {string} qrDir - Directory containing QR code images
 * @param {string} jsonPath - Path to the JSON file with expected QR codes
 * @returns {Promise<Object>} Verification results
 */
export async function verifyPDFQRCodesSimple(pdfDir, qrDir, jsonPath) {
  try {
    console.log("🔍 Starting Simple PDF QR Code Verification...");
    
    // Read JSON data
    const jsonData = await readFile(jsonPath, 'utf8');
    const expectedData = JSON.parse(jsonData);
    
    if (!expectedData.hash || !Array.isArray(expectedData.hash)) {
      throw new Error("Invalid JSON format: missing or invalid 'hash' array");
    }
    
    const expectedHashes = expectedData.hash;
    const baseUrl = expectedData.baseUrl || "";
    const urlParams = expectedData.urlParams || "";
    
    console.log(`📋 Expected ${expectedHashes.length} QR codes from JSON`);
    console.log(`🌐 Base URL: ${baseUrl}`);
    
    // Get all PDF files
    const pdfFiles = await readdir(pdfDir);
    const pdfFilesFiltered = pdfFiles.filter(file => file.toLowerCase().endsWith('.pdf'));
    
    // Get all QR code files
    const qrFiles = await readdir(qrDir);
    const qrFilesFiltered = qrFiles.filter(file => file.toLowerCase().endsWith('.png'));
    
    console.log(`📁 Found ${pdfFilesFiltered.length} PDF files`);
    console.log(`🖼️  Found ${qrFilesFiltered.length} QR code files`);
    
    const verificationResults = {
      totalPdfs: pdfFilesFiltered.length,
      totalQRCodes: qrFilesFiltered.length,
      totalQRCodesExpected: expectedHashes.length,
      pdfResults: [],
      qrResults: [],
      errors: [],
      summary: {
        success: true,
        missingPDFs: [],
        missingQRCodes: [],
        extraFiles: []
      }
    };
    
    // Check PDF files
    console.log("\n📄 Checking PDF files...");
    for (const pdfFile of pdfFilesFiltered) {
      const pdfPath = path.join(pdfDir, pdfFile);
      try {
        const stats = await stat(pdfPath);
        const sizeKB = Math.round(stats.size / 1024);
        
        verificationResults.pdfResults.push({
          filename: pdfFile,
          size: stats.size,
          sizeKB: sizeKB,
          exists: true,
          success: true
        });
        
        console.log(`✅ ${pdfFile} (${sizeKB} KB)`);
      } catch (error) {
        verificationResults.pdfResults.push({
          filename: pdfFile,
          exists: false,
          success: false,
          error: error.message
        });
        console.log(`❌ ${pdfFile}: ${error.message}`);
      }
    }
    
    // Check QR code files
    console.log("\n🖼️  Checking QR code files...");
    for (const qrFile of qrFilesFiltered) {
      const qrPath = path.join(qrDir, qrFile);
      try {
        const stats = await stat(qrPath);
        const sizeKB = Math.round(stats.size / 1024);
        
        verificationResults.qrResults.push({
          filename: qrFile,
          size: stats.size,
          sizeKB: sizeKB,
          exists: true,
          success: true
        });
        
        console.log(`✅ ${qrFile} (${sizeKB} KB)`);
      } catch (error) {
        verificationResults.qrResults.push({
          filename: qrFile,
          exists: false,
          success: false,
          error: error.message
        });
        console.log(`❌ ${qrFile}: ${error.message}`);
      }
    }
    
    // Check counts
    console.log("\n📊 Checking counts...");
    
    if (pdfFilesFiltered.length !== expectedHashes.length) {
      verificationResults.summary.missingPDFs.push({
        expected: expectedHashes.length,
        found: pdfFilesFiltered.length,
        difference: expectedHashes.length - pdfFilesFiltered.length
      });
      console.log(`❌ PDF count mismatch: expected ${expectedHashes.length}, found ${pdfFilesFiltered.length}`);
    } else {
      console.log(`✅ PDF count matches: ${pdfFilesFiltered.length}`);
    }
    
    if (qrFilesFiltered.length !== expectedHashes.length) {
      verificationResults.summary.missingQRCodes.push({
        expected: expectedHashes.length,
        found: qrFilesFiltered.length,
        difference: expectedHashes.length - qrFilesFiltered.length
      });
      console.log(`❌ QR code count mismatch: expected ${expectedHashes.length}, found ${qrFilesFiltered.length}`);
    } else {
      console.log(`✅ QR code count matches: ${qrFilesFiltered.length}`);
    }
    
    // Check for extra files
    if (pdfFilesFiltered.length > expectedHashes.length) {
      verificationResults.summary.extraFiles.push({
        type: 'PDF',
        count: pdfFilesFiltered.length - expectedHashes.length,
        files: pdfFilesFiltered.slice(expectedHashes.length)
      });
    }
    
    if (qrFilesFiltered.length > expectedHashes.length) {
      verificationResults.summary.extraFiles.push({
        type: 'QR',
        count: qrFilesFiltered.length - expectedHashes.length,
        files: qrFilesFiltered.slice(expectedHashes.length)
      });
    }
    
    // Determine overall success
    verificationResults.summary.success = 
      verificationResults.summary.missingPDFs.length === 0 &&
      verificationResults.summary.missingQRCodes.length === 0 &&
      verificationResults.errors.length === 0;
    
    return verificationResults;
    
  } catch (error) {
    console.error("❌ Verification failed:", error.message);
    throw error;
  }
}

/**
 * Generate a detailed verification report
 * @param {Object} results - Verification results
 * @returns {string} Formatted report
 */
export function generateSimpleVerificationReport(results) {
  let report = "\n" + "=".repeat(80) + "\n";
  report += "📊 SIMPLE PDF QR CODE VERIFICATION REPORT\n";
  report += "=".repeat(80) + "\n\n";
  
  // Summary
  report += "📈 SUMMARY:\n";
  report += `   Total PDFs found: ${results.totalPdfs}\n`;
  report += `   Total QR codes found: ${results.totalQRCodes}\n`;
  report += `   QR codes expected: ${results.totalQRCodesExpected}\n`;
  report += `   Verification status: ${results.summary.success ? '✅ SUCCESS' : '❌ FAILED'}\n\n`;
  
  // PDF Results
  report += "📄 PDF FILES:\n";
  report += "-".repeat(40) + "\n";
  
  for (const pdfResult of results.pdfResults) {
    report += `\n📁 ${pdfResult.filename}:\n`;
    report += `   Size: ${pdfResult.sizeKB} KB\n`;
    report += `   Status: ${pdfResult.success ? '✅ Success' : '❌ Failed'}\n`;
    
    if (pdfResult.error) {
      report += `   Error: ${pdfResult.error}\n`;
    }
  }
  
  // QR Code Results
  report += "\n🖼️  QR CODE FILES:\n";
  report += "-".repeat(40) + "\n";
  
  for (const qrResult of results.qrResults) {
    report += `\n📁 ${qrResult.filename}:\n`;
    report += `   Size: ${qrResult.sizeKB} KB\n`;
    report += `   Status: ${qrResult.success ? '✅ Success' : '❌ Failed'}\n`;
    
    if (qrResult.error) {
      report += `   Error: ${qrResult.error}\n`;
    }
  }
  
  // Issues
  if (results.summary.missingPDFs.length > 0) {
    report += "\n❌ MISSING PDF FILES:\n";
    report += "-".repeat(40) + "\n";
    for (const missing of results.summary.missingPDFs) {
      report += `   Expected: ${missing.expected}, Found: ${missing.found}\n`;
      report += `   Missing: ${missing.difference} files\n\n`;
    }
  }
  
  if (results.summary.missingQRCodes.length > 0) {
    report += "\n❌ MISSING QR CODE FILES:\n";
    report += "-".repeat(40) + "\n";
    for (const missing of results.summary.missingQRCodes) {
      report += `   Expected: ${missing.expected}, Found: ${missing.found}\n`;
      report += `   Missing: ${missing.difference} files\n\n`;
    }
  }
  
  if (results.summary.extraFiles.length > 0) {
    report += "\n⚠️  EXTRA FILES:\n";
    report += "-".repeat(40) + "\n";
    for (const extra of results.summary.extraFiles) {
      report += `   ${extra.type} files: ${extra.count} extra\n`;
      if (extra.files && extra.files.length > 0) {
        report += `   Files: ${extra.files.join(', ')}\n`;
      }
      report += "\n";
    }
  }
  
  if (results.errors.length > 0) {
    report += "\n❌ PROCESSING ERRORS:\n";
    report += "-".repeat(40) + "\n";
    for (const error of results.errors) {
      report += `   ${error}\n`;
    }
  }
  
  report += "\n" + "=".repeat(80) + "\n";
  
  return report;
}
