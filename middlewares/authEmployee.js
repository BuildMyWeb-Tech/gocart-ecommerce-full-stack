// middlewares/authEmployee.js
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'employee_jwt_secret_kingcart';

/**
 * Verifies employee JWT from Authorization header.
 * Returns decoded payload { id, role, storeId, permissions } or null.
 */
export function verifyEmployeeToken(request) {
try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Checks if employee has a specific permission.
 * STORE_OWNER and ADMIN have all permissions.
 */
export function hasPermission(employee, permission) {
  if (!employee) return false;
  if (employee.role === 'STORE_OWNER' || employee.role === 'ADMIN') return true;
  return employee.permissions?.[permission] === true;
}

export const JWT_SECRET_KEY = JWT_SECRET;
