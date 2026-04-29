// Rate limiting configuration
export const RATE_LIMIT_CONFIG = {
  // Authentication endpoints
  auth_login: {
    windowSeconds: 900,  // 15 minutes
    maxRequests: 5,      // 5 attempts per 15 minutes
    lockoutMinutes: 1    // Initial lockout: 1 minute
  },
  
  auth_forgot_password: {
    windowSeconds: 3600, // 1 hour
    maxRequests: 3,       // 3 attempts per hour
    lockoutMinutes: 5     // Initial lockout: 5 minutes
  },
  
  // General API endpoints
  api_general: {
    windowSeconds: 60,    // 1 minute
    maxRequests: 100,     // 100 requests per minute
    lockoutMinutes: 1
  },
  
  // Sensitive operations (user management, system changes)
  api_sensitive: {
    windowSeconds: 60,    // 1 minute
    maxRequests: 20,      // 20 requests per minute
    lockoutMinutes: 5
  },
  
  // File upload operations
  file_upload: {
    windowSeconds: 60,    // 1 minute
    maxRequests: 10,      // 10 uploads per minute
    lockoutMinutes: 2
  }
};

// Progressive penalty configuration
export const PROGRESSIVE_PENALTIES = {
  1: 1,    // 1st violation: 1 minute
  2: 5,    // 2nd violation: 5 minutes
  3: 5,    // 3rd violation: 5 minutes
  4: 30,   // 4th violation: 30 minutes
  5: 30,   // 5th violation: 30 minutes
  10: 1440 // 10+ violations: 24 hours
};

// Helper function to determine lockout duration based on violation count
export function getLockoutDuration(violationCount) {
  const thresholds = Object.keys(PROGRESSIVE_PENALTIES)
    .map(Number)
    .sort((a, b) => b - a); // Sort in descending order
  
  for (const threshold of thresholds) {
    if (violationCount >= threshold) {
      return PROGRESSIVE_PENALTIES[threshold];
    }
  }
  
  return PROGRESSIVE_PENALTIES[1]; // Default to 1 minute
}

// Endpoint type mapping for automatic detection
export const ENDPOINT_TYPE_MAPPING = {
  // Authentication endpoints
  '/api/auth/login': 'auth_login',
  '/api/auth/logout': 'auth_login',
  '/api/auth/forgot-password': 'auth_forgot_password',
  
  // Sensitive operations
  '/api/staff': 'api_sensitive',
  '/api/students': 'api_sensitive',
  '/api/system': 'api_sensitive',
  '/api/courses': 'api_sensitive',
  '/api/sections': 'api_sensitive',
  
  // File upload operations
  '/api/documents': 'file_upload',
  '/api/ingest': 'file_upload',
  
  // Default to general API
  'default': 'api_general'
};

// Function to determine endpoint type from pathname
export function getEndpointType(pathname, method = 'GET') {
  // Check for exact matches first
  if (ENDPOINT_TYPE_MAPPING[pathname]) {
    return ENDPOINT_TYPE_MAPPING[pathname];
  }
  
  // Check for prefix matches
  for (const [path, type] of Object.entries(ENDPOINT_TYPE_MAPPING)) {
    if (pathname.startsWith(path)) {
      return type;
    }
  }
  
  // Check for sensitive operations based on HTTP method
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    // Check if this is a sensitive operation
    const sensitivePaths = ['/api/staff', '/api/students', '/api/system', '/api/courses', '/api/sections'];
    for (const sensitivePath of sensitivePaths) {
      if (pathname.startsWith(sensitivePath)) {
        return 'api_sensitive';
      }
    }
  }
  
  // Check for file upload operations
  if (pathname.includes('documents') || pathname.includes('ingest')) {
    return 'file_upload';
  }
  
  return 'api_general';
}

// Environment-based configuration overrides
export function getConfigWithOverrides() {
  const config = { ...RATE_LIMIT_CONFIG };
  
  // Override with environment variables if present
  if (process.env.RATE_LIMIT_AUTH_LOGIN_WINDOW) {
    config.auth_login.windowSeconds = parseInt(process.env.RATE_LIMIT_AUTH_LOGIN_WINDOW);
  }
  if (process.env.RATE_LIMIT_AUTH_LOGIN_MAX) {
    config.auth_login.maxRequests = parseInt(process.env.RATE_LIMIT_AUTH_LOGIN_MAX);
  }
  
  if (process.env.RATE_LIMIT_API_GENERAL_WINDOW) {
    config.api_general.windowSeconds = parseInt(process.env.RATE_LIMIT_API_GENERAL_WINDOW);
  }
  if (process.env.RATE_LIMIT_API_GENERAL_MAX) {
    config.api_general.maxRequests = parseInt(process.env.RATE_LIMIT_API_GENERAL_MAX);
  }
  
  return config;
}
