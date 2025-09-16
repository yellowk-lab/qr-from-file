import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "path";
import { PDFDocument } from "pdf-lib";

/**
 * Verify PDF structure and correlate with expected QR codes
 * @param {string} pdfPath - Path to the PDF file
 * @param {Array} expectedHashes - Array of expected hash values
 * @param {string} baseUrl - Base URL for QR codes
 * @param {string} urlParams - URL parameters
 * @returns {Promise<Object>} Verification result for this PDF
 */
export async function verifyPDFStructure(pdfPath, expectedHashes, baseUrl, urlParams) {
  try {
    console.log(`📄 Processing PDF: ${path.basename(pdfPath)}`);
    
    // Load PDF
    const pdfBuffer = await readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();
    
    console.log(`📊 Found ${pageCount} pages in PDF`);
    
    const result = {
      filename: path.basename(pdfPath),
      pages: pageCount,
      success: true,
      errors: [],
      qrCodes: []
    };
    
    // For single-page PDFs, we expect one QR code per PDF
    if (pageCount === 1) {
      // Extract the expected QR code URL for this PDF
      const pdfIndex = extractPDFIndex(pdfPath);
      if (pdfIndex !== null && pdfIndex < expectedHashes.length) {
        const expectedHash = expectedHashes[pdfIndex];
        const expectedUrl = `${baseUrl}${baseUrl.endsWith('/') ? '' : '/'}${expectedHash}${urlParams}`;
        
        result.qrCodes.push({
          page: 1,
          expectedUrl: expectedUrl,
          expectedHash: expectedHash,
          status: 'expected'
        });
        
        console.log(`✅ Page 1: Expected QR code with hash ${expectedHash}`);
      } else {
        result.errors.push(`Could not determine expected QR code for ${path.basename(pdfPath)}`);
        result.success = false;
      }
    } else {
      // For multi-page PDFs, we expect one QR code per page
      for (let i = 1; i <= pageCount; i++) {
        const pageIndex = (pdfIndex || 0) + i - 1;
        if (pageIndex < expectedHashes.length) {
          const expectedHash = expectedHashes[pageIndex];
          const expectedUrl = `${baseUrl}${baseUrl.endsWith('/') ? '' : '/'}${expectedHash}${urlParams}`;
          
          result.qrCodes.push({
            page: i,
            expectedUrl: expectedUrl,
            expectedHash: expectedHash,
            status: 'expected'
          });
          
          console.log(`✅ Page ${i}: Expected QR code with hash ${expectedHash}`);
        } else {
          result.errors.push(`Page ${i}: No expected QR code available`);
          result.success = false;
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Error processing PDF ${pdfPath}:`, error.message);
    return {
      filename: path.basename(pdfPath),
      success: false,
      error: error.message,
      qrCodes: []
    };
  }
}

/**
 * Extract PDF index from filename (e.g., flyer_1.pdf -> 0, flyer_2.pdf -> 1)
 * @param {string} pdfPath - Path to the PDF file
 * @returns {number|null} PDF index or null if not found
 */
function extractPDFIndex(pdfPath) {
  const filename = path.basename(pdfPath);
  const match = filename.match(/flyer_(\d+)\.pdf$/i);
  if (match) {
    return parseInt(match[1]) - 1; // Convert to 0-based index
  }
  return null;
}

/**
 * Verify QR codes in PDF files against JSON data
 * @param {string} pdfDir - Directory containing PDF files
 * @param {string} jsonPath - Path to the JSON file with expected QR codes
 * @param {string} tempDir - Temporary directory for processing
 * @returns {Promise<Object>} Verification results
 */
export async function verifyPDFQRCodes(pdfDir, jsonPath, tempDir) {
  try {
    console.log("🔍 Starting PDF QR Code Verification...");
    
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
    const files = await readdir(pdfDir);
    const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
    
    if (pdfFiles.length === 0) {
      throw new Error(`No PDF files found in ${pdfDir}`);
    }
    
    console.log(`📁 Found ${pdfFiles.length} PDF files to verify`);
    
    const verificationResults = {
      totalPdfs: pdfFiles.length,
      totalPages: 0,
      totalQRCodesExpected: expectedHashes.length,
      pdfResults: [],
      errors: [],
      summary: {
        success: true,
        missingPDFs: [],
        missingQRCodes: [],
        extraQRCodes: [],
        mismatchedQRCodes: []
      }
    };
    
    const foundHashes = new Set();
    
    // Process each PDF file
    for (const pdfFile of pdfFiles) {
      const pdfPath = path.join(pdfDir, pdfFile);
      console.log(`\n📄 Verifying: ${pdfFile}`);
      
      try {
        const pdfResult = await verifyPDFStructure(pdfPath, expectedHashes, baseUrl, urlParams);
        
        verificationResults.totalPages += pdfResult.pages || 0;
        verificationResults.pdfResults.push(pdfResult);
        
        // Track found hashes
        for (const qrCode of pdfResult.qrCodes) {
          if (qrCode.expectedHash) {
            foundHashes.add(qrCode.expectedHash);
          }
        }
        
        if (!pdfResult.success) {
          verificationResults.summary.success = false;
        }
        
      } catch (error) {
        console.log(`❌ Error processing ${pdfFile}: ${error.message}`);
        verificationResults.pdfResults.push({
          filename: pdfFile,
          success: false,
          error: error.message,
          qrCodes: []
        });
        verificationResults.errors.push(`${pdfFile}: ${error.message}`);
        verificationResults.summary.success = false;
      }
    }
    
    // Check for missing PDFs
    if (pdfFiles.length < expectedHashes.length) {
      verificationResults.summary.missingPDFs.push({
        expected: expectedHashes.length,
        found: pdfFiles.length,
        difference: expectedHashes.length - pdfFiles.length
      });
      console.log(`❌ PDF count mismatch: expected ${expectedHashes.length}, found ${pdfFiles.length}`);
    } else {
      console.log(`✅ PDF count matches: ${pdfFiles.length}`);
    }
    
    // Check for missing QR codes
    for (const expectedHash of expectedHashes) {
      if (!foundHashes.has(expectedHash)) {
        verificationResults.summary.missingQRCodes.push({
          hash: expectedHash,
          status: "Not found in any PDF"
        });
      }
    }
    
    // Check for extra PDFs
    if (pdfFiles.length > expectedHashes.length) {
      verificationResults.summary.extraQRCodes.push({
        count: pdfFiles.length - expectedHashes.length,
        status: "More PDFs found than expected"
      });
    }
    
    // Determine overall success
    verificationResults.summary.success = 
      verificationResults.summary.missingPDFs.length === 0 &&
      verificationResults.summary.missingQRCodes.length === 0 &&
      verificationResults.summary.extraQRCodes.length === 0 &&
      verificationResults.errors.length === 0;
    
    return verificationResults;
    
  } catch (error) {
    console.error("❌ Verification failed:", error.message);
    throw error;
  }
}

/**
 * Extract hash from QR code URL
 * @param {string} qrUrl - The QR code URL
 * @param {string} baseUrl - Expected base URL
 * @param {string} urlParams - Expected URL parameters
 * @returns {string|null} Extracted hash or null if not found
 */
function extractHashFromURL(qrUrl, baseUrl, urlParams) {
  try {
    // Remove base URL and URL params to get the hash
    let cleanUrl = qrUrl;
    
    if (baseUrl) {
      cleanUrl = cleanUrl.replace(baseUrl, '');
    }
    
    if (urlParams) {
      cleanUrl = cleanUrl.replace(urlParams, '');
    }
    
    // Remove leading/trailing slashes
    cleanUrl = cleanUrl.replace(/^\/+|\/+$/g, '');
    
    // Check if it looks like a UUID (hash)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(cleanUrl)) {
      return cleanUrl;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Generate a detailed verification report
 * @param {Object} results - Verification results
 * @returns {string} Formatted report
 */
export function generateVerificationReport(results) {
  let report = "\n" + "=".repeat(80) + "\n";
  report += "📊 PDF QR CODE VERIFICATION REPORT\n";
  report += "=".repeat(80) + "\n\n";
  
  // Summary
  report += "📈 SUMMARY:\n";
  report += `   Total PDFs processed: ${results.totalPdfs}\n`;
  report += `   Total pages: ${results.totalPages}\n`;
  report += `   QR codes expected: ${results.totalQRCodesExpected}\n`;
  report += `   Verification status: ${results.summary.success ? '✅ SUCCESS' : '❌ FAILED'}\n\n`;
  
  // PDF Results
  report += "📄 PDF FILES:\n";
  report += "-".repeat(40) + "\n";
  
  for (const pdfResult of results.pdfResults) {
    report += `\n📁 ${pdfResult.filename}:\n`;
    report += `   Pages: ${pdfResult.pages || 0}\n`;
    report += `   Status: ${pdfResult.success ? '✅ Success' : '❌ Failed'}\n`;
    
    if (pdfResult.qrCodes && pdfResult.qrCodes.length > 0) {
      report += `   Expected QR Codes:\n`;
      for (const qrCode of pdfResult.qrCodes) {
        report += `     Page ${qrCode.page}: ${qrCode.expectedHash}\n`;
      }
    }
    
    if (pdfResult.errors && pdfResult.errors.length > 0) {
      report += `   Errors:\n`;
      for (const error of pdfResult.errors) {
        report += `     - ${error}\n`;
      }
    }
    
    if (pdfResult.error) {
      report += `   Error: ${pdfResult.error}\n`;
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
    report += "\n❌ MISSING QR CODES:\n";
    report += "-".repeat(40) + "\n";
    for (const missing of results.summary.missingQRCodes) {
      report += `   Hash: ${missing.hash}\n`;
      report += `   Status: ${missing.status}\n\n`;
    }
  }
  
  if (results.summary.extraQRCodes.length > 0) {
    report += "\n⚠️  EXTRA FILES:\n";
    report += "-".repeat(40) + "\n";
    for (const extra of results.summary.extraQRCodes) {
      report += `   ${extra.status}\n`;
      report += `   Count: ${extra.count}\n\n`;
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

