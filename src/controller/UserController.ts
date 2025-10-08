import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { Op } from 'sequelize';
import UsersModel from '../models/users';
import { statusCodes } from '../utils/constants';
import logger from '../utils/logger.js';
import { prepareJSONResponse, createValidator, createFilterBody, generatePassword } from '../utils/utils.js';
import SqlError from '../errors/sqlError.js';

export default class UsersController {
  // @ts-ignore
  private usersModel: UsersModel;

  constructor(
    // @ts-ignore
    usersModel: UsersModel,
  ) {
    this.usersModel = usersModel;
  }

  async getUsers(req: Request, res: Response) {
    const requestData = req.query;
    let responseData = prepareJSONResponse({}, 'Error', statusCodes.INTERNAL_SERVER_ERROR);

    try {
      const where: any = { status: 1 };

      if (requestData.name) {
        where.first_name = { [Op.like]: `%${requestData.name}%` };
      }
      if (requestData.email) {
        where.email = { [Op.like]: `%${requestData.email}%` };
      }

      const users = await this.usersModel.findAll({
        where,
        order: [['first_name', 'ASC']],
      });

      logger.info('User Data retrieved successfully.');
      responseData = prepareJSONResponse(users, 'Success', statusCodes.OK);
    } catch (error) {
      logger.error('Error retrieving users.', error);
      responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
    }

    return res.status(responseData.status ?? 500).json(responseData);
  }

  async saveUser(req: Request, res: Response) {
    const requestBody = req.body;
    const mandatoryFields = ['name', 'email', 'role_id'];
    const missingFields = mandatoryFields.filter((field) => !requestBody[field]);
    let responseData: any;

    if (missingFields.length > 0) {
      responseData = prepareJSONResponse(
        {},
        `Missing required fields: ${missingFields.join(', ')}`,
        statusCodes.BAD_REQUEST,
      );
      return res.status(responseData.status).json(responseData);
    }

    try {
      const updateFields: Record<string, any> = {};
      mandatoryFields.forEach((field) => {
        if (requestBody[field]) updateFields[field] = requestBody[field];
      });

      if (requestBody.id) {
        const existingUser = await this.usersModel.findOne({
          where: { id: requestBody.id, status: 1 },
        });

        if (!existingUser) {
          responseData = prepareJSONResponse({}, 'No records found to update', statusCodes.BAD_REQUEST);
        } else {
          await existingUser.update(updateFields);
          responseData = prepareJSONResponse(existingUser, 'Updated', statusCodes.OK);
        }
      } else {
        const existingUserEmail = await this.usersModel.findOne({
          where: { email: requestBody.email },
        });

        if (existingUserEmail) {
          await existingUserEmail.update(updateFields);
          responseData = prepareJSONResponse(existingUserEmail, 'User already exists, updated instead', statusCodes.OK);
        } else {
          const newUser = await this.usersModel.create(updateFields);
          responseData = prepareJSONResponse(newUser, 'Created', statusCodes.CREATED);
        }
      }
    } catch (error) {
      logger.error('Error saving user:', error);
      responseData = prepareJSONResponse(
        { error: 'Internal Server Error' },
        'Error',
        statusCodes.INTERNAL_SERVER_ERROR,
      );
    }

    logger.info(`Save User Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status ?? 500).json(responseData);
  }

  async deleteUser(req: Request, res: Response) {
    const requestBody = req.body;
    const missingFields = ['id'].filter((field) => !requestBody[field]);
    let responseData: any;

    if (missingFields.length > 0) {
      responseData = prepareJSONResponse(
        {},
        `Missing required fields: ${missingFields.join(', ')}`,
        statusCodes.BAD_REQUEST,
      );
      return res.status(responseData.status).json(responseData);
    }

    try {
      const existingUser = await this.usersModel.findOne({
        where: { id: requestBody.id, status: 1 },
      });

      if (!existingUser) {
        responseData = prepareJSONResponse({}, 'No records found to delete', statusCodes.BAD_REQUEST);
      } else {
        await existingUser.update({ status: 0 });
        responseData = prepareJSONResponse({}, 'Deleted', statusCodes.OK);
      }
    } catch (error) {
      logger.error('Error deleting user:', error);
      responseData = prepareJSONResponse(
        { error: 'Internal Server Error' },
        'Error',
        statusCodes.INTERNAL_SERVER_ERROR,
      );
    }

    logger.info(`Delete User Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status ?? 500).json(responseData);
  }

  async emailExists(email) {
    try {
      const user = await this.usersModel.findOne({
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
      const user = await this.usersModel.create(data);
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
            responseData = prepareJSONResponse(dataForUser, 'Registration successful', statusCodes.OK);
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
        const user = await this.usersModel.findOne({
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
              responseData = prepareJSONResponse(dataForUser, 'Login successful', statusCodes.OK);
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
        const user = await this.usersModel.findOne({
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
          const user = await this.usersModel.findOne({
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
}
