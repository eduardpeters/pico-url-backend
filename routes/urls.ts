import express from 'express';
import urlsController from '../controllers/urls';
const router = express.Router();

router.get('/', urlsController.getAllUrls);
router.get('/:shorturl', urlsController.getUrl);
router.post('/', urlsController.createUrl);
router.patch('/:shorturl', urlsController.updateUrl);
router.delete('/:shorturl', urlsController.deleteUrl);

export default router;