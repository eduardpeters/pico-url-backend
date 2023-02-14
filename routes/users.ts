import express from 'express';
import usersController from '../controllers/users';
import verifyJWT from '../middleware/verifyJWT';
const router = express.Router();

router.post('/', usersController.registerUser);
router.get('/', verifyJWT, usersController.getUser);
router.delete('/', verifyJWT, usersController.deleteUser);
router.patch('/', verifyJWT, usersController.updateUser);


export default router;