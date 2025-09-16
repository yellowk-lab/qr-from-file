import XLSX from "xlsx";
import { toFile } from "qrcode";
import { readdir, mkdir, lstat } from "node:fs/promises";
import { input, select } from "@inquirer/prompts";
import Jimp from "jimp";
import PDFDocument from "pdfkit";
import { createWriteStream } from "node:fs";
import { handleQrCodesGeneration, generateQRCodesFromJSON } from "./utils.js";

const currentDirPattern = "./src";
const inputDataFolderName = "data";
const brandsFolderName = "brands";

async function main(...args) {
  const [count, baseUrl, urlParams, hasFlyers, pagesOneByOne] = args;
  if (count && baseUrl) {
    await handleQrCodesGeneration(count, baseUrl, urlParams, hasFlyers, pagesOneByOne);
  } else {
    await createInitialFoldersIfNecessary();
    const filesChoices = await getAllowedFilesAsChoices([".xlsx", ".json"]);

    if (filesChoices.length > 0) {
      const brandPath = currentDirPattern.concat(brandsFolderName);
      let brandName = await selectFolderFromPath(brandPath);
      let currentBrandDirPath = brandPath.concat("/", brandName);
      if (brandName == "new") {
        brandName = await input({
          message: "What is the name of the brand?",
          validate: (value) =>
            value.length >= 3 ? true : "Must be at least 3 characters long",
        });
        currentBrandDirPath = brandPath.concat("/", brandName);
        await mkdir(currentBrandDirPath);
      }

      let eventDirname = await selectFolderFromPath(currentBrandDirPath);
      let currentEventDirPath = currentBrandDirPath.concat("/", eventDirname);
      if (eventDirname == "new") {
        const eventName = await input({
          message: "What is the name of the event?",
          validate: (value) =>
            value.length >= 3 ? true : "Must be at least 3 characters long",
        });
        currentEventDirPath = currentBrandDirPath.concat("/", eventName);
        await mkdir(currentEventDirPath);
      }
      const fileName = await select({
        message: "Select the file you want to generate QR Codes from:",
        choices: filesChoices,
      });
      const filePath = currentDirPattern.concat(
        inputDataFolderName,
        "/",
        fileName
      );
      const flyerFileTemplateFiles = await getAllowedFilesAsChoices([".png"]);
      flyerFileTemplateFiles.push({ name: "No flyer", value: "" });
      const flyerName = await select({
        message: "Select the file you want to generate QR Codes from:",
        choices: flyerFileTemplateFiles,
      });
      const flyerFilePath = currentDirPattern.concat(
        inputDataFolderName,
        "/",
        flyerName
      );
      if (fileName.endsWith(".json")) {
        await generateQRCodesFromJSON(filePath, currentEventDirPath);
        if (flyerName.length > 0) {
          await generatePdfFlyers(
            flyerFilePath,
            currentEventDirPath,
            currentEventDirPath
          );
        }
      } else if (fileName.endsWith(".xlsx")) {
        await generateQRCodesFromExcelFile(filePath, currentEventDirPath);
        if (flyerName.length > 0) {
          await generatePdfFlyers(
            flyerFilePath,
            currentEventDirPath,
            currentEventDirPath
          );
        }
      } else {
        console.log("File type not allowed");
      }
    } else {
      console.log(
        `No input files to generate qr codes.\nAdd Excel file into ${inputDataFolderName} folder before launch script`
      );
    }
  }
}

const selectFolderFromPath = async (dirPath) => {
  const dirList = await readdir(dirPath);
  const folderChoices = [];
  for (let i = 0; i < dirList.length; i++) {
    const isFolder = await (
      await lstat(dirPath.concat("/", dirList[i]))
    ).isDirectory();
    if (isFolder) {
      folderChoices.push({ name: dirList[i], value: dirList[i] });
    }
  }
  const createFolderChoice = "new";
  if (folderChoices.length > 0) {
    folderChoices.push({
      name: "Create a new folder",
      value: createFolderChoice,
    });
    return await select({
      message: "Select an existing folder or create one",
      choices: folderChoices,
    });
  } else {
    return createFolderChoice;
  }
};

const getAllowedFilesAsChoices = async (allowed) => {
  const files = await readdir(currentDirPattern.concat(inputDataFolderName));
  const filteredFiles = files.filter((file) => {
    for (let i = 0; i < allowed.length; i++) {
      if (file.endsWith(allowed[i])) {
        return file;
      }
    }
  });
  return filteredFiles.map((f) => {
    return { name: f, value: f };
  });
};

const generateQRCodesFromExcelFile = async (excelFilePath, saveDirPath) => {
  const workbook = XLSX.readFile(excelFilePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  let count = 0;

  for (const row of data) {
    if (row && row["URL"]) {
      const url = row["URL"];
      const outputPath = `${saveDirPath}/qr_${count}.png`;
      await toFile(outputPath, url);
      console.log(`Generated QR code for ${url} at ${outputPath}`);
      count++;
    }
  }

  console.log(`\nGenerated a total of ${count} QR codes.`);
  console.log(`Data sourced from sheet: "${sheetName}" in the workbook.`);
};

const generatePdfFlyers = async (
  designFilePath,
  qrCodesDirPath,
  outputDirPath
) => {
  try {
    const qrCodes = await readdir(qrCodesDirPath);
    if (qrCodes.length > 0) {
      const outputFileName = outputDirPath.concat("/flyer.pdf");
      const doc = new PDFDocument({ size: "A4", autoFirstPage: false });
      doc.pipe(createWriteStream(outputFileName));
      for (let i = 0; i < qrCodes.length; i++) {
        doc.addPage();

        const flyer = await Jimp.read(designFilePath);
        const qrImage = await Jimp.read(qrCodesDirPath.concat("/", qrCodes[i]));
        qrImage.resize(650, 650);

        const xPosition = (flyer.bitmap.width - qrImage.bitmap.width) / 2;
        const yPosition = (flyer.bitmap.height - qrImage.bitmap.height) / 2;

        flyer.composite(qrImage, xPosition, yPosition);

        const flyerTempPath = outputDirPath.concat("/", "flyer", i, ".jpg");
        await flyer.writeAsync(flyerTempPath);
        doc.image(flyerTempPath, 0, 0, { fit: [595, 842] });
      }

      doc.end();
    } else {
      console.log("No qr codes to generate flyers");
    }
  } catch (error) {
    console.log(error);
  }
};

const createInitialFoldersIfNecessary = async () => {
  const currentDirs = await readdir(currentDirPattern);
  if (currentDirs.length > 0) {
    if (!currentDirs.includes(brandsFolderName)) {
      await mkdir(brandsFolderName);
    }

    if (!currentDirs.includes(inputDataFolderName)) {
      await mkdir(inputDataFolderName);
    }
  }
};

main(...process.argv.slice(2)).catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
