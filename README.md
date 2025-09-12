# QR Code Generator from File

A comprehensive Node.js application that generates QR codes from various file formats and creates branded flyers with embedded QR codes. The tool supports both interactive and command-line usage modes.

## Features

- **Multiple Input Formats**: Support for JSON and Excel (.xlsx) files
- **Interactive Mode**: Guided setup with folder organization for brands and events
- **Command Line Mode**: Direct generation with parameters
- **PDF Flyer Generation**: Create branded flyers with embedded QR codes
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
- `pdfkit`: PDF generation
- `qrcode`: QR code generation
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

## Troubleshooting

- **No input files**: Ensure your data files are in the `data` folder
- **Template not found**: Check that your template file is in the `templates` folder
- **Invalid JSON**: Verify your JSON file follows the required structure
- **Permission errors**: Ensure the application has write permissions for output folders