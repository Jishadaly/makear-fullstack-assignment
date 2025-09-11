
const securityHeaders = (req, res, next) => {
  // Extra security headers
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Hide server info
  res.removeHeader('X-Powered-By');

  next();
};

// Optional: enforce content-type for POST requests
const validateContentType = (req, res, next) => {
  if (req.method === 'POST') {
    const contentType = req.headers['content-type'] || '';

    if (
      !contentType.includes('multipart/form-data') &&
      !contentType.includes('application/json') &&
      !contentType.includes('application/x-www-form-urlencoded')
    ) {
      return res.status(415).json({ error: 'Unsupported Content-Type' });
    }
  }
  next();
};

module.exports = {
  securityHeaders,
  validateContentType,
};
