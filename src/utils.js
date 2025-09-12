import { v4 as uuidv4 } from "uuid";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { readFile, mkdir, readdir } from "node:fs/promises";
import path from "path";
import { toFile } from "qrcode";
import Jimp from "jimp";
import PDFDocument from "pdfkit";
import { createWriteStream } from "node:fs";

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
  try {
    const { outputPath, qrCodesFolder } = generateQrCodesJSONFile(
      count,
      baseUrl,
      urlParams
    );
    console.log(`QR codes generated and saved to ${outputPath}`);

    const qrsFolder = path.join(qrCodesFolder, "qrs");
    await mkdir(qrsFolder, { recursive: true });

    console.log("Generating QR codes from JSON file...");
    await generateQRCodesFromJSON(outputPath, qrsFolder);
    console.log("QR codes generated from JSON file");

    if (hasFlyers) {
      console.log("Generating flyers...");

      const flyersFolder = path.join(qrCodesFolder, "flyers");
      const flyersPdfFolder = path.join(flyersFolder, "pdf");
      const flyersImgFolder = path.join(flyersFolder, "img");

      await mkdir(flyersPdfFolder, { recursive: true });
      await mkdir(flyersImgFolder, { recursive: true });

      const flyerFilePath = path.join(
        process.cwd(),
        inputDataFolderName,
        "/",
        "halloween_hunt.png"
      );
      await generatePdfFlyers(
        flyerFilePath,
        qrsFolder,
        flyersPdfFolder,
        flyersImgFolder
      );
      console.log("Flyers generated");
    }
  } catch (err) {
    console.log(err);
  }
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
        console.log("Data sourced from json file");
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

const generatePdfFlyers = async (
  designFilePath,
  qrCodesDirPath,
  pdfOutputDir,
  imgOutputDir
) => {
  try {
    const allFiles = await readdir(qrCodesDirPath);
    const qrCodes = allFiles.filter((file) => file.endsWith(".png"));
    if (qrCodes.length > 0) {
      const outputFileName = path.join(pdfOutputDir, "flyers.pdf");
      const doc = new PDFDocument({ size: "A4", autoFirstPage: false });
      doc.pipe(createWriteStream(outputFileName));

      for (let i = 1; i <= qrCodes.length; i++) {
        doc.addPage();

        const flyer = await Jimp.read(designFilePath);
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
