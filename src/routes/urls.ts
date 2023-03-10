import express from 'express';
import urlsController from '../controllers/urls.js';
import verifyJWT from '../middleware/verifyJWT.js';
const router = express.Router();

router.get('/count', verifyJWT, urlsController.getUrlCount);
router.get('/:shorturl', urlsController.redirectUrl);
router.get('/', verifyJWT, urlsController.getAllUrls);
router.post('/', verifyJWT, urlsController.createUrl);
router.get('/info/:shorturl', verifyJWT, urlsController.getUrl);
router.patch('/:shorturl', verifyJWT, urlsController.updateUrl);
router.delete('/:shorturl', verifyJWT, urlsController.deleteUrl);

export default router;