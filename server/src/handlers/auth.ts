
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type AuthResponse, type User } from '../schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env['JWT_SECRET'] || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Simple password hashing using Bun's built-in crypto
async function hashPassword(password: string): Promise<string> {
  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(password + JWT_SECRET); // Add salt
  return hasher.digest('hex');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(password + JWT_SECRET); // Add salt
  const computedHash = hasher.digest('hex');
  return computedHash === hash;
}

// Simple JWT implementation using base64 encoding
function createToken(payload: any): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Date.now();
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + JWT_EXPIRES_IN
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(tokenPayload));
  
  // Create signature using HMAC-like approach
  const data = `${encodedHeader}.${encodedPayload}`;
  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(data + JWT_SECRET);
  const signature = hasher.digest('hex');
  const encodedSignature = btoa(signature);

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

function verifyToken(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    
    // Verify signature
    const data = `${encodedHeader}.${encodedPayload}`;
    const hasher = new Bun.CryptoHasher('sha256');
    hasher.update(data + JWT_SECRET);
    const expectedSignature = hasher.digest('hex');
    const expectedEncodedSignature = btoa(expectedSignature);

    if (encodedSignature !== expectedEncodedSignature) {
      return null;
    }

    // Decode payload
    const payload = JSON.parse(atob(encodedPayload));
    
    // Check expiration
    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}

export const login = async (input: LoginInput): Promise<AuthResponse> => {
  try {
    // Find user by username
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    // Verify password
    const isValidPassword = await verifyPassword(input.password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT token
    const token = createToken({
      userId: user.id,
      username: user.username,
      role: user.role
    });

    // Return user data (without password hash) and token
    const { password_hash, ...userWithoutPassword } = user;
    
    return {
      user: userWithoutPassword as User,
      token
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

export const validateToken = async (token: string): Promise<User | null> => {
  try {
    // Verify and decode JWT token
    const decoded = verifyToken(token);
    
    if (!decoded || !decoded.userId) {
      return null;
    }

    // Fetch current user data from database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, decoded.userId))
      .execute();

    if (users.length === 0) {
      return null;
    }

    const user = users[0];

    // Check if user is still active
    if (!user.is_active) {
      return null;
    }

    // Return user data without password hash
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  } catch (error) {
    console.error('Token validation failed:', error);
    return null;
  }
};

// Helper function for creating user with password hashing (used in tests)
export const createUserWithHashedPassword = async (userData: {
  username: string;
  email: string;
  password: string;
  full_name: string;
  role: 'MECHANIC' | 'ADMIN' | 'KABENG' | 'OWNER' | 'PLANNER';
}): Promise<User> => {
  try {
    const passwordHash = await hashPassword(userData.password);
    
    const result = await db.insert(usersTable)
      .values({
        username: userData.username,
        email: userData.email,
        password_hash: passwordHash,
        full_name: userData.full_name,
        role: userData.role
      })
      .returning()
      .execute();

    const { password_hash, ...userWithoutPassword } = result[0];
    return userWithoutPassword as User;
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};
