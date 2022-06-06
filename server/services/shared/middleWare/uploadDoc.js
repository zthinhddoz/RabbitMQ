import multer from 'multer';
import path from 'path';
import AppConstants from '../../utils/constants';

/**
 * storageEngine will define specific destination when saving Doc files
 * Define storageEngine, filename to keep the original fileName
 */
const storageEngine = multer.diskStorage({
  destination: AppConstants.LOCATION_DOC_FILE,
  filename(req, file, callBack) {
    callBack(null, file.originalname);
  },
});

const validateFile = (file, callBack) => {
  const extensionVal = path.extname(file.originalname).toLowerCase();
  if (AppConstants.FILE_TYPE_DOC_UPLOAD.includes(extensionVal)) {
    return callBack(null, true);
  }
  callBack('Invalid file type. Only PDF, PNG, JPG, XLS and XLSX file are allowed.');
};

/** *
 * Define uploadDoc middleWare to check file and store file with original name to specific location
 * Use in router as uploadDoc(req, res, (error) => {})
 */
const uploadDoc = multer({
  storage: storageEngine,
  limit: { fileSize: 200000 },
  fileFilter(req, file, callBack) {
    validateFile(file, callBack);
  },
}).single('my_file');

module.exports = uploadDoc;
