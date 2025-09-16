# QR Code Generator from File

A comprehensive Node.js application that generates QR codes from various file formats and creates branded flyers with embedded QR codes. The tool supports both interactive and command-line usage modes.

## Features

- **Multiple Input Formats**: Support for JSON and Excel (.xlsx) files
- **Interactive Mode**: Guided setup with folder organization for brands and events
- **Command Line Mode**: Direct generation with parameters
- **PDF Flyer Generation**: Create branded flyers with embedded QR codes
- **QR Code Verification**: Verify that all PDF pages contain correct QR codes
- **UUID Generation**: Automatic UUID generation for unique QR codes
- **Organized Output**: Structured output folders with timestamps
- **Brand Management**: Organize projects by brand and event

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd qr-from-file
```

2. Install dependencies:
```bash
npm install
```

3. Create necessary directories:
```bash
mkdir data templates
```

## Usage

### Interactive Mode (Default)

Run the application without parameters to enter interactive mode:

```bash
npm run dev
```

The interactive mode will guide you through:
1. **Brand Selection**: Choose an existing brand or create a new one
2. **Event Selection**: Choose an existing event or create a new one
3. **File Selection**: Select your data file (JSON or Excel)
4. **Template Selection**: Choose a flyer template (optional)

### Command Line Mode

Generate QR codes directly with command line parameters:

```bash
node src/index.js <count> <baseUrl> [urlParams] [hasFlyers]
```

**Parameters:**
- `count`: Number of QR codes to generate
- `baseUrl`: Base URL for the QR codes
- `urlParams`: Optional URL parameters (default: empty)
- `hasFlyers`: Generate flyers (true/false, default: false)

**Example:**
```bash
node src/index.js 10 "https://example.com/qr" "?source=flyer" true
```

### Verification Mode

Verify that all PDF files contain the correct QR codes:

```bash
npm run verify <pdf-directory> <json-file>
```

**Parameters:**
- `pdf-directory`: Directory containing the generated PDF files
- `json-file`: Path to the JSON file with expected QR codes

**Example:**
```bash
npm run verify ./outputs/qr-codes-1234567890/flyers/pdf ./outputs/qr-codes-1234567890/qr-codes-1234567890.json
```

The verification process will:
- Process all PDF files in the directory
- Verify PDF structure and page counts
- Correlate each PDF with expected QR code hashes from JSON
- Check that the correct number of PDFs were generated
- Generate a detailed report showing any missing or mismatched files
- Save the verification report to the PDF directory

## File Formats

### JSON Format

Create a JSON file in the `data` folder with the following structure:

```json
{
  "baseUrl": "https://your-domain.com/qr",
  "urlParams": "?source=flyer&campaign=summer",
  "hash": [
    "uuid-1",
    "uuid-2",
    "uuid-3"
  ]
}
```

**Requirements:**
- `baseUrl`: String with at least 10 characters
- `urlParams`: Optional URL parameters (can be empty string)
- `hash`: Array of strings (UUIDs or custom identifiers)

### Excel Format (.xlsx)

Create an Excel file in the `data` folder with:
- Data in the first sheet
- Column header containing "URL" in the first row
- URLs to encode in the corresponding rows

## Templates

### Flyer Templates

Place your flyer templates in the `templates` folder:
- **PDF Templates**: Use `.pdf` files for high-quality flyers
- **Image Templates**: Use `.png` files for image-based templates

The application will automatically embed QR codes into your templates at predefined positions.

## Output Structure

The application creates organized output folders:

```
outputs/
└── qr-codes-[timestamp]/
    ├── qr-codes-[timestamp].json    # Generated data file
    ├── qrs/                         # Individual QR code images
    └── flyers/                      # Generated flyers (if enabled)
        └── pdf/                     # PDF flyers
```

## Project Structure

```
qr-from-file/
├── src/
│   ├── index.js          # Main application entry point
│   └── utils.js          # Utility functions
├── data/                 # Input data files
├── templates/            # Flyer templates
├── brands/               # Brand organization (created automatically)
└── outputs/              # Generated files (created automatically)
```

## Dependencies

- `@inquirer/prompts`: Interactive command-line prompts
- `jimp`: Image processing
- `pdf-lib`: PDF manipulation
- `pdf2pic`: PDF to image conversion for verification
- `pdfkit`: PDF generation
- `qrcode`: QR code generation
- `qrcode-reader`: QR code reading for verification
- `uuid`: UUID generation
- `xlsx`: Excel file processing

## Examples

### Generate 5 QR codes with flyers:
```bash
node src/index.js 5 "https://scanquest.xyz/treasure-hunt/qr" "" true
```

### Interactive mode with existing data:
1. Place your `hashes.json` file in the `data` folder
2. Place your template in the `templates` folder
3. Run `npm run dev`
4. Follow the interactive prompts

## Verification

The verification system helps ensure that all your generated PDF files and QR codes are correct:

### What it checks:
- ✅ All expected PDF files exist and have reasonable file sizes
- ✅ All expected QR code images were generated
- ✅ File counts match the expected number from your JSON data
- ✅ No extra or missing files

### Usage:
```bash
npm run verify <pdf-directory> <qr-directory> <json-file>
```

### Example workflow:
1. Generate QR codes and PDFs: `node src/index.js 10 "https://example.com/qr" "" true`
2. Verify the output: `npm run verify ./outputs/qr-codes-1234567890/flyers/pdf ./outputs/qr-codes-1234567890/qrs ./outputs/qr-codes-1234567890/qr-codes-1234567890.json`
3. Check the verification report for any issues

### Exit codes:
- `0`: Verification successful
- `1`: Verification failed (missing files, count mismatches, etc.)

## Troubleshooting

- **No input files**: Ensure your data files are in the `data` folder
- **Template not found**: Check that your template file is in the `templates` folder
- **Invalid JSON**: Verify your JSON file follows the required structure
- **Permission errors**: Ensure the application has write permissions for output folders
- **Verification failures**: Check the verification report for specific issues