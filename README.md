# Generate QR Codes from file

Script generating qr codes images based on the file provided.

### Working mechanism

1. Create a folder named data at the root of the project directory
2. Add the data urls file (either JSON or XLSX, see below)
3. The template of the flyer

### File Format
##### JSON
- Must contain the property `baseUrl` with a string at least 10 characters long
- Must contain the property `hash` which is an array of string containing at least 1 element

##### EXCEL
- Must have the data in the first sheet
- Must contain the word `URL` in the first row
  - Following row of the same column contains the data to encode in the QR Code

### Flyer template

In order to generate x files (where x is the number of QR Codes generated), you need to provide a design file which should be a `.png` and saved into the `data`repository