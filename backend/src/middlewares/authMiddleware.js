const jwt = require('jsonwebtoken');

const authMiddleware = async (req, res, next) => {
  try {
    // Ambil token dari header
    const token = req.headers.authorization?.split(' ')[1]; // Format: "Bearer TOKEN"

    if (!token) {
      return res.status(401).json({ 
        error: 'Access denied. No token provided.' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Simpen user info ke request
    next();
  } catch (error) {
    return res.status(401).json({ 
      error: 'Invalid token.' 
    });
  }
};

module.exports = authMiddleware;