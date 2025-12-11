import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { predefinedRoles, statusCodes } from '../utils/constants';
import logger from '../utils/logger';
import { prepareJSONResponse, createValidator, createFilterBody, generatePassword } from '../utils/utils';
import SqlError from '../errors/sqlError';
import UsersModel from '../models/users';
import CustomerDetailsModel from '../models/customerDetails';
import CustomerAddressModel from '../models/customerAddress';
import RiderDetailsModel from '../models/riderDetails';
import { removeS3File, singleImageUpload } from '../utils/s3uploads';

export default class UsersController {
  // @ts-ignore
  private usersModel: UsersModel;

  // @ts-ignore
  private customerDetailsModel: CustomerDetailsModel;

  // @ts-ignore
  private customerAddressModel: CustomerAddressModel;

  // @ts-ignore
  private vendorDetailsModel: VendorDetailsModel;

  // @ts-ignore
  private riderDetailsModel: RiderDetailsModel;

  constructor(
    // @ts-ignore
    usersModel: UsersModel,
    // @ts-ignore
    customerDetailsModel: CustomerDetailsModel,
    // @ts-ignore
    customerAddressModel: CustomerAddressModel,
    // @ts-ignore
    vendorDetailsModel: VendorDetailsModel,
    // @ts-ignore
    riderDetailsModel: RiderDetailsModel,
  ) {
    this.usersModel = usersModel;
    this.customerDetailsModel = customerDetailsModel;
    this.customerAddressModel = customerAddressModel;
    this.vendorDetailsModel = vendorDetailsModel;
    this.riderDetailsModel = riderDetailsModel;
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

  async createCustomer(data: any) {
    try {
      const customerDetails = await this.customerDetailsModel.create(data);
      return customerDetails;
    } catch (error) {
      logger.error('Error Exception in createCustomer.', error, data);
      throw new SqlError(error);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  async registerUser(req: Request, res: Response) {
    const requestBody = req.body;
    let responseData = prepareJSONResponse({}, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
    try {
      const validateBody = ['first_name', 'email', 'password', 'confirm_password', 'is_agreed'];
      const { validationStatus, validationMessage } = createValidator(createFilterBody(requestBody, validateBody));
      responseData = prepareJSONResponse({}, validationMessage, statusCodes.BAD_REQUEST);
      if (validationStatus) {
        const { password, confirm_password } = requestBody;
        if (password !== confirm_password) {
          logger.info(
            `registerUser Password and confirm password do not match Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`,
          );
          responseData = prepareJSONResponse(
            {},
            'Password and confirm password do not match.',
            statusCodes.BAD_REQUEST,
          );
        } else {
          // Check if this user already exists
          const userExists = await this.emailExists(requestBody.email);
          responseData = prepareJSONResponse({}, 'User with this email already exists', statusCodes.BAD_REQUEST);
          if (!userExists) {
            if (requestBody.password) {
              requestBody.password = await bcrypt.hash(requestBody.password, 10);
            }
            const newUser = await this.createUser({
              first_name: requestBody.first_name,
              last_name: requestBody.last_name,
              email: requestBody.email,
              password: requestBody.password,
              dob: requestBody.dob || null,
              gender: requestBody.gender || 1,
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
    logger.info(`registerUser - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async loginUser(req: Request, res: Response) {
    const requestBody = req.body;
    let responseData = prepareJSONResponse({}, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
    try {
      const validateBody = ['email', 'password'];
      const { validationStatus, validationMessage } = createValidator(createFilterBody(requestBody, validateBody));
      responseData = prepareJSONResponse({}, validationMessage, statusCodes.BAD_REQUEST);
      if (validationStatus) {
        const user = await this.usersModel.findOne({
          attributes: ['id', 'first_name', 'last_name', 'email', 'password', 'role_id', 'status', 'is_deactivated'],
          where: {
            email: requestBody.email,
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
            const match = await bcrypt.compareSync(requestBody.password, user.password);
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
                  // if (requestBody.ip && requestBody.ip !== '::1') {
                  //   location = await getLocationFromIP(requestBody.ip);
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
                  //   ip_address: requestBody.ip,
                  //   user_agent: req.headers['user-agent'] ?? null,
                  //   location,
                  // });
                  // logger.info(
                  //   `Login Audit log status for user ${user.id} with ip ${requestBody.ip} - ${JSON.stringify(userLog)}`,
                  // );
                } catch (error) {
                  logger.info(`Login Audit log failed for user ${user.id} with ip ${requestBody.ip} - ${error}`);
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
                `loginUser User Logged in successfully, Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`,
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

      if (role_id === predefinedRoles.User.id) {
        include.push({
          model: this.customerDetailsModel,
          as: 'customerDetails',
          where: customerWhere,
          required: false,
          include: [
            {
              model: this.customerAddressModel,
              as: 'customerAddress',
              required: false,
              where: addressWhere,
            },
          ],
        });
      } else if (role_id === predefinedRoles.Vendor.id) {
        include.push({
          model: this.vendorDetailsModel,
          as: 'vendorDetails',
          required: false,
          where: vendorWhere,
        });
      } else if (role_id === predefinedRoles.Rider.id) {
        include.push({
          model: this.riderDetailsModel,
          as: 'riderDetails',
          required: false,
        });
      }

      const recordExists = await this.usersModel.findOne({
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
              case predefinedRoles.User.id:
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

              case predefinedRoles.Vendor.id:
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

              case predefinedRoles.Rider.id:
                data = {
                  ...data,
                  identifier: recordExists?.riderDetails?.id || null,
                  associations: {
                    vendor_id: null,
                    customer_id: null,
                    rider_id: recordExists?.riderDetails?.id || null,
                  },
                };
                break;

              case predefinedRoles.Admin.id:
                data = {
                  ...data,
                  identifier: recordExists?.riderDetails?.rider_code || '',
                  country: recordExists?.riderDetails?.country || '',
                  state: recordExists?.riderDetails?.state || '',
                  city: recordExists?.riderDetails?.city || '',
                  address_line: recordExists?.riderDetails?.address_line || '',
                  pincode: recordExists?.riderDetails?.pincode || '',
                  associations: {
                    vendor_id: null,
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
    const requestBody = req.body;
    const mandatoryFields = ['first_name', 'email'];
    const missingFields = mandatoryFields.filter((field) => !requestBody[field]);
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
        const recordExists = await this.usersModel.findOne({
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

              const newData = await this.usersModel.update(
                {
                  first_name: requestBody.first_name,
                  last_name: requestBody.last_name,
                  email: requestBody.email,
                  dob: requestBody.dob || recordExists?.dob,
                  gender: requestBody.gender || recordExists?.gender,
                  phone_country_code: requestBody.phone_country_code || recordExists?.phone_country_code,
                  phone_code: requestBody.phone_code || recordExists?.phone_code,
                  phone: requestBody.phone || recordExists?.phone,
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
    logger.info(`updateProfile User Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async updateAdminProfile(req: Request, res: Response) {
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
      logger.error('Error in uploading image for updateAdminProfile', error);
    }
    // @ts-ignore
    const { userId, role_id } = req.user;
    const requestBody = req.body;
    const mandatoryFields = ['first_name', 'email'];
    const missingFields = mandatoryFields.filter((field) => !requestBody[field]);
    let responseData: typeof prepareJSONResponse = {};
    let message = 'Missing required fields';
    if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      if (role_id !== predefinedRoles.Admin.id) {
        responseData = prepareJSONResponse(
          {},
          'Access denied. Only admin can update this profile.',
          statusCodes.FORBIDDEN,
        );
      } else {
        try {
          const userWhere: any = {
            id: userId,
            role_id: predefinedRoles.Admin.id,
          };
          const recordExists = await this.usersModel.findOne({
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
                    logger.error('updateAdminProfile - Error deleting old profile picture', error);
                  }
                }

                const newData = await this.usersModel.update(
                  {
                    first_name: requestBody.first_name,
                    last_name: requestBody.last_name,
                    email: requestBody.email,
                    dob: requestBody.dob || recordExists?.dob,
                    gender: requestBody.gender || recordExists?.gender,
                    phone_country_code: requestBody.phone_country_code || recordExists?.phone_country_code,
                    phone_code: requestBody.phone_code || recordExists?.phone_code,
                    phone: requestBody.phone || recordExists?.phone,
                    profile_pic: newProfilePic,
                  },
                  { where: { id: userId, role_id: predefinedRoles?.Admin?.id } },
                );
                logger.info(`updateAdminProfile - Updated the entry: ${JSON.stringify(newData)} }`);
                responseData = prepareJSONResponse({}, 'Success', statusCodes.OK);
              }
            }
          }
        } catch (error) {
          logger.error('updateAdminProfile - Error Exception in User Update Profile.', error);
          responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
        }
      }
    }
    logger.info(
      `updateAdminProfile User Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`,
    );
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async forgotPassword(req: Request, res: Response) {
    // @ts-ignore
    const emailEnabled = process.env.EMAIL_ENABLED === 'true' || process.env.EMAIL_ENABLED === true;
    const requestBody = req.body;
    let responseData = prepareJSONResponse({}, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
    try {
      const validateBody = ['email'];
      const { validationStatus, validationMessage } = createValidator(createFilterBody(requestBody, validateBody));
      responseData = prepareJSONResponse({}, validationMessage, statusCodes.BAD_REQUEST);
      if (validationStatus) {
        const user = await this.usersModel.findOne({
          attributes: ['id', 'first_name', 'last_name', 'email', 'role_id', 'status', 'is_deactivated'],
          where: {
            email: requestBody.email,
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
              logger.info(`forgotPassword Password: ${JSON.stringify(requestBody)} - ${generatedPassword}`);
              requestBody.password = await bcrypt.hash(generatedPassword, 10);
              await user.update({ password: requestBody.password });
              // const emailBody = resetPassword(generatedPassword);
              // logger.info(`forgotPassword Email: ${JSON.stringify(requestBody)} - ${emailBody}`);
              if (emailEnabled) {
                // const emailStatus = await sendEmail(user.email, emailBody, 'Password Reset');
                // logger.info(`User Forgotpassword Email Status: ${requestBody.email} ${JSON.stringify(emailStatus)}`);
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
    logger.info(`forgotPassword User Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async changePassword(req: Request, res: Response) {
    // @ts-ignore
    const { userId } = req.user;
    const requestBody = req.body;
    let responseData = prepareJSONResponse({}, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
    try {
      const validateBody = ['old_password', 'new_password', 'confirm_password'];
      const { validationStatus, validationMessage } = createValidator(createFilterBody(requestBody, validateBody));
      responseData = prepareJSONResponse({}, validationMessage, statusCodes.BAD_REQUEST);
      if (validationStatus && userId) {
        responseData = prepareJSONResponse(
          {},
          'New Password and Confirm Password do not match.',
          statusCodes.BAD_REQUEST,
        );
        if (requestBody.new_password === requestBody.confirm_password) {
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
                const match = await bcrypt.compareSync(requestBody.old_password, user.password);
                responseData = prepareJSONResponse({}, 'Invalid old password.', statusCodes.BAD_REQUEST);
                if (match) {
                  requestBody.enc_password = await bcrypt.hash(requestBody.new_password, 10);
                  await user.update({ password: requestBody.enc_password });
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
    logger.info(`changePassword User Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async enableTwoFactor(req: Request, res: Response) {
    // @ts-ignore
    const { userId } = req.user;
    const requestBody = req.body;
    let responseData = prepareJSONResponse({}, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
    try {
      if (userId) {
        const userWhere: any = {
          id: userId,
          role_id: predefinedRoles.User.id,
        };
        const recordExists = await this.usersModel.findOne({
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
    logger.info(`enableTwoFactor User Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async disableTwoFactor(req: Request, res: Response) {
    // @ts-ignore
    const { userId } = req.user;
    const requestBody = req.body;
    let responseData = prepareJSONResponse({}, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
    try {
      if (userId) {
        const userWhere: any = {
          id: userId,
          role_id: predefinedRoles.User.id,
        };
        const recordExists = await this.usersModel.findOne({
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
    logger.info(`disableTwoFactor User Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }
}
