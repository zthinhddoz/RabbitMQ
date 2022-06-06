
import multer from 'multer';
import path from 'path';
import AppConstants from '../../utils/constants';

/**
 * storageEngine will define specific destination when saving Google Drive Key files
 * Define storageEngine, filename to keep the original fileName
 */
const storageEngine = multer.diskStorage({
  destination: AppConstants.LOCATION_GDRIVE_KEY,
  filename: function(req, file, callBack){
    callBack(null, file.originalname);
  }
}); 

const validateFile = (file, callBack) => {
  const extensionVal = path.extname(file.originalname).toLowerCase();
  if (AppConstants.FILE_TYPE_JSON_UPLOAD === extensionVal) {
    return callBack(null, true);
  } else {
    callBack("Invalid file type. Only .JSON file are allowed.")
  }
}

/***
 * Define uploadDoc middleWare to check file and store file with original name to specific location
 * Use in router as uploadGDriveKey(req, res, (error) => {})
 */
const uploadGDriveKey = multer({
  storage: storageEngine,
  limit: { fileSize: 20000 },
  fileFilter: function(req, file, callBack) {
    validateFile(file, callBack);
  }
}).single('driveKey');

module.exports = uploadGDriveKey;