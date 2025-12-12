const nodemailer = require('nodemailer');

const mailConfig = {
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT, // or 465 for SSL
  secure: process.env.EMAIL_SSL === 'ssl', // true for port 465, false for 587
  auth: {
    user: process.env.EMAIL_USER, // Your SES SMTP username
    pass: process.env.EMAIL_PASSWORD, // Your SES SMTP password
  },
};

// Create Nodemailer SES transporter
const transporter = nodemailer.createTransport(mailConfig);

// replace domainname with domain name
const DEFAULT_SENDER_EMAIL = 'admin@gmail.com';

export const DEVRECIPIENT = 'dev@domainname.com';

/**
 * @category Utility
 * @subcategory Emails
 * @class
 * Sends email with optional attachments using ses
 * Please see the nodemailer documentation for attachments and their types https://www.npmjs.com/package/nodemailer
 */
export const sendEmail = async (toEmail, emailHtml, subject, attachments = null, ccEmails = []) => {
  let recipients = [DEVRECIPIENT].join(', ');

  if (Array.isArray(toEmail)) {
    recipients = toEmail.join(', ');
  } else {
    recipients = toEmail;
  }

  const message = {
    from: DEFAULT_SENDER_EMAIL,
    to: recipients,
    cc: ccEmails.join(', '),
    subject,
    html: emailHtml,
    attachments,
  };

  return transporter.sendMail(message);
};

export default {
  sendEmail,
};
