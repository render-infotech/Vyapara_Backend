import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response } from 'express';
import { predefinedRoles, statusCodes } from '../utils/constants';
import logger from '../utils/logger.js';
import SqlError from '../errors/sqlError';
import { prepareJSONResponse, generatePassword } from '../utils/utils';
import Users from '../models/users';
import VendorDetails from '../models/vendorDetails';
import CustomerDetails from '../models/customerDetails';
import { removeS3File, singleImageUpload } from '../utils/s3uploads';

export default class VendorsController {
  // @ts-ignore
  private users: Users;

  // @ts-ignore
  private vendorDetails: VendorDetails;

  // @ts-ignore
  private customerDetails: CustomerDetails;

  constructor(
    // @ts-ignore
    users: Users,
    // @ts-ignore
    vendorDetails: VendorDetails,
    // @ts-ignore
    customerDetails: CustomerDetails,
  ) {
    this.users = users;
    this.vendorDetails = vendorDetails;
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
      logger.error('Error Exception in createUser for vendor.', error, data);
      throw new SqlError(error);
    }
  }

  async createVendor(data: any) {
    try {
      const vendorDetails = await this.vendorDetails.create(data);
      return vendorDetails;
    } catch (error) {
      logger.error('Error Exception in createVendor.', error, data);
      throw new SqlError(error);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  async getVendors(req: Request, res: Response) {
    const requestData = req.query;
    let responseData: typeof prepareJSONResponse = {};

    try {
      const userWhere: any = {
        status: 1,
        role_id: predefinedRoles?.Vendor?.id,
      };
      if (requestData.vendor_id) {
        userWhere.id = requestData.vendor_id;
      }

      const vendorWhere: any = { is_complete: 1 };

      const vendorsRecords = await this.vendorDetails.findAll({
        where: vendorWhere,
        include: [
          {
            model: this.users,
            as: 'user',
            where: userWhere,
            required: true,
            attributes: [
              'id',
              'first_name',
              'middle_name',
              'last_name',
              'profile_pic',
              'email',
              'phone_country_code',
              'phone_code',
              'phone',
              'two_factor_enabled',
              'is_deactivated',
            ],
          },
        ],
        attributes: { exclude: ['created_at', 'updated_at'] },
        order: [['business_name', 'ASC']],
      });

      logger.info(`getVendors - fetched vendors ${JSON.stringify(vendorsRecords)}`);

      if (vendorsRecords.length === 0) {
        responseData = prepareJSONResponse([], 'No vendor found.', statusCodes.NOT_FOUND);
      } else {
        const mappedVendorData = await Promise.all(
          vendorsRecords.map(async (vendor: any) => {
            return {
              id: vendor.id,
              vendor_id: vendor.vendor_id,
              vendor_code: vendor.vendor_code,
              business_name: vendor?.business_name || '',
              first_name: vendor?.user?.first_name || '',
              middle_name: vendor?.user?.middle_name || '',
              last_name: vendor?.user?.last_name || '',
              email: vendor?.user?.email || '',
              profile_pic: vendor?.user?.profile_pic || '',
              phone_country_code: vendor?.user?.phone_country_code || '',
              phone_code: vendor?.user?.phone_code || '',
              phone: vendor?.user?.phone || '',
              address_line: vendor?.address_line || '',
              country: vendor?.country || '',
              state: vendor?.state || '',
              city: vendor?.city || '',
              postal_code: vendor?.postal_code || '',
              is_gst_registered: vendor?.is_gst_registered || 0,
              gst_number: vendor?.gst_number || '',
              website: vendor?.website || '',
              description: vendor?.description || '',
              materials: vendor?.materials || [],
              payment_modes: vendor?.payment_modes || [],
              working_hours: vendor?.working_hours || [],
              rating: vendor?.rating || '',
              review_count: vendor?.review_count || '',
              two_factor_enabled: vendor?.user?.two_factor_enabled,
              user_verified: vendor?.user?.vendor_verified,
              is_deactivated: vendor?.user?.is_deactivated,
            };
          }),
        );

        let allVendorsData: any;
        if (requestData.vendor_id) {
          allVendorsData = mappedVendorData[0];
        } else {
          allVendorsData = mappedVendorData;
        }

        responseData = prepareJSONResponse(allVendorsData, 'Success', statusCodes.OK);
      }
    } catch (error) {
      logger.error('Error retrieving Vendor data in getVendors.', error);
      responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
    }
    logger.info(`getVendors - Req and Res: ${JSON.stringify(requestData)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async registerVendor(req: Request, res: Response) {
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
      // @ts-ignore
      fileLocation = req?.file?.location;
    } catch (error) {
      logger.error('Error in uploading image for registerVendor', error);
    }
    const requestData = req.body;
    requestData.profile_pic = fileLocation;
    const userAttributes = ['first_name', 'email', 'phone_country_code', 'phone_code', 'phone'];
    const initialVendorAttributes = [
      'business_name',
      'address_line',
      'country',
      'state',
      'city',
      'postal_code',
      'is_gst_registered',
    ];
    const vendorAttributes = [
      ...initialVendorAttributes,
      'vendor_id',
      'vendor_code',
      'rating',
      'review_count',
      'gst_number',
      'is_complete',
      'website',
      'description',
    ];
    const mandatoryFields = [...userAttributes, ...initialVendorAttributes];
    if (Number(requestData?.is_gst_registered) === 1) {
      mandatoryFields.push('gst_number');
    }
    const missingFields = mandatoryFields.filter(
      (field) => requestData[field] === undefined || requestData[field] === null || requestData[field] === '',
    );
    let responseData: typeof prepareJSONResponse = {};
    let message = 'Missing required fields';

    if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        // Check if this user already exists
        const userExists = await this.emailExists(requestData.email);
        if (userExists) {
          responseData = prepareJSONResponse({}, 'User with this email already exists', statusCodes.BAD_REQUEST);
          logger.info(`registerVendor: User with email ${requestData.email} already exists`);
        } else {
          const generatedPassword = generatePassword();

          logger.info(`registerVendor Password: ${JSON.stringify(requestData)} - ${generatedPassword}`);

          requestData.password = await bcrypt.hash(generatedPassword, 10);

          const newUser = await this.createUser({
            first_name: requestData.first_name,
            last_name: requestData.last_name || '',
            email: requestData.email,
            password: requestData.password,
            dob: requestData.dob || null,
            gender: requestData.gender || 1,
            phone_country_code: requestData?.phone_country_code || '',
            phone_code: requestData?.phone_code || '',
            phone: requestData?.phone || '',
            role_id: predefinedRoles?.Vendor?.id,
            profile_pic: requestData.profile_pic,
          });

          if (!newUser) {
            logger.info(`registerVendor: Failed to create user for email ${requestData.email}`);
            throw new Error(`User creation failed for ${requestData.email}`);
          }

          const vendorFields = {};
          vendorAttributes.forEach((acc) => {
            vendorFields[acc] = requestData[acc] ?? null;
          });

          const lastVendor = await this.vendorDetails.findOne({
            order: [['id', 'DESC']],
          });
          let nextNumber = 100001;
          if (lastVendor && lastVendor.vendor_code) {
            const lastNum = parseInt(lastVendor.vendor_code.replace('VND', ''), 10);
            if (!isNaN(lastNum)) nextNumber = lastNum + 1;
          }
          // @ts-ignore
          vendorFields.vendor_code = `VND${nextNumber}`;
          // @ts-ignore
          vendorFields.vendor_id = newUser.toJSON().id;
          // @ts-ignore
          vendorFields.is_complete = 0;
          const newVendor = await this.vendorDetails.create(vendorFields);

          if (!newVendor) {
            logger.info(`registerVendor: Failed to create vendor details for vendor_id ${newUser.toJSON().id}`);
            throw new Error(`Vendor creation failed for vendor_id ${newUser.toJSON().id}`);
          }

          responseData = prepareJSONResponse({ vendor_id: newUser.toJSON().id }, 'Success', statusCodes.OK);
          logger.info(
            `registerVendor Vendor Registered successfully, Req and Res: ${JSON.stringify(requestData)} - ${JSON.stringify(responseData)}`,
          );
        }
      } catch (error) {
        logger.error('Error registerVendor in Vendor Registration.', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(`registerVendor - Req and Res: ${JSON.stringify(requestData)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async updateVendor(req: Request, res: Response) {
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
      logger.error('Error in uploading image for updateVendor', error);
    }
    const requestData = req.body;
    const userAttributes = ['vendor_id', 'first_name', 'email', 'phone_country_code', 'phone_code', 'phone'];
    const initialVendorAttributes = [
      'business_name',
      'address_line',
      'country',
      'state',
      'city',
      'postal_code',
      'is_gst_registered',
    ];
    const vendorAttributes = [
      ...initialVendorAttributes,
      'vendor_id',
      'vendor_code',
      'gst_number',
      'rating',
      'review_count',
      'is_complete',
      'website',
      'description',
    ];

    const mandatoryFields = [...userAttributes, ...initialVendorAttributes];
    if (Number(requestData?.is_gst_registered) === 1) {
      mandatoryFields.push('gst_number');
    }
    const missingFields = mandatoryFields.filter(
      (field) => requestData[field] === undefined || requestData[field] === null || requestData[field] === '',
    );
    let responseData: typeof prepareJSONResponse = {};
    let message = 'Missing required fields';

    if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const recordExists = await this.users.findOne({
          where: { id: requestData.vendor_id, role_id: predefinedRoles?.Vendor?.id },
        });
        responseData = prepareJSONResponse({}, 'Vendor does not exists.', statusCodes.BAD_REQUEST);
        if (recordExists) {
          const oldProfilePic = recordExists.profile_pic;
          const newProfilePic = uploaded && fileLocation ? fileLocation : oldProfilePic;
          if (uploaded && oldProfilePic && oldProfilePic !== newProfilePic) {
            try {
              await removeS3File(oldProfilePic);
            } catch (error) {
              logger.error('Error deleting old profile picture', error);
            }
          }
          await this.users.update(
            {
              first_name: requestData.first_name,
              last_name: requestData.last_name,
              email: requestData.email,
              dob: requestData.dob || null,
              phone_country_code: requestData.phone_country_code,
              phone_code: requestData.phone_code,
              phone: requestData.phone,
              profile_pic: newProfilePic,
            },
            { where: { id: requestData.vendor_id, role_id: predefinedRoles?.Vendor?.id } },
          );

          let vendorRecord = await this.vendorDetails.findOne({ where: { vendor_id: requestData.vendor_id } });
          if (!vendorRecord) {
            const vendorFields = {};
            vendorAttributes.forEach((acc) => {
              vendorFields[acc] = requestData[acc] ?? null;
            });
            // @ts-ignore
            vendorFields.vendor_id = recordExists.id;
            let nextNumber = 100001;
            const lastVendor = await this.vendorDetails.findOne({
              order: [['id', 'DESC']],
            });
            if (lastVendor && lastVendor.vendor_code) {
              const lastNum = parseInt(lastVendor.vendor_code.replace('VND', ''), 10);
              if (!isNaN(lastNum)) nextNumber = lastNum + 1;
            }
            // @ts-ignore
            vendorFields.vendor_code = `VND${nextNumber}`;
            vendorRecord = await this.vendorDetails.create(vendorFields);
            logger.info(`updateVendor - Created New vendor ${JSON.stringify(vendorRecord)}`);
          } else {
            vendorAttributes.forEach((acc) => {
              if (requestData[acc] !== undefined) {
                vendorRecord[acc] = requestData[acc] ?? vendorRecord[acc];
              }
            });
            await vendorRecord.save();
            logger.info(`updateVendor - Updated Vendor ${JSON.stringify(vendorRecord)}`);
          }
          responseData = prepareJSONResponse({ vendor_id: vendorRecord.vendor_id }, 'Success', statusCodes.OK);
        }
      } catch (error) {
        logger.error('Error updating in Vendor updateVendor.', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(`updateVendor - Req and Res: ${JSON.stringify(requestData)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async vendorAddMaterial(req: Request, res: Response) {
    const requestBody = req.body;
    const mandatoryFields = ['vendor_id', 'name'];
    const missingFields = mandatoryFields.filter((field) => !requestBody[field]);
    let responseData: typeof prepareJSONResponse = {};
    let message = 'Missing required fields';
    if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const recordExists = await this.vendorDetails.findOne({
          where: { vendor_id: requestBody.vendor_id },
        });
        if (!recordExists) {
          responseData = prepareJSONResponse({}, 'Vendor not found', statusCodes.NOT_FOUND);
        } else {
          const materials = recordExists.materials || [];

          const newMaterial = { id: uuidv4(), name: requestBody?.name };
          const updatedMaterials = [...materials, newMaterial];

          await recordExists.update({ materials: updatedMaterials, is_complete: 1 });
          responseData = prepareJSONResponse({}, 'Success', statusCodes.OK);
        }
      } catch (error) {
        logger.error('vendorAddMaterial - Error while adding Vendors material in vendor details.', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(`vendorAddMaterial - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async vendorUpdateMaterial(req: Request, res: Response) {
    const requestBody = req.body;
    const { vendor_id, material_id, name } = req.body;
    const mandatoryFields = ['vendor_id', 'material_id', 'name'];
    const missingFields = mandatoryFields.filter((field) => !req.body[field]);
    let responseData: typeof prepareJSONResponse = {};
    let message = 'Missing required fields';
    if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const recordExists = await this.vendorDetails.findOne({ where: { vendor_id } });
        if (!recordExists) {
          responseData = prepareJSONResponse({}, 'Vendor not found', statusCodes.NOT_FOUND);
        } else {
          let materials = recordExists.materials || [];
          const materialIndex = materials.findIndex((m: any) => m.id === material_id);

          if (materialIndex === -1) {
            responseData = prepareJSONResponse({}, 'Material not found', statusCodes.NOT_FOUND);
          } else {
            materials[materialIndex] = { ...materials[materialIndex], name };
            await recordExists.update({ materials });
            responseData = prepareJSONResponse({}, 'Success', statusCodes.OK);
          }
        }
      } catch (error) {
        logger.error('vendorUpdateMaterial - Error updating material.', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(`vendorUpdateMaterial - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async vendorDeleteMaterial(req: Request, res: Response) {
    const requestBody = req.body;
    const { vendor_id, material_id } = req.body;
    const mandatoryFields = ['vendor_id', 'material_id'];
    const missingFields = mandatoryFields.filter((field) => !req.body[field]);
    let responseData: typeof prepareJSONResponse = {};
    let message = 'Missing required fields';
    if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const recordExists = await this.vendorDetails.findOne({ where: { vendor_id } });
        if (!recordExists) {
          responseData = prepareJSONResponse({}, 'Vendor not found', statusCodes.NOT_FOUND);
        } else {
          let materials = recordExists.materials || [];
          const updatedMaterials = materials.filter((m: any) => m.id !== material_id);

          if (materials.length === updatedMaterials.length) {
            responseData = prepareJSONResponse({}, 'Material not found', statusCodes.NOT_FOUND);
          } else {
            await recordExists.update({ materials: updatedMaterials });
            responseData = prepareJSONResponse({}, 'Success', statusCodes.OK);
          }
        }
      } catch (error) {
        logger.error('vendorDeleteMaterial - Error deleting material.', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(`vendorDeleteMaterial - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async vendorAddPaymentMode(req: Request, res: Response) {
    const requestBody = req.body;
    const { vendor_id, mode } = req.body;
    const mandatoryFields = ['vendor_id', 'mode'];
    const missingFields = mandatoryFields.filter((field) => !requestBody[field]);
    let responseData: typeof prepareJSONResponse = {};
    let message = 'Missing required fields';
    if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const vendorRecord = await this.vendorDetails.findOne({ where: { vendor_id } });
        if (!vendorRecord) {
          responseData = prepareJSONResponse({}, 'Vendor not found', statusCodes.NOT_FOUND);
        } else {
          const paymentModes = vendorRecord.payment_modes || [];
          const updatedModes = Array.from(new Set([...paymentModes, mode]));
          vendorRecord.payment_modes = updatedModes;
          vendorRecord.is_complete = 1;

          await vendorRecord.save();
          responseData = prepareJSONResponse({}, 'Success', statusCodes.OK);
        }
      } catch (error) {
        logger.error('vendorAddPaymentMode - Error adding payment mode.', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }

    logger.info(`vendorAddPaymentMode - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async vendorDeletePaymentMode(req: Request, res: Response) {
    const requestBody = req.body;
    const { vendor_id, mode } = req.body;
    const mandatoryFields = ['vendor_id', 'mode'];
    const missingFields = mandatoryFields.filter((field) => !requestBody[field]);
    let responseData: typeof prepareJSONResponse = {};
    let message = 'Missing required fields';
    if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const vendorRecord = await this.vendorDetails.findOne({ where: { vendor_id } });
        if (!vendorRecord) {
          responseData = prepareJSONResponse({}, 'Vendor not found', statusCodes.NOT_FOUND);
        } else {
          const paymentModes = vendorRecord.payment_modes || [];
          const updatedModes = paymentModes.filter((m: string) => m !== mode);
          if (paymentModes.length === updatedModes.length) {
            responseData = prepareJSONResponse({}, 'Payment mode not found', statusCodes.NOT_FOUND);
          } else {
            await vendorRecord.update({ payment_modes: updatedModes });
            responseData = prepareJSONResponse({}, 'Success', statusCodes.OK);
          }
        }
      } catch (error) {
        logger.error('vendorDeletePaymentMode - Error deleting payment mode.', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(
      `vendorDeletePaymentMode - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`,
    );
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async vendorAddWorkingHour(req: Request, res: Response) {
    const requestBody = req.body;
    const { vendor_id, day, open, close, is_closed } = req.body;
    const mandatoryFields = ['vendor_id', 'day', 'open', 'close', 'is_closed'];
    const missingFields = mandatoryFields.filter(
      (field) => requestBody[field] === undefined || requestBody[field] === null,
    );
    let responseData: typeof prepareJSONResponse = {};

    let message = 'Missing required fields';
    if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const vendorRecord = await this.vendorDetails.findOne({ where: { vendor_id } });
        if (!vendorRecord) {
          responseData = prepareJSONResponse({}, 'Vendor not found', statusCodes.NOT_FOUND);
        } else {
          const workingHours = vendorRecord.working_hours || [];
          const newHour = { id: uuidv4(), day, open: open, close: close, is_closed };
          workingHours.push(newHour);
          await vendorRecord.update({ working_hours: workingHours });
          responseData = prepareJSONResponse({}, 'Success', statusCodes.OK);
        }
      } catch (error) {
        logger.error('vendorAddWorkingHour - Error adding working hour.', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }

    logger.info(`vendorAddWorkingHour - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async vendorUpdateWorkingHour(req: Request, res: Response) {
    const requestBody = req.body;
    const { vendor_id, hour_id, day, open, close, is_closed } = requestBody;
    const mandatoryFields = ['vendor_id', 'hour_id', 'day', 'is_closed'];
    const missingFields = mandatoryFields.filter(
      (field) => requestBody[field] === undefined || requestBody[field] === null,
    );
    let responseData: typeof prepareJSONResponse = {};

    let message = 'Missing required fields';
    if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const vendorRecord = await this.vendorDetails.findOne({ where: { vendor_id } });
        if (!vendorRecord) {
          responseData = prepareJSONResponse({}, 'Vendor not found', statusCodes.NOT_FOUND);
        } else {
          const workingHours = vendorRecord.working_hours || [];
          const index = workingHours.findIndex((w: any) => w.id === hour_id);
          if (index === -1) {
            responseData = prepareJSONResponse({}, 'Working hour not found', statusCodes.NOT_FOUND);
          } else {
            workingHours[index] = { ...workingHours[index], day, open: open || null, close: close || null, is_closed };
            await vendorRecord.update({ working_hours: workingHours });
            responseData = prepareJSONResponse({}, 'Success', statusCodes.OK);
          }
        }
      } catch (error) {
        logger.error('vendorUpdateWorkingHour - Error updating working hour.', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }

    logger.info(
      `vendorUpdateWorkingHour - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`,
    );
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async vendorDeleteWorkingHour(req: Request, res: Response) {
    const requestBody = req.body;
    const { vendor_id, hour_id } = requestBody;
    const mandatoryFields = ['vendor_id', 'hour_id'];
    const missingFields = mandatoryFields.filter(
      (field) => requestBody[field] === undefined || requestBody[field] === null,
    );
    let responseData: typeof prepareJSONResponse = {};

    let message = 'Missing required fields';
    if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const vendorRecord = await this.vendorDetails.findOne({ where: { vendor_id } });
        if (!vendorRecord) {
          responseData = prepareJSONResponse({}, 'Vendor not found', statusCodes.NOT_FOUND);
        } else {
          const workingHours = vendorRecord.working_hours || [];
          const updatedHours = workingHours.filter((w: any) => w.id !== hour_id);
          if (workingHours.length === updatedHours.length) {
            responseData = prepareJSONResponse({}, 'Working hour not found', statusCodes.NOT_FOUND);
          } else {
            await vendorRecord.update({ working_hours: updatedHours });
            responseData = prepareJSONResponse({}, 'Success', statusCodes.OK);
          }
        }
      } catch (error) {
        logger.error('vendorDeleteWorkingHour - Error deleting working hour.', error);
        responseData = prepareJSONResponse({ error: 'Error Exception.' }, 'Error', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }
    logger.info(
      `vendorDeleteWorkingHour - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`,
    );
    return res.status(responseData.status).json(responseData);
  }
}
