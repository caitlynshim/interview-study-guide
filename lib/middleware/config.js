export const getIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() || 
         req.socket?.remoteAddress ||
         req.connection?.remoteAddress ||
         req.ip ||
         'unknown';
}; 