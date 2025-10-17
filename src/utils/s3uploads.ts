// eslint-disable-next-line import/no-extraneous-dependencies
import * as AWS from '@aws-sdk/client-s3';
import * as multer from 'multer';
import * as multerS3 from 'multer-s3';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import logger from './logger.js';

const s3 = new AWS.S3({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
});
const multerS3Config = multerS3({
  s3,
  bucket: process.env.S3_BUCKET,
  // acl: 'public-read',
  contentType: multerS3.AUTO_CONTENT_TYPE,
  key(req, file, cb) {
    cb(null, `${Date.now().toString()}-${file.originalname}`);
  },
});
const fileFilterConfig = (req, file, cb) => {
  // Only allow JPEG, JPG, PNG, WEBP images
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, JPG, PNG, WEBP images are allowed.'));
  }
};

const multipleImageUpload = (fieldName = 'image') =>
  multer({
    storage: multerS3Config,
    fileFilter: fileFilterConfig,
  }).array(fieldName, 100);

const multipleFileUploads = (fieldName = 'image') =>
  multer({
    storage: multerS3Config,
  }).array(fieldName, 10);

const singleFileUpload = (fieldName = 'image') =>
  multer({
    storage: multerS3Config,
  }).single(fieldName);

const singleImageUpload = (fieldName = 'image') =>
  multer({
    storage: multerS3Config,
    fileFilter: fileFilterConfig,
  }).single(fieldName);

const uploadPDF = async (pdf: any, fileName: string) => {
  let data = null;
  try {
    const params = {
      Body: pdf,
      Bucket: process.env.S3_BUCKET,
      // CannedACL: 'public-read',
      ContentType: 'application/pdf',
      Key: fileName,
    };
    const command = new PutObjectCommand(params);
    data = await s3.send(command);
  } catch (e) {
    logger.error('Error uploading PDF file', fileName, e);
  }
  return data;
};

const getS3File = async (key: string) => {
  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: key,
  };
  const command = new GetObjectCommand(params);
  // eslint-disable-next-line no-return-await
  return await s3.send(command);
};

const removeS3File = async (key: string) => {
  const keyData = key.split('s3.amazonaws.com/');
  let s3Key: string = key;
  if (keyData.length > 1) {
    // eslint-disable-next-line prefer-destructuring
    s3Key = keyData[1];
  }
  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: s3Key,
  };
  const command = new DeleteObjectCommand(params);
  // eslint-disable-next-line no-return-await
  return await s3.send(command);
};

export {
  multipleImageUpload,
  multipleFileUploads,
  singleFileUpload,
  singleImageUpload,
  removeS3File,
  uploadPDF,
  getS3File,
};
