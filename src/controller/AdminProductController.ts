import { Request, Response } from 'express';
import { predefinedRoles, statusCodes } from '../utils/constants';
import { prepareJSONResponse } from '../utils/utils.js';
import logger from '../utils/logger.js';
import ProductsModel from '../models/products';
import { removeS3File, singleImageUpload } from '../utils/s3uploads';

export default class AdminProductController {
  // @ts-ignore
  private productsModel: ProductsModel;

  // @ts-ignore
  constructor(
    // @ts-ignore
    productsModel: ProductsModel,
  ) {
    this.productsModel = productsModel;
  }

  // eslint-disable-next-line class-methods-use-this
  async createProduct(req: Request, res: Response) {
    let fileLocation = null;
    try {
      await new Promise<void>((resolve, reject) => {
        singleImageUpload('icon')(req, res, (err: any) => {
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
      logger.error('Error in uploading icon for createProduct', error);
    }
    const requestBody = req.body;
    requestBody.icon = fileLocation;
    const requiredFields = ['material_id', 'product_name', 'weight_in_grams', 'icon'];

    const missingFields = requiredFields.filter((f) => !requestBody[f]);
    let responseData: any = {};
    let message = 'Missing required fields';

    if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const createProductPayload = {
          material_id: Number(requestBody.material_id),
          product_name:
            typeof requestBody.product_name === 'string' ? requestBody.product_name.trim() : requestBody.product_name,
          weight_in_grams: requestBody.weight_in_grams !== undefined ? Number(requestBody.weight_in_grams) : null,
          purity:
            requestBody.purity && String(requestBody.purity).trim() !== ''
              ? String(requestBody.purity).toUpperCase().trim()
              : '24K',
          making_charges: requestBody.making_charges !== undefined ? Number(requestBody.making_charges) : 0,
          description:
            requestBody.description && requestBody.description.trim() !== '' ? requestBody.description.trim() : null,
          icon: requestBody.icon,
        };

        const product = await this.productsModel.create(createProductPayload);

        logger.info(`createProduct - Added new entry: ${JSON.stringify(product)}`);
        responseData = prepareJSONResponse({}, 'Success', statusCodes.OK);
      } catch (error) {
        logger.error('createProduct - Error while adding product.', error);
        responseData = prepareJSONResponse({}, 'Error Exception.', statusCodes.INTERNAL_SERVER_ERROR);
      }
    }

    logger.info(`createProduct - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async getAllProducts(req: Request, res: Response) {
    const requestBody = req.body;
    // @ts-ignore
    const { role_id } = req.user;
    let responseData: typeof prepareJSONResponse = {};

    try {
      const limit = requestBody?.limit ? Number(requestBody?.limit) : 15;
      const page = requestBody?.page ? Number(requestBody?.page) : 1;
      const offset = (page - 1) * limit;
      const productWhere: any = {};
      if (requestBody.material_id) {
        productWhere.material_id = Number(requestBody.material_id);
      }
      if (role_id === predefinedRoles?.User?.id) {
        productWhere.status = 1;
      }

      const { rows, count } = await this.productsModel.findAndCountAll({
        where: productWhere,
        order: [['created_at', 'DESC']],
        limit,
        offset,
      });
      responseData = prepareJSONResponse(
        {
          products: rows,
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit),
        },
        'Success',
        statusCodes.OK,
      );
    } catch (error) {
      logger.error('getAllProducts - Error while fetching the products.', error);
      responseData = prepareJSONResponse({}, 'Error Exception.', statusCodes.INTERNAL_SERVER_ERROR);
    }
    logger.info(`getAllProducts - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`);
    return res.status(responseData.status).json(responseData);
  }

  // eslint-disable-next-line class-methods-use-this
  async getProductById(req: Request, res: Response) {
    const requestBody = req.body;
    const requiredFields = ['id'];

    const missingFields = requiredFields.filter((f) => !requestBody[f]);
    let responseData: any = {};
    let message = 'Missing required fields';

    if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const productData = await this.productsModel.findOne({
          where: { id: requestBody?.id, status: 1 },
          attributes: { exclude: ['status', 'created_at', 'updated_at'] },
        });

        if (!productData) {
          responseData = prepareJSONResponse({}, 'Product not found', statusCodes.NOT_FOUND);
        } else {
          responseData = prepareJSONResponse(productData, 'Success', statusCodes.OK);
        }
      } catch (error) {
        logger.error('getProductById - Error while fetching single product.', error);
        responseData = prepareJSONResponse({}, 'Error Exception.', statusCodes.INTERNAL_SERVER_ERROR);
      }
      logger.info(`getProductById - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`);
      return res.status(responseData.status).json(responseData);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  async updateProduct(req: Request, res: Response) {
    let uploaded = false;
    let fileLocation = null;
    try {
      await new Promise<void>((resolve, reject) => {
        singleImageUpload('icon')(req, res, (err: any) => {
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
      logger.error('Error in uploading icon for updateProduct', error);
    }
    const requestBody = req.body;
    const requiredFields = ['id'];

    const missingFields = requiredFields.filter((f) => !requestBody[f]);
    let responseData: any = {};
    let message = 'Missing required fields';

    if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const productData = await this.productsModel.findOne({ where: { id: requestBody?.id, status: 1 } });

        if (!productData) {
          responseData = prepareJSONResponse({}, 'Product not found', statusCodes.NOT_FOUND);
        } else {
          const oldIcon = productData.icon;
          const newIcon = uploaded && fileLocation ? fileLocation : oldIcon;
          if (uploaded && oldIcon && oldIcon !== newIcon) {
            try {
              await removeS3File(oldIcon);
            } catch (error) {
              logger.error('updateProduct - Error deleting old icon', error);
            }
          }
          await productData.update({
            material_id: requestBody.material_id ?? productData.material_id,
            product_name: requestBody.product_name ?? productData.product_name,
            weight_in_grams: requestBody.weight_in_grams ?? productData.weight_in_grams,
            purity: requestBody.purity ?? productData.purity,
            icon: newIcon,
            making_charges: requestBody.making_charges ?? productData.making_charges,
            description: requestBody.description ?? productData.description,
          });
          responseData = prepareJSONResponse({}, 'Success', statusCodes.OK);
        }
      } catch (error) {
        logger.error('updateProduct - Error updating the product.', error);
        responseData = prepareJSONResponse({}, 'Error Exception.', statusCodes.INTERNAL_SERVER_ERROR);
      }
      logger.info(`updateProduct - Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`);
      return res.status(responseData.status).json(responseData);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  async reactivateProduct(req: Request, res: Response) {
    const requestBody = req.body;
    const mandatoryFields = ['id'];
    const missingFields = mandatoryFields.filter((field) => !requestBody[field]);
    let responseData: typeof prepareJSONResponse = {};
    let message = 'Missing required fields';
    if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const productWhere: any = {
          id: requestBody.id,
        };

        const productData = await this.productsModel.findOne({ where: productWhere });

        responseData = prepareJSONResponse({}, 'Product does not exists.', statusCodes.BAD_REQUEST);
        if (productData) {
          if (productData.status) {
            responseData = prepareJSONResponse({}, 'Product already activated.', statusCodes.BAD_REQUEST);
          } else {
            productData.status = 1;
            const newData = await productData.save();
            logger.info(`reactivateProduct - Updated the entry: ${JSON.stringify(newData)} }`);
            responseData = prepareJSONResponse({}, 'Success', statusCodes.OK);
          }
        }
      } catch (error) {
        logger.error('reactivateProduct - Error reactivating product.', error);
        responseData = prepareJSONResponse({}, 'Error Exception.', statusCodes.INTERNAL_SERVER_ERROR);
      }
      logger.info(
        `reactivateProduct - Reactivate Product Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`,
      );
      return res.status(responseData.status).json(responseData);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  async deactivateProduct(req: Request, res: Response) {
    const requestBody = req.body;
    const mandatoryFields = ['id'];
    const missingFields = mandatoryFields.filter((field) => !requestBody[field]);
    let responseData: typeof prepareJSONResponse = {};
    let message = 'Missing required fields';
    if (missingFields.length > 0) {
      message = `Missing required fields: ${missingFields.join(', ')}`;
      responseData = prepareJSONResponse({}, message, statusCodes.BAD_REQUEST);
    } else {
      try {
        const productWhere: any = {
          id: requestBody.id,
        };

        const productData = await this.productsModel.findOne({ where: productWhere });

        responseData = prepareJSONResponse({}, 'Product does not exists.', statusCodes.BAD_REQUEST);
        if (productData) {
          if (!productData.status) {
            responseData = prepareJSONResponse({}, 'Product already deactivated.', statusCodes.BAD_REQUEST);
          } else {
            productData.status = 0;
            const newData = await productData.save();
            logger.info(`deactivateProduct - Updated the entry: ${JSON.stringify(newData)} }`);
            responseData = prepareJSONResponse({}, 'Success', statusCodes.OK);
          }
        }
      } catch (error) {
        logger.error('deactivateProduct - Error deactivating product.', error);
        responseData = prepareJSONResponse({}, 'Error Exception.', statusCodes.INTERNAL_SERVER_ERROR);
      }
      logger.info(
        `deactivateProduct - Deactivate Product Req and Res: ${JSON.stringify(requestBody)} - ${JSON.stringify(responseData)}`,
      );
      return res.status(responseData.status).json(responseData);
    }
  }
}
