import { Router } from "express";
import { customRes } from "../utils/commonFuncs";
import logger from '~/shared/logger';
import { moveFileFileFromMiddlewareToOther } from '~/utils/commonFuncs';
const uploadDoc = require('../shared/middleWare/uploadDoc');

const router = Router();

router.post('/upload-file', uploadDoc, async (req, res) => {
  try {
    const path = await moveFileFileFromMiddlewareToOther(req.file.originalname,'', 'vessel_profiles');
    return res.status(200).json({ type: req.body.file_type, path: path });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ errorCode });
  }
});

export default router;