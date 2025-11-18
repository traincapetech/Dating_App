import apiClient from '../api/client.js';

export const sendEmailOTP = async email => {
  return apiClient.post('/otp/email/send', {email});
};

export const verifyEmailOTP = async (email, code) => {
  return apiClient.post('/otp/email/verify', {email, code});
};

