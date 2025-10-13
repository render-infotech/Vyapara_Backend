import express from 'express';
import UserController from '../../../controller/UserController';
import Authentication from '../../../middleware/authentication.js';

const router = express.Router();

export default (usersController: UserController) => {
  router.post('/register', usersController.registerUser.bind(usersController));
  router.post('/login', Authentication(), usersController.loginUser.bind(usersController));
  router.post('/change-password', Authentication(), usersController.changePassword.bind(usersController));
  return router;
};
