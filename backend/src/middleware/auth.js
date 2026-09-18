import jwt from 'jsonwebtoken';

export const protect = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authorized, no access token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'medconnect_super_secret_2026_change_me');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Not authorized, token is invalid or expired' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: `User role '${req.user?.role || 'guest'}' is not authorized to access this route` 
      });
    }
    next();
  };
};

export const optionalAuth = (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      req.user = jwt.verify(token, process.env.JWT_SECRET || 'medconnect_super_secret_2026_change_me');
    } catch (e) {
      // Ignore token parse errors for optional auth
    }
  }
  next();
};
