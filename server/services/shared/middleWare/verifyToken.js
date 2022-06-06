const jwt = require('jsonwebtoken');

/**
 * Use to validate expired time of BP token
 * Usage:
 * const verify = require('../shared/middleWare/verifyToken');
 * router.post('/update/:username', verify, async (req, res, next) => {}
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
const auth = (req, res, next) => {
  // Token in header as Bearer token_text
  const reqHeader = req.header('Authorization');
  const token = reqHeader ? reqHeader.split(' ')[1] : null;
  if (!token) return res.status(401).send('Access Denied');

  try {
    const verified = jwt.verify(token, Buffer.from(process.env.BP_SECRET, 'base64'));
    if (Date.now() > verified.exp * 1000) throw 'Expired Token';
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).send('Invalid or expired Token');
  }
};

module.exports = auth;
