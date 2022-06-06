/* eslint-disable no-useless-catch */
/* eslint-disable no-plusplus */
/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-syntax */
import fs from 'fs';
import axios from 'axios';
import { PDFDocument } from 'pdf-lib';
import { saveFileProc, checkAddFolderDoc, checkAddFolderGGDrive , saveFileExcelProc} from '~/utils/commonFuncs';
import DocDataServices from '../docData/DocDataServices';
import CoreAdapterServices from '../coreAdapter/CoreAdapter';
import AppConstants from '../utils/constants';

export const createNewDocInfo = (latestDoc, docNm) => {
  const lastDocId = latestDoc ? latestDoc.doc_id : 0;
  const newDocId = (Number(lastDocId) + 1).toString();
  const newDocName = `${newDocId}_${docNm}`;
  return [newDocId, newDocName];
};

const writeBytesToFile = async (fileName, fileBytes) => fs.promises.writeFile(fileName, fileBytes);

const saveByteAsPdf = async (fileData, docName, folderLoc) => {
  try {
    await checkAddFolderDoc(folderLoc);
    await writeBytesToFile(
      `${AppConstants.LOCATION_DOC_FILE}/${folderLoc}/${docName}`,
      new Buffer.from(JSON.parse(fileData)),
    );
  } catch (err) {
    throw err;
  }
};

const savePdfTask = splitInfos => {
  const pdfSaveTask = [];
  for (const pdfInfo of splitInfos) {
    const { fileData, docNm, folderLoc } = pdfInfo;
    pdfSaveTask.push(saveByteAsPdf(fileData, docNm, folderLoc));
  }
  return Promise.all(pdfSaveTask);
};

const saveDexDocs = (splitDexDocs, usrId) => {
  const listSaveTask = [];
  for (const docInfo of splitDexDocs) {
    const dexDocInfo = {
      doc_id: docInfo.docId,
      doc_nm: docInfo.docNm,
      co_cd: docInfo.coCd,
      loc_id: docInfo.locId,
      loc_cd: docInfo.locCd,
      doc_tp_id: docInfo.docTpId,
      root_nm: docInfo.rootNm,
      cre_usr_id: usrId || 'no-user',
      file_sz: docInfo.fileSz,
      prnt_file_nm: docInfo.prntFileNm,
      prnt_doc_id: docInfo.prnt_doc_id,
    };
    listSaveTask.push(DocDataServices.addDexdoc(dexDocInfo));
  }
  return Promise.all(listSaveTask);
};

const makeSaveDocInfos = (splitInfos, fileName, currentDocId, coCd, locCd, prnt_doc_id, usrId, ) => {
  const fileCount = splitInfos.length;
  const prntFileNm = `${currentDocId + 1}_${currentDocId + splitInfos.length - 1}_${fileName}`;
  splitInfos[0].docNm = prntFileNm;
  for (let fileNum = 1; fileNum < fileCount; fileNum++) {
    const currentSplitInfo = splitInfos[fileNum];
    const newDocId = `${currentDocId + 1}`;
    currentSplitInfo.docId = newDocId;
    currentSplitInfo.rootNm = `${fileName}_page_${JSON.stringify(currentSplitInfo.pages)}`;
    currentSplitInfo.docNm = `${newDocId}_${fileName}`;
    currentSplitInfo.fileLoc = `${currentSplitInfo.folderLoc}/${newDocId}_${fileName}`;
    currentSplitInfo.coCd = coCd;
    currentSplitInfo.locCd = locCd;
    currentSplitInfo.usrId = usrId;
    currentSplitInfo.prntFileNm = prntFileNm;
    currentSplitInfo.prnt_doc_id = prnt_doc_id;
    currentDocId += 1;
  }
  return splitInfos;
};

export const saveExtractDoc = async (splitInfos, fileName, coCd, locCd, prnt_doc_id, usrId) => {
  try {
    const latestDoc = await DocDataServices.getLatestDexDoc();
    const currentDocId = Number(latestDoc.doc_id) || 0;
    makeSaveDocInfos(splitInfos, fileName, currentDocId, coCd, locCd, prnt_doc_id, usrId);
    // Save to each document
    await savePdfTask(splitInfos);
    // If save without errors, save dex doc into the DB
    const listWithoutPrntFile = splitInfos.slice(1);
    await saveDexDocs(listWithoutPrntFile, usrId);
    return listWithoutPrntFile;
  } catch (err) {
    throw err;
  }
};

