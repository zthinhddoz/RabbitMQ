import { Router } from 'express';
import logger from '~/shared/logger';

const router = Router();

/**
 * @example GET /hello-world
 */
router.get('/', (req, res) => {
  logger.info('HELLO');
  res.send('Hello, World!');
});

export default router;
