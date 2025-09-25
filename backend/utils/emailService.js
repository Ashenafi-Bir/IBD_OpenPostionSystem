import nodemailer from 'nodemailer';
import config from '../config/config.js';
import logger from './logger.js';

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: config.email.host,
      port: config.email.port,
      secure: false,
      auth: {
        user: config.email.user,
        pass: config.email.pass
      }
    });
  }

  async sendAlert(to, subject, message) {
    try {
      if (!config.email.user || !config.email.pass) {
        logger.warn('Email configuration missing. Skipping email alert.');
        return;
      }

      const mailOptions = {
        from: config.email.user,
        to,
        subject: `IBD System Alert: ${subject}`,
        html: this.generateEmailTemplate(subject, message)
      };

      await this.transporter.sendMail(mailOptions);
      logger.info(`Alert email sent to ${to}`);
    } catch (error) {
      logger.error('Failed to send alert email:', error);
    }
  }

  generateEmailTemplate(subject, message) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .alert { background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; }
          .info { background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="alert">
          <h2>${subject}</h2>
          <p>${message}</p>
          <p><small>This is an automated message from the IBD System.</small></p>
        </div>
      </body>
      </html>
    `;
  }
}

export default new EmailService();