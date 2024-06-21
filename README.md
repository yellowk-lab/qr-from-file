# Generate QR Codes from file

Script generating qr codes images based on the file provided.

### File Format
##### JSON
- Must contain the property `baseUrl` with a string at least 10 characters long
- Must contain the property `hash` which is an array of string containing at least 1 element

##### EXCEL
- Must have the data in the first sheet
- Must contain the word `URL` in the first row
  - Following row of the same column contains the data to encode in the QR Code