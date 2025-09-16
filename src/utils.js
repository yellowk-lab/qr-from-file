import { v4 as uuidv4 } from "uuid";
import {
  writeFileSync,
  mkdirSync,
  existsSync,
  createWriteStream,
} from "node:fs";
import { writeFile } from "node:fs/promises";
import { readFile, mkdir, readdir } from "node:fs/promises";
import path from "path";
import { toFile } from "qrcode";
import Jimp from "jimp";
import PDFDocumentKit from "pdfkit";
import { PDFDocument } from "pdf-lib";

const inputDataFolderName = "templates";
const maxFileSizeGB = 2.5;
const maxFileSizeBytes = maxFileSizeGB * 1024 * 1024 * 1024;

export const generateUUID = (count) => {
  return Array.from({ length: count }, () => uuidv4());
};

export const createJsonFile = (outputPath, data, url, urlParams) => {
  const jsonData = {
    baseUrl: url ? url : "",
    urlParams: urlParams ? urlParams : "",
    hash: data ? data : [],
  };
  try {
    writeFileSync(outputPath, JSON.stringify(jsonData, null, 2));
    console.log(`File ${outputPath} created successfully`);
  } catch (err) {
    console.error("Error creating file:", err);
  }
};

export function generateQrCodesJSONFile(count, baseUrl, urlParams) {
  const uuids = generateUUID(parseInt(count) || 1);
  const now = new Date();
  const timestamp = now.getTime();

  const outputDir = path.join(process.cwd(), "outputs");
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const qrCodesFolder = path.join(outputDir, `qr-codes-${timestamp}`);
  if (!existsSync(qrCodesFolder)) {
    mkdirSync(qrCodesFolder, { recursive: true });
  }

  const outputPath = path.join(qrCodesFolder, `qr-codes-${timestamp}.json`);
  createJsonFile(outputPath, uuids, baseUrl, urlParams);
  return { outputPath, qrCodesFolder };
}

export async function handleQrCodesGeneration(
  count,
  baseUrl,
  urlParams,
  hasFlyers
) {
  console.log("Generating QR codes and JSON file...");
  const start = performance.now();
  try {
    const { outputPath, qrCodesFolder } = generateQrCodesJSONFile(
      count,
      baseUrl,
      urlParams
    );

    const qrsFolder = path.join(qrCodesFolder, "qrs");
    await mkdir(qrsFolder, { recursive: true });

    await generateQRCodesFromJSON(outputPath, qrsFolder);

    if (hasFlyers) {
      const flyersFolder = path.join(qrCodesFolder, "flyers");
      const flyersPdfFolder = path.join(flyersFolder, "pdf");
      const flyersImgFolder = path.join(flyersFolder, "img");

      await mkdir(flyersPdfFolder, { recursive: true });
      await mkdir(flyersImgFolder, { recursive: true });

      const flyerFilePath = path.join(
        process.cwd(),
        inputDataFolderName,
        "halloween_template.pdf"
      );
      await generatePdfFlyers(flyerFilePath, qrsFolder, flyersPdfFolder);
    }
  } catch (err) {
    console.log(err);
  }
  const scriptTime = performance.now() - start;
  console.log(`Time taken: ${scriptTime} milliseconds`);
  console.log(`Time taken: ${scriptTime / 1000} seconds`);
}

export const generateQRCodesFromJSON = async (filePath, saveDirPath) => {
  try {
    const fileData = await readFile(filePath);
    const fileJSON = JSON.parse(fileData);
    let { baseUrl, urlParams } = fileJSON;
    if (
      baseUrl &&
      typeof fileJSON.baseUrl == "string" &&
      baseUrl.length >= 10
    ) {
      if (fileJSON.hash?.length > 0) {
        if (!baseUrl.endsWith("/")) {
          baseUrl = baseUrl.concat("/");
        }
        let counter = 0;
        for (let i = 0; i < fileJSON.hash.length; i++) {
          const outputPath = `${saveDirPath}/qr_${i + 1}.png`;
          const hash = fileJSON.hash[i];
          const qrDataUrl = baseUrl.concat(hash).concat(urlParams);
          await toFile(outputPath, qrDataUrl, { color: { light: "#0000" } });
          counter++;
        }
        console.log(`\nGenerated a total of ${counter} QR codes.`);
      } else {
        console.log(
          "not hash The file must content a property named 'hash' which is an array containing strings with at least 1 element"
        );
      }
    } else {
      console.log(
        "The file must content a property named 'baseUrl' with the url as a string"
      );
    }
  } catch (err) {
    console.log(err);
  }
};

