import express from 'express';
import UserController from '../../../controller/UserController';
import Authentication from '../../../middleware/authentication.js';

const router = express.Router();

export default (usersController: UserController) => {
  router.post('/register', usersController.registerUser.bind(usersController));
  router.post('/login', usersController.loginUser.bind(usersController));
  router.get('/my-profile', Authentication(), usersController.myProfile.bind(usersController));
  router.post('/update-admin', Authentication(), usersController.updateAdminProfile.bind(usersController));
  router.post('/update-profile', Authentication(), usersController.updateProfile.bind(usersController));
  router.post('/forgot-password', Authentication(), usersController.forgotPassword.bind(usersController));
  router.post('/change-password', Authentication(), usersController.changePassword.bind(usersController));
  router.get('/enable-two-factor', Authentication(), usersController.enableTwoFactor.bind(usersController));
  router.get('/disable-two-factor', Authentication(), usersController.disableTwoFactor.bind(usersController));
  return router;
};
