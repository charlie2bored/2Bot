import twilio from 'twilio';

let twilioClient: any = null;

export function getTwilioClient() {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials missing');
    }

    twilioClient = twilio(accountSid, authToken);
  }
  return twilioClient;
}

export const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