const generateImageFlyers = async (
  templatePdfPath,
  qrCodesDirPath,
  pdfOutputDir,
  imgOutputDir
) => {
  try {
    const allFiles = await readdir(qrCodesDirPath);
    const qrCodes = allFiles.filter((file) => file.endsWith(".png"));
    if (qrCodes.length > 0) {
      const outputFileName = path.join(pdfOutputDir, "flyers.pdf");
      const doc = new PDFDocumentKit({ size: "A4", autoFirstPage: false });
      doc.pipe(createWriteStream(outputFileName));

      for (let i = 1; i <= qrCodes.length; i++) {
        doc.addPage();

        const flyer = await Jimp.read(templatePdfPath);
        const qrImage = await Jimp.read(
          qrCodesDirPath.concat("/", qrCodes[i - 1])
        );
        qrImage.resize(260, 260);

        const xPosition = 593;
        const yPosition = 1273;

        flyer.composite(qrImage, xPosition, yPosition);

        const flyerTempPath = path.join(imgOutputDir, `flyer_${i}.jpg`);
        await flyer.writeAsync(flyerTempPath);

        doc.image(flyerTempPath, 0, 0, { fit: [595, 842] });
      }

      doc.end();
    } else {
      console.log("No qr codes to generate flyers");
    }
  } catch (error) {
    console.log("Error in generatePdfFlyers:", error);
  }
};

export const generatePdfFlyers = async (
  templatePdfPath,
  qrCodesDirPath,
  pdfOutputDir
) => {
  try {
    const allFiles = await readdir(qrCodesDirPath);
    const qrCodes = allFiles.filter((file) => file.endsWith(".png"));
    if (qrCodes.length > 0) {
      console.log("Inserting QR Codes into PDF files with size monitoring...");
      console.log(`Total QR codes to process: ${qrCodes.length}`);

      // Load the template PDF once (we won't modify this)
      console.log("Loading template PDF...");
      const templatePdfBuffer = await readFile(templatePdfPath);
      const templatePdf = await PDFDocument.load(templatePdfBuffer);
      const templatePages = templatePdf.getPages();
      const templatePage = templatePages[0];
      console.log("Template PDF loaded successfully");

      let currentPdfIndex = 1;
      let currentPdf = null;
      let qrCodeIndex = 0;

      for (let i = 0; i < qrCodes.length; i++) {
        try {
          // Progress indicator
          if ((i + 1) % 100 === 0 || i === 0) {
            console.log(
              `Processing QR code ${i + 1}/${qrCodes.length} (${(
                ((i + 1) / qrCodes.length) *
                100
              ).toFixed(1)}%)`
            );
          }

          const qrCodeImagePath = qrCodesDirPath.concat("/", qrCodes[i]);
          const pngBuffer = await readFile(qrCodeImagePath);

          if (!currentPdf) {
            currentPdf = await PDFDocument.create();
            qrCodeIndex = 0;
            console.log(`Starting new PDF file: flyer_${currentPdfIndex}.pdf`);
          }

          // Copy template page
          const [copiedTemplatePage] = await currentPdf.copyPages(templatePdf, [
            0,
          ]);
          currentPdf.addPage(copiedTemplatePage);

          // Get the last page and add QR code
          const pages = currentPdf.getPages();
          const lastPage = pages[pages.length - 1];

          const pngImage = await currentPdf.embedPng(pngBuffer);
          const pngDims = pngImage.scale(0.95);
          const xPosition = 370;
          const yPosition = 324;

          lastPage.drawImage(pngImage, {
            x: xPosition,
            y: yPosition,
            width: pngDims.width,
            height: pngDims.height,
          });

          qrCodeIndex++;

          const shouldCheckSize =
            (i + 1) % 50 === 0 || i === qrCodes.length - 1;

          if (shouldCheckSize) {
            const tempPdfBytes = await currentPdf.save();
            const newSize = tempPdfBytes.length;
            const sizeMB = (newSize / (1024 * 1024)).toFixed(1);

            console.log(
              `Current PDF size: ${sizeMB} MB (${qrCodeIndex} pages)`
            );

            const isLastQrCode = i === qrCodes.length - 1;
            const exceedsSizeLimit = newSize >= maxFileSizeBytes;

            if (exceedsSizeLimit || isLastQrCode) {
              const outputFileName = path.join(
                pdfOutputDir,
                `flyer_${currentPdfIndex}.pdf`
              );
              await writeFile(outputFileName, tempPdfBytes);
              const sizeGB = (newSize / (1024 * 1024 * 1024)).toFixed(2);
              console.log(
                `✅ Created flyer_${currentPdfIndex}.pdf with ${qrCodeIndex} pages (${sizeGB} GB)`
              );

              if (exceedsSizeLimit && !isLastQrCode) {
                currentPdf = await PDFDocument.create();
                qrCodeIndex = 0;
                currentPdfIndex++;
                console.log(
                  `📄 Starting new PDF file: flyer_${currentPdfIndex}.pdf (size limit reached)`
                );
              }
            }
          }
        } catch (err) {
          console.log(
            `❌ Error processing QR code ${i + 1} (${qrCodes[i]}):`,
            err.message
          );
        }
      }

      console.log(`Total PDF files created: ${currentPdfIndex}`);
    } else {
      console.log("No qr codes to generate flyers");
    }
  } catch (error) {
    console.log("Error in generatePdfFlyers:", error);
  }
};
