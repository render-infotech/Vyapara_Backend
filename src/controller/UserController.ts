import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { statusCodes } from '../utils/constants';
import logger from '../utils/logger';
import { prepareJSONResponse, createValidator, createFilterBody, generatePassword } from '../utils/utils';
import SqlError from '../errors/sqlError';
import Users from '../models/users';
import CustomerDetails from '../models/customerDetails';

export default class UsersController {
  // @ts-ignore
  private users: Users;

  // @ts-ignore
  private customerDetails: CustomerDetails;

  constructor(
    // @ts-ignore
    users: Users,
    // @ts-ignore
    customerDetails: CustomerDetails,
  ) {
    this.users = users;
    this.customerDetails = customerDetails;
  }

  async emailExists(email) {
    try {
      const user = await this.users.findOne({
        attributes: ['id', 'email'],
        where: {
          email,
          is_deactivated: 0,
        },
      });
      return user;
    } catch (error) {
      logger.error('Error emailExists in Email Exists.', error, email);
      throw new SqlError(error);
    }
  }

  async createUser(data) {
    try {
      const user = await this.users.create(data);
      return user;
    } catch (error) {
      logger.error('Error Exception in createUser.', error, data);
      throw new SqlError(error);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  async registerUser(req: Request, res: Response) {
    const requestData = req.body;
    let responseData = prepareJSONResponse({}, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
    try {
      const validateBody = ['first_name', 'email', 'password', 'confirm_password', 'is_agreed'];
      const { validationStatus, validationMessage } = createValidator(createFilterBody(requestData, validateBody));
      responseData = prepareJSONResponse({}, validationMessage, statusCodes.BAD_REQUEST);
      if (validationStatus) {
        const { password, confirm_password } = requestData;
        if (password !== confirm_password) {
          logger.info(
            `registerUser Password and confirm password do not match Req and Res: ${JSON.stringify(requestData)} - ${JSON.stringify(responseData)}`,
          );
          responseData = prepareJSONResponse(
            {},
            'Password and confirm password do not match.',
            statusCodes.BAD_REQUEST,
          );
        } else {
          // Check if this user already exists
          const userExists = await this.emailExists(requestData.email);
          responseData = prepareJSONResponse({}, 'User with this email already exists', statusCodes.BAD_REQUEST);
          if (!userExists) {
            if (requestData.password) {
              requestData.password = await bcrypt.hash(requestData.password, 10);
            }
            const newUser = await this.createUser({
              first_name: requestData.first_name,
              last_name: requestData.last_name,
              email: requestData.email,
              password: requestData.password,
              dob: requestData.dob || null,
              gender: requestData.gender || 1,
            });

            const data = {
              first_name: newUser.toJSON().first_name,
              last_name: newUser.toJSON().last_name ?? '',
              email: newUser.toJSON().email,
              role_id: newUser.toJSON().role_id ?? 10,
            };
            const jwtData = {
              userId: newUser.toJSON().id,
              ...data,
            };
            const token = jwt.sign(jwtData, process.env.JWT_PRIVKEY, { expiresIn: '365 days' });
            const dataForUser = { user: data, token, expiresIn: 365 };
            responseData = prepareJSONResponse(dataForUser, 'Success', statusCodes.OK);
            logger.info(
              `registerUser User Registered successfully, Req and Res: ${JSON.stringify(requestData)} - ${JSON.stringify(responseData)}`,
            );
          }
        }
      }
    } catch (error) {
      logger.error('Error registerUser in User Registration.', error);
      responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
    }
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async loginUser(req: Request, res: Response) {
    const requestData = req.body;
    let responseData = prepareJSONResponse({}, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
    try {
      const validateBody = ['email', 'password'];
      const { validationStatus, validationMessage } = createValidator(createFilterBody(requestData, validateBody));
      responseData = prepareJSONResponse({}, validationMessage, statusCodes.BAD_REQUEST);
      if (validationStatus) {
        const user = await this.users.findOne({
          attributes: ['id', 'first_name', 'last_name', 'email', 'password', 'role_id', 'status', 'is_deactivated'],
          where: {
            email: requestData.email,
            is_deactivated: 0,
          },
        });
        responseData = prepareJSONResponse({}, 'Invalid email or password.', statusCodes.BAD_REQUEST);
        if (user) {
          if (user.is_deactivated) {
            responseData = prepareJSONResponse({}, 'User is deactivated.', statusCodes.BAD_REQUEST);
          } else if (!user.status) {
            responseData = prepareJSONResponse(
              {},
              'Kindly contact admin for enabling the system access',
              statusCodes.BAD_REQUEST,
            );
          } else {
            const match = await bcrypt.compareSync(requestData.password, user.password);
            if (match) {
              const data = {
                first_name: user.toJSON().first_name,
                last_name: user.toJSON().last_name ?? '',
                email: user.toJSON().email,
                role_id: user.toJSON().role_id ?? 10,
              };
              setImmediate(async () => {
                try {
                  // let location = {};
                  // if (requestData.ip && requestData.ip !== '::1') {
                  //   location = await getLocationFromIP(requestData.ip);
                  //   if (!Array.isArray(location) && typeof location === 'object') {
                  //     location = JSON.stringify(location);
                  //   }
                  //   if (Array.isArray(location)) {
                  //     location = JSON.stringify(location);
                  //   }
                  // }
                  // const userLog = await this.loginAuditLogsModel.create({
                  //   user_id: user.id,
                  //   user_name: `${data.first_name} ${data.last_name}`,
                  //   ip_address: requestData.ip,
                  //   user_agent: req.headers['user-agent'] ?? null,
                  //   location,
                  // });
                  // logger.info(
                  //   `Login Audit log status for user ${user.id} with ip ${requestData.ip} - ${JSON.stringify(userLog)}`,
                  // );
                } catch (error) {
                  logger.info(`Login Audit log failed for user ${user.id} with ip ${requestData.ip} - ${error}`);
                }
              });
              const jwtData = {
                userId: user.toJSON().id,
                ...data,
              };
              const token = jwt.sign(jwtData, process.env.JWT_PRIVKEY, { expiresIn: '365 days' });
              const dataForUser = { user: data, token, expiresIn: 365 };
              responseData = prepareJSONResponse(dataForUser, 'Success', statusCodes.OK);
              logger.info(
                `loginUser User Logged in successfully, Req and Res: ${JSON.stringify(requestData)} - ${JSON.stringify(responseData)}`,
              );
            }
          }
        }
      }
    } catch (error) {
      logger.error('Error loginUser in User Login.', error);
      responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
    }
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async forgotPassword(req: Request, res: Response) {
    // @ts-ignore
    const emailEnabled = process.env.EMAIL_ENABLED === 'true' || process.env.EMAIL_ENABLED === true;
    const requestData = req.body;
    let responseData = prepareJSONResponse({}, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
    try {
      const validateBody = ['email'];
      const { validationStatus, validationMessage } = createValidator(createFilterBody(requestData, validateBody));
      responseData = prepareJSONResponse({}, validationMessage, statusCodes.BAD_REQUEST);
      if (validationStatus) {
        const user = await this.users.findOne({
          attributes: ['id', 'first_name', 'last_name', 'email', 'role_id', 'status', 'is_deactivated'],
          where: {
            email: requestData.email,
            is_deactivated: 0,
          },
        });
        responseData = prepareJSONResponse({}, 'Invalid email.', statusCodes.BAD_REQUEST);
        if (user) {
          if (!user.is_deactivated) {
            if (!user.status) {
              responseData = prepareJSONResponse(
                {},
                'Kindly contact admin for enabling the system access',
                statusCodes.BAD_REQUEST,
              );
            } else {
              const generatedPassword = generatePassword();
              logger.info(`forgotPassword Password: ${JSON.stringify(requestData)} - ${generatedPassword}`);
              requestData.password = await bcrypt.hash(generatedPassword, 10);
              await user.update({ password: requestData.password });
              // const emailBody = resetPassword(generatedPassword);
              // logger.info(`forgotPassword Email: ${JSON.stringify(requestData)} - ${emailBody}`);
              if (emailEnabled) {
                // const emailStatus = await sendEmail(user.email, emailBody, 'Password Reset');
                // logger.info(`User Forgotpassword Email Status: ${requestData.email} ${JSON.stringify(emailStatus)}`);
              }
              responseData = prepareJSONResponse({}, 'Success', statusCodes.OK);
            }
          }
        }
      }
    } catch (error) {
      logger.error('Error Exception in User Forgot password.', error);
      responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
    }
    logger.info(`forgotPassword User Req and Res: ${JSON.stringify(requestData)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async changePassword(req: Request, res: Response) {
    // @ts-ignore
    const { userId } = req.user;
    const requestData = req.body;
    let responseData = prepareJSONResponse({}, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
    try {
      const validateBody = ['old_password', 'new_password', 'confirm_password'];
      const { validationStatus, validationMessage } = createValidator(createFilterBody(requestData, validateBody));
      responseData = prepareJSONResponse({}, validationMessage, statusCodes.BAD_REQUEST);
      if (validationStatus && userId) {
        responseData = prepareJSONResponse(
          {},
          'New Password and Confirm Password do not match.',
          statusCodes.BAD_REQUEST,
        );
        if (requestData.new_password === requestData.confirm_password) {
          const user = await this.users.findOne({
            attributes: ['id', 'password', 'first_name', 'last_name', 'email', 'role_id', 'status', 'is_deactivated'],
            where: {
              id: userId,
            },
          });
          responseData = prepareJSONResponse({}, 'Invalid email.', statusCodes.BAD_REQUEST);
          if (user) {
            if (!user.is_deactivated) {
              if (!user.status) {
                responseData = prepareJSONResponse(
                  {},
                  'Kindly contact admin for enabling the system access',
                  statusCodes.BAD_REQUEST,
                );
              } else {
                const match = await bcrypt.compareSync(requestData.old_password, user.password);
                responseData = prepareJSONResponse({}, 'Invalid old password.', statusCodes.BAD_REQUEST);
                if (match) {
                  requestData.enc_password = await bcrypt.hash(requestData.new_password, 10);
                  await user.update({ password: requestData.enc_password });
                  responseData = prepareJSONResponse({}, 'Success', statusCodes.OK);
                }
              }
            }
          }
        }
      } else if (!userId) {
        responseData = prepareJSONResponse({}, 'Kindly login to perform the action.', statusCodes.BAD_REQUEST);
      }
    } catch (error) {
      logger.error('Error Exception in User Change password.', error);
      responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
    }
    logger.info(`changePassword User Req and Res: ${JSON.stringify(requestData)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async enableTwoFactor(req: Request, res: Response) {
    // @ts-ignore
    const { userId } = req.user;
    const requestData = req.body;
    let responseData = prepareJSONResponse({}, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
    try {
      if (userId) {
        const recordExists = await this.users.findOne({
          attributes: ['id', 'password', 'first_name', 'last_name', 'email', 'role_id', 'status', 'is_deactivated'],
          where: {
            id: userId,
          },
        });
        responseData = prepareJSONResponse({}, 'Invalid email.', statusCodes.BAD_REQUEST);
        if (recordExists) {
          if (!recordExists.is_deactivated) {
            if (!recordExists.status) {
              responseData = prepareJSONResponse(
                {},
                'Kindly contact admin for enabling the system access',
                statusCodes.BAD_REQUEST,
              );
            } else {
              recordExists.two_factor_enabled = 1;
              await recordExists.save();
              responseData = prepareJSONResponse({}, 'Success', statusCodes.OK);
            }
          }
        }
      } else if (!userId) {
        responseData = prepareJSONResponse({}, 'Kindly login to perform the action.', statusCodes.BAD_REQUEST);
      }
    } catch (error) {
      logger.error('enableTwoFactor - Error Exception in User enableTwoFactor', error);
      responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
    }
    logger.info(`enableTwoFactor User Req and Res: ${JSON.stringify(requestData)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async disableTwoFactor(req: Request, res: Response) {
    // @ts-ignore
    const { userId } = req.user;
    const requestData = req.body;
    let responseData = prepareJSONResponse({}, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
    try {
      if (userId) {
        const recordExists = await this.users.findOne({
          attributes: ['id', 'password', 'first_name', 'last_name', 'email', 'role_id', 'status', 'is_deactivated'],
          where: {
            id: userId,
          },
        });
        responseData = prepareJSONResponse({}, 'Invalid email.', statusCodes.BAD_REQUEST);
        if (recordExists) {
          if (!recordExists.is_deactivated) {
            if (!recordExists.status) {
              responseData = prepareJSONResponse(
                {},
                'Kindly contact admin for enabling the system access',
                statusCodes.BAD_REQUEST,
              );
            } else {
              recordExists.two_factor_enabled = 0;
              await recordExists.save();
              responseData = prepareJSONResponse({}, 'Success', statusCodes.OK);
            }
          }
        }
      } else if (!userId) {
        responseData = prepareJSONResponse({}, 'Kindly login to perform the action.', statusCodes.BAD_REQUEST);
      }
    } catch (error) {
      logger.error('disableTwoFactor - Error Exception in User disableTwoFactor', error);
      responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
    }
    logger.info(`disableTwoFactor User Req and Res: ${JSON.stringify(requestData)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }
}
