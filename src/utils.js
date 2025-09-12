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
          console.log(`Generated QR code for ${qrDataUrl} at ${outputPath}`);
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
      console.log("Inserting QR Codes from into pdf files...");

      for (let i = 1; i <= qrCodes.length; i++) {
        const outputFileName = path.join(pdfOutputDir, `flyer_${i}.pdf`);
        try {
          const qrCodeImagePath = qrCodesDirPath.concat("/", qrCodes[i - 1]);
          const pdfBuffer = await readFile(templatePdfPath);
          const pngBuffer = await readFile(qrCodeImagePath);

          const existingPdf = await PDFDocument.load(pdfBuffer);
          const pngImage = await existingPdf.embedPng(pngBuffer);
          const existingPdfPages = existingPdf.getPages();
          const firstPage = existingPdfPages[0];

          const pngDims = pngImage.scale(0.7);
          const xPosition = 374;
          const yPosition = 329;

          firstPage.drawImage(pngImage, {
            x: xPosition,
            y: yPosition,
            width: pngDims.width,
            height: pngDims.height,
          });
          const pdfBytes = await existingPdf.save(outputFileName);
          await writeFile(outputFileName, pdfBytes);
        } catch (err) {
          console.log("Error copying file:", err);
        }
      }
    } else {
      console.log("No qr codes to generate flyers");
    }
  } catch (error) {
    console.log("Error in generatePdfFlyers:", error);
  }
};
