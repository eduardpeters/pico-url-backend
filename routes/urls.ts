import express from 'express';
import urlsController from '../controllers/urls';
import verifyJWT from '../middleware/verifyJWT';
const router = express.Router();

router.get('/:shorturl', urlsController.redirectUrl);
router.get('/', verifyJWT, urlsController.getAllUrls);
router.post('/', verifyJWT, urlsController.createUrl);
router.get('/info/:shorturl', verifyJWT, urlsController.getUrl);
router.patch('/:shorturl', verifyJWT, urlsController.updateUrl);
router.delete('/:shorturl', verifyJWT, urlsController.deleteUrl);

export default router;