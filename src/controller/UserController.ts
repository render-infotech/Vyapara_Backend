import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { predefinedRoles, statusCodes } from '../utils/constants';
import logger from '../utils/logger';
import { prepareJSONResponse, createValidator, createFilterBody, generatePassword } from '../utils/utils';
import SqlError from '../errors/sqlError';
import Users from '../models/users';
import CustomerDetails from '../models/customerDetails';
import CustomerAddress from '../models/customerAddress';
import VendorDetails from '../models/vendorDetails';
import { removeS3File, singleImageUpload } from '../utils/s3uploads';

export default class UsersController {
  // @ts-ignore
  private users: Users;

  // @ts-ignore
  private customerDetails: CustomerDetails;

  // @ts-ignore
  private customerAddress: CustomerAddress;

  // @ts-ignore
  private vendorDetails: VendorDetails;

  constructor(
    // @ts-ignore
    users: Users,
    // @ts-ignore
    customerDetails: CustomerDetails,
    // @ts-ignore
    customerAddress: CustomerAddress,
    // @ts-ignore
    vendorDetails: VendorDetails,
  ) {
    this.users = users;
    this.customerDetails = customerDetails;
    this.customerAddress = customerAddress;
    this.vendorDetails = vendorDetails;
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

  async createCustomer(data: any) {
    try {
      const customerDetails = await this.customerDetails.create(data);
      return customerDetails;
    } catch (error) {
      logger.error('Error Exception in createCustomer.', error, data);
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

            const newData = await this.createCustomer({
              customer_id: jwtData.userId,
            });
            logger.info(
              `registerUser - Added new entry in user table and customerDetails table:  ${JSON.stringify(newUser)} ,  ${JSON.stringify(newData)}`,
            );
            responseData = prepareJSONResponse(dataForUser, 'Success', statusCodes.OK);
          }
        }
      }
    } catch (error) {
      logger.error('registerUser - Error in User Registration.', error);
      responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
    }
    logger.info(`registerUser - Req and Res: ${JSON.stringify(requestData)} - ${JSON.stringify(responseData)}`);
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
      logger.error('loginUser - Error in User Login.', error);
      responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
    }
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async myProfile(req: Request, res: Response) {
    // @ts-ignore
    const { userId, role_id } = req.user;
    let responseData = prepareJSONResponse({}, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
    try {
      if (!userId) {
        responseData = prepareJSONResponse({}, 'Kindly login to perform the action.', statusCodes.BAD_REQUEST);
      }
      const userWhere: any = {
        id: userId,
        role_id,
      };
      const customerWhere: any = {};
      const addressWhere: any = {};
      const vendorWhere: any = {
        is_complete: 1,
      };

      const include: any[] = [];

      if (role_id === 10) {
        include.push({
          model: this.customerDetails,
          as: 'customerDetails',
          where: customerWhere,
          required: false,
          include: [
            {
              model: this.customerAddress,
              as: 'customerAddress',
              required: false,
              where: addressWhere,
            },
          ],
        });
      } else if (role_id === 2) {
        include.push({
          model: this.vendorDetails,
          as: 'vendorDetails',
          required: false,
          where: vendorWhere,
        });
      }

      const recordExists = await this.users.findOne({
        where: userWhere,
        include,
      });
      logger.info(`myProfile - fetched user: ${JSON.stringify(recordExists)}`);

      responseData = prepareJSONResponse({}, 'Invalid email or password.', statusCodes.BAD_REQUEST);
      if (recordExists) {
        if (!recordExists.is_deactivated) {
          if (!recordExists.status) {
            responseData = prepareJSONResponse(
              {},
              'Kindly contact admin for enabling the system access',
              statusCodes.BAD_REQUEST,
            );
          } else {
            let data: any = {};
            data = {
              id: recordExists?.id,
              first_name: recordExists?.first_name,
              last_name: recordExists?.last_name,
              email: recordExists?.email,
              profile_pic: recordExists?.profile_pic,
              role_id: recordExists?.role_id,
              phone_country_code: recordExists?.phone_country_code,
              phone_code: recordExists?.phone_code,
              phone: recordExists?.phone,
              dob: recordExists?.dob || '',
              gender: recordExists?.gender,
              two_factor_enabled: recordExists?.two_factor_enabled,
            };
            switch (role_id) {
              case 10:
                const defaultAddress =
                  recordExists?.customerDetails?.customerAddress?.find((addr: any) => addr.is_default === 1) || null;

                const addressLine =
                  [defaultAddress?.address_line_1, defaultAddress?.address_line_2].filter(Boolean).join(' ') || '';

                data = {
                  ...data,
                  identifier: recordExists?.customerDetails?.customer_code,
                  country: defaultAddress?.country || '',
                  state: defaultAddress?.state || '',
                  city: defaultAddress?.city || '',
                  address_line_1: addressLine,
                  pincode: defaultAddress?.pincode || '',
                  associations: {
                    vendor_id: null,
                    customer_id: recordExists?.customerDetails?.customer_id || null,
                    rider_id: null,
                  },
                };
                break;

              case 2:
                data = {
                  ...data,
                  identifier: recordExists?.vendorDetails?.vendor_code,
                  country: recordExists?.vendorDetails?.country || '',
                  state: recordExists?.vendorDetails?.state || '',
                  city: recordExists?.vendorDetails?.city || '',
                  address_line: recordExists?.vendorDetails?.address_line || '',
                  pincode: recordExists?.vendorDetails?.pincode || '',
                  associations: {
                    vendor_id: recordExists?.vendorDetails?.vendor_id || null,
                    customer_id: null,
                    rider_id: null,
                  },
                };
                break;

              default:
                data = {
                  ...data,
                  identifier: '',
                  country: '',
                  state: '',
                  city: '',
                  address_line: '',
                  pincode: '',
                  associations: {
                    vendor_id: null,
                    customer_id: null,
                    rider_id: null,
                  },
                };
                break;
            }
            responseData = prepareJSONResponse(data, 'Success', statusCodes.OK);
          }
        }
      }
    } catch (error) {
      logger.error('myProfile - Error Exception in User My Profile.', error);
      responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
    }
    logger.info(`myProfile User Req and Res: ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async updateProfile(req: Request, res: Response) {
    let uploaded = false;
    let fileLocation = null;
    try {
      await new Promise<void>((resolve, reject) => {
        singleImageUpload('profile_pic')(req, res, (err: any) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
      uploaded = true;
      // @ts-ignore
      fileLocation = req?.file?.location;
    } catch (error) {
      logger.error('Error in uploading image for updateProfile', error);
    }
    // @ts-ignore
    const { userId } = req.user;
    const requestData = req.body;
    const mandatoryFields = ['first_name', 'last_name', 'email'];
    const missingFields = mandatoryFields.filter((field) => !requestData[field]);
    let responseData: typeof prepareJSONResponse = {};
    let message = 'Missing required fields';
    if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const userWhere: any = {
          id: userId,
          role_id: predefinedRoles.User.id,
        };
        const recordExists = await this.users.findOne({
          attributes: ['id', 'first_name', 'last_name', 'email', 'is_deactivated', 'status', 'profile_pic'],
          where: userWhere,
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
              const oldProfilePic = recordExists.profile_pic;
              const newProfilePic = uploaded && fileLocation ? fileLocation : oldProfilePic;
              if (uploaded && oldProfilePic && oldProfilePic !== newProfilePic) {
                try {
                  await removeS3File(oldProfilePic);
                } catch (error) {
                  logger.error('updateProfile - Error deleting old profile picture', error);
                }
              }

              const newData = await this.users.update(
                {
                  first_name: requestData.first_name,
                  last_name: requestData.last_name,
                  email: requestData.email,
                  dob: requestData.dob || recordExists?.dob,
                  phone_country_code: requestData.phone_country_code || recordExists?.phone_country_code,
                  phone_code: requestData.phone_code || recordExists?.phone_code,
                  phone: requestData.phone || recordExists?.phone,
                  profile_pic: newProfilePic,
                },
                { where: { id: userId, role_id: predefinedRoles?.User?.id } },
              );
              logger.info(`updateProfile - Updated the entry: ${JSON.stringify(newData)} }`);
              responseData = prepareJSONResponse({}, 'Success', statusCodes.OK);
            }
          }
        }
      } catch (error) {
        logger.error('updateProfile - Error Exception in User Update Profile.', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(`updateProfile User Req and Res: ${JSON.stringify(requestData)} - ${JSON.stringify(responseData)}`);
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
      logger.error('forgotPassword - Error Exception in User Forgot password.', error);
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
      logger.error('changePassword - Error Exception in User Change password.', error);
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
        const userWhere: any = {
          id: userId,
          role_id: predefinedRoles.User.id,
        };
        const recordExists = await this.users.findOne({
          attributes: ['id', 'password', 'first_name', 'last_name', 'email', 'role_id', 'status', 'is_deactivated'],
          where: userWhere,
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
        const userWhere: any = {
          id: userId,
          role_id: predefinedRoles.User.id,
        };
        const recordExists = await this.users.findOne({
          attributes: ['id', 'password', 'first_name', 'last_name', 'email', 'role_id', 'status', 'is_deactivated'],
          where: userWhere,
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
