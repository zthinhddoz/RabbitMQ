import { Router } from 'express';
const router = Router();
const formidable = require('formidable');
const fs = require('fs');
import logger from '~/shared/logger';

router.post('/upload', async (req, res) => {
    try {
        let form = new formidable.IncomingForm();
        form.parse(req, function (err, fields, files) {
            let newName = fields.name;
            let oldpath = files.file.path;
            let newpath = process.cwd() + process.env.REACT_APP_HTTP_SERVE_PATH + newName;
            fs.stat(newpath, function (err, stats) {
                fs.unlink(newpath, function (err) {
                    if (err) return
                });
                fs.copyFile(oldpath, newpath, function (err) {
                    if (err) {
                        res.status(500).json({ errorCode: 507 });
                    } else {
                        res.write("Path save file: " + newpath.toString());
                        return res.end();
                    }
                })
            });
        });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ errorCode: 505 });
    }
});

router.get(`/read/:fileName`, async (req, res) => {
    try {
        var path = process.cwd() + process.env.REACT_APP_HTTP_SERVE_PATH + req.params.fileName;
        fs.readFile(path, (err, data) => {
            if (err) {
                res.status(500).json({ errorCode: 507 });
            } else {
                return res.end(data);
            }
        });
    } catch (error) {
       logger.error(error);
       res.status(500).json({ errorCode: 506 });
    }
});

export default router;
