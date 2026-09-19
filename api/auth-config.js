// Vercel Serverless Function: GET /api/auth-config
// Serves public OAuth Client ID securely from Vercel Environment Variables

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({
    clientId: process.env.GOOGLE_CLIENT_ID || '',
  });
};