const saveImgAsPdf = async (urlFolder, originalFileName, newDocName, fileExtension) => {
  const inputFolder = `${AppConstants.LOCATION_DOC_FILE}/${urlFolder.replace("Output", "Input")}`
  const imgBytes = await fs.readFileSync(`${inputFolder}/${originalFileName}`);
  // Create a new PDFDocument
  const pdfDoc = await PDFDocument.create();

  // Embed the JPG image bytes and PNG image bytes
  let imgEmbed = null;
  if (fileExtension === 'png') {
    imgEmbed = await pdfDoc.embedPng(imgBytes);
  } else {
    imgEmbed = await pdfDoc.embedJpg(imgBytes);
  }
  // Add a blank page to the document
  const page = pdfDoc.addPage();

  const imgWidth = imgEmbed.width;
  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();

  const scaleVal = imgWidth > pageWidth ? pageWidth / imgWidth : 1;
  const imgScale = imgEmbed.scale(scaleVal);

  // Draw the JPG image in the center of the page
  page.drawImage(imgEmbed, {
    x: pageWidth / 2 - imgScale.width / 2,
    y: pageHeight / 2 - imgScale.height / 2,
    width: imgScale.width,
    height: imgScale.height,
  });
  // Serialize the PDFDocument to bytes (a Uint8Array)
  const pdfBytes = await pdfDoc.save();
  checkAddFolderDoc(urlFolder);
  await writeBytesToFile(`${AppConstants.LOCATION_DOC_FILE}/${urlFolder}/${newDocName}`, pdfBytes);
  fs.unlinkSync(`${inputFolder}/${originalFileName}`);
};

/**
 * This func help to save doc file into correct file location because multer just can save as static loc
 * This func also add to dex doc data
 */

