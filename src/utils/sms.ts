// import twilio from 'twilio';
import crypto from 'crypto';
import logger from './logger';

// const accountSid = process.env.TWILIO_ACCOUNT_SID;
// const authToken = process.env.TWILIO_AUTH_TOKEN;
// const fromNumber = process.env.TWILIO_PHONE_NUMBER;

// const client = twilio(accountSid, authToken);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const sendSms = async (to: string, body: string) => {
  try {
    // if (!accountSid || !authToken || !fromNumber) {
    //   logger.error('Twilio credentials missing');
    //   return false;
    // }

    // const message = await client.messages.create({
    //   body,
    //   from: fromNumber,
    //   to,
    // });

    // logger.info(`SMS sent successfully to ${to}: ${message.sid}`);
    return true;
  } catch (error) {
    logger.error(`Error sending SMS to ${to}:`, error);
    return false;
  }
};

export const generateNumericOtp = (length = 6): string => {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return crypto.randomInt(min, max + 1).toString();
};

export const hashOtp = (otp: string): string => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};
