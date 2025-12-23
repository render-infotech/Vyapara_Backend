import crypto from 'crypto';
import axios from 'axios';
import logger from './logger';
import { statusCodes } from './constants';

export const prepareJSONResponse = (data = [] || {}, message = null, status = statusCodes.OK) => ({
  data,
  message,
  status,
});

export const createValidator = (data) => {
  let validationStatus = true;
  let validationMessage = '';
  data.forEach((item) => {
    Object.entries(item).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        validationStatus = false;
        validationMessage += `${key
          .split('_')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ')}, `;
        return;
      }

      if (key === 'phone') {
        const phoneStr = String(value);
        const phoneRegex = /^\d{10}$/;

        if (!phoneRegex.test(phoneStr)) {
          validationStatus = false;
          validationMessage += 'Phone must be a valid 10 digit number, ';
        }
      }
    });
  });

  if (!validationStatus) {
    // Remove the last comma and space from the validationMessage
    validationMessage = validationMessage.slice(0, -2);
    validationMessage += ' required.';
  }
  return { validationStatus, validationMessage };
};

export const createFilterBody = (data, filterData) => filterData.map((key) => ({ [key]: data[key] }));

export const generatePassword = (length = 10) => {
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numChars = '0123456789';
  const specialChars = '!@#$%^&*()-_=+[]{}|;:,.?';
  let chars = lower;

  chars += upperChars;
  chars += numChars;
  chars += specialChars;

  let pass = '';
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < length; i++) {
    const randIdx = Math.floor(Math.random() * chars.length);
    pass += chars[randIdx];
  }

  return pass;
};

const algorithm = 'aes-256-cbc';
const key = Buffer.from('0123454321abclmn0123454321abcpqr', 'utf8'); // 256-bit key
const iv = Buffer.from('abcxyz9876567890', 'utf8'); // 16-byte IV

// Encrypt Function
export const encryptData = (text) => {
  try {
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    logger.info(`Success encryptData ${encrypted}`);
    return encrypted;
  } catch (error) {
    logger.error('Error in encryptData', error);
    return null;
  }
};

// Decrypt Function
export const decryptData = (encryptedText) => {
  try {
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    logger.info(`Success decryptData ${decrypted}`);
    return decrypted;
  } catch (error) {
    logger.error('Error in decryptData', error);
    return null;
  }
};

export const getLocationFromIP = async (ip = null) => {
  try {
    if (!ip) {
      logger.error('IP address is required for getLocationFromIP');
      return null;
    }
    const response = await axios.get(`http://ip-api.com/json/${ip}`);
    logger.info(`Success getLocationFromIP ${ip} - ${JSON.stringify(response.data)}`);
    return response.data;
  } catch (error) {
    logger.error('Error in getLocationFromIP', error);
    return {
      query: ip,
      status: 'fail',
      message: error.message || 'Unable to retrieve location data',
      country: null,
      countryCode: null,
      region: null,
      regionName: null,
      city: null,
      zip: null,
      lat: null,
      lon: null,
      timezone: null,
      isp: null,
      org: null,
      as: null,
    };
  }
};

export const notNull = (val) => val !== null && val !== undefined && val !== 'null' && val !== 'undefined';

const Utils = {
  prepareJSONResponse,
  createValidator,
  createFilterBody,
  generatePassword,
  encryptData,
  decryptData,
  getLocationFromIP,
  notNull,
};

export default Utils;
