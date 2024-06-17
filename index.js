import XLSX from "xlsx";
import { toFile } from "qrcode";
import { readdir, mkdir, rmdir, lstat } from "node:fs/promises";
import { input, select } from "@inquirer/prompts";

const currentDirPattern = "./";
const inputDataFolderName = "data";
const brandsFolderName = "brands";

async function main() {
  await createInitialFoldersIfNecessary();
  const filesChoices = await getExcelFilesAsChoices();

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
    const excelFileName = await select({
      message: "Select the file you want to generate QR Codes from:",
      choices: filesChoices,
    });
    const excelFilePath = currentDirPattern.concat(
      inputDataFolderName,
      "/",
      excelFileName
    );
    await generateQRCodesFromExcelFile(excelFilePath, currentEventDirPath);
  } else {
    console.log(
      `No input files to generate qr codes.\nAdd Excel file into ${inputDataFolderName} folder before launch script`
    );
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

const getExcelFilesAsChoices = async () => {
  const files = await readdir(currentDirPattern.concat(inputDataFolderName));
  const filteredFiles = files.filter((file) => file.endsWith(".xlsx"));
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

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