export const uploadDocMethod = async (docData, originalFileName) => {
  try {
    const orcResultParse = docData?.ocr_result?.length ? JSON.parse(docData.ocr_result) : [];
    const latestDoc = await DocDataServices.getLatestDexDoc();
    const splitFileName = originalFileName.split('.');
    const fileExtension = splitFileName[splitFileName.length - 1]?.toLowerCase() || '';
    const fileName = splitFileName.slice(0, -1).join('.');
    const nextDocId = latestDoc.doc_id ? (Number(latestDoc.doc_id) + 1).toString() : 0;

    if (orcResultParse.length > 0) {
      // Upload splited form to dex_doc and file server
      const parentFileNm = `${nextDocId}_${(nextDocId + orcResultParse.length).toString()}_${originalFileName}`;
      const formUploadInfo = [];

      for (let i = 0; i < orcResultParse.length; i++) {
        const nextGenId = (Number(nextDocId) + i).toString();
        const nextGenNm = `${nextGenId}_${fileName}_${orcResultParse[i].file_name}`;
        const addDocData = {
          ...docData,
          doc_id: nextGenId,
          doc_nm: nextGenNm,
          prnt_file_nm: parentFileNm,
        };
        await DocDataServices.addDexdoc(addDocData);

        const response = await axios.get(`${process.env.OCR_LABEL_FILE_SERVER}/${orcResultParse[i].file_name}`, {
          responseType: 'arraybuffer',
        });
        const buffer = Buffer.from(response.data, 'utf-8');
        await checkAddFolderDoc(docData.urlFolder);
        await writeBytesToFile(`${AppConstants.LOCATION_DOC_FILE}/${docData.urlFolder}/${nextGenNm}`, buffer);

        const fileUrlUpload = `${process.env.REACT_APP_DOC_LOC}/${addDocData.urlFolder}/${nextGenNm}`;

        formUploadInfo.push({
          sts_cd: 200,
          msg: 'Insert form document success',
          file_url: fileUrlUpload,
          doc_id: nextGenId,
          co_cd: addDocData.co_cd,
          loc_cd: addDocData.loc_cd,
          doc_type: addDocData.doc_tp_id,
          file_type: fileExtension,
          file_size: Buffer.byteLength(buffer) / 1024,
          prnt_doc_id: addDocData.prnt_doc_id,
          doc_grp_id: addDocData.doc_grp_id,
          usr_id: addDocData.cre_usr_id,
        });
      }

      // Upload parent file to file server
      await saveFileProc(AppConstants.LOCATION_DOC_FILE, docData.urlFolder, originalFileName, parentFileNm);

      const parentFileUrlUpload = `${process.env.REACT_APP_DOC_LOC}/${docData.urlFolder}/${parentFileNm}`;

      return {
        sts_cd: 200,
        msg: 'Insert parent document success',
        file_url: parentFileUrlUpload,
        prnt_file_nm: parentFileNm,
        child_form_info: formUploadInfo,
      };
    } else {
      let servPath = '';
      let xlsPath = '';
      let xlsxPath = '';
      let nextDocNm = `${nextDocId}_${originalFileName}`;
      const addDocData = {
        ...docData,
        doc_id: nextDocId,
      };
      if (AppConstants.FILE_TYPE_DOC_IMG.includes(fileExtension)) {
        nextDocNm = `${nextDocId}_${fileName}.pdf`;
        await saveImgAsPdf(docData.urlFolder, originalFileName, nextDocNm, fileExtension);
        servPath = `${process.env.REACT_APP_DOC_LOC}/${addDocData.urlFolder}/${nextDocNm}`;
      } else if (AppConstants.FILE_TYPE_DOC_EXCEL.includes(fileExtension)) {
        await saveFileExcelProc(AppConstants.LOCATION_DOC_FILE, docData.urlFolder, originalFileName, `${nextDocId}_${fileName}`, nextDocId);
        servPath = `${process.env.REACT_APP_DOC_LOC}/${addDocData.urlFolder}/${nextDocId}_${fileName}.pdf`;
        xlsPath = `${process.env.REACT_APP_DOC_LOC}/${addDocData.urlFolder}/${nextDocId}_${fileName}.xls`;
        xlsxPath = `${process.env.REACT_APP_DOC_LOC}/${addDocData.urlFolder}/${nextDocId}_${fileName}.xlsx`;
      } else {
        await saveFileProc(AppConstants.LOCATION_DOC_FILE, docData.urlFolder, originalFileName, nextDocNm);
        servPath = `${process.env.REACT_APP_DOC_LOC}/${addDocData.urlFolder}/${nextDocNm}`;
      }
      addDocData.doc_nm = nextDocNm,

      await DocDataServices.addDexdoc(addDocData);
      return {
        sts_cd: 200,
        msg: 'Insert document successful',
        file_url: servPath,
        doc_id: nextDocId,
        co_cd: addDocData.co_cd,
        loc_cd: addDocData.loc_cd,
        doc_type: addDocData.doc_tp_id,
        file_type: fileExtension,
        file_size: addDocData.file_sz,
        prnt_doc_id: addDocData.prnt_doc_id,
        doc_grp_id: addDocData.doc_grp_id,
        usr_id: addDocData.cre_usr_id,
        xlsx_url: xlsxPath,
        xls_url: xlsPath,
      };
    }
  } catch (err) {
    throw err;
  }
};

export const saveImgAsPdfGGDrive = async (urlFolder, originalFileName, newDocName, fileExtension) => {
  const inFolderPath = `${AppConstants.LOCATION_DOC_FILE}/${urlFolder}/Input`
  const outFolderPath = `${AppConstants.LOCATION_DOC_FILE}/${urlFolder}/Output` 
  const imgBytes = await fs.readFileSync(`${inFolderPath}/${originalFileName}`);
  // Create a new PDFDocument
  const pdfDoc = await PDFDocument.create();
  // Embed the JPG image bytes and PNG image bytes
  let imgEmbed = null;
  if (fileExtension === 'png') {
    imgEmbed = await pdfDoc.embedPng(imgBytes);
  } else {
    imgEmbed = await pdfDoc.embedJpg(imgBytes);
  }
  // Add a blank page to the document
  const page = pdfDoc.addPage();
  const imgWidth = imgEmbed.width;
  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();

  const scaleVal = imgWidth > pageWidth ? pageWidth / imgWidth : 1;
  const imgScale = imgEmbed.scale(scaleVal);

  // Draw the JPG image in the center of the page
  page.drawImage(imgEmbed, {
    x: pageWidth / 2 - imgScale.width / 2,
    y: pageHeight / 2 - imgScale.height / 2,
    width: imgScale.width,
    height: imgScale.height,
  });
  // Serialize the PDFDocument to bytes (a Uint8Array)
  const pdfBytes = await pdfDoc.save();
  checkAddFolderGGDrive(outFolderPath);
  await writeBytesToFile(`${outFolderPath}/${newDocName}`, pdfBytes);
  fs.unlinkSync(`${inFolderPath}/${originalFileName}`);
  
};


