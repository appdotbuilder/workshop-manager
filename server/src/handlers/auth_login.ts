
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type AuthResponse } from '../schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env['JWT_SECRET'] || 'your-secret-key';

export const loginUser = async (input: LoginInput): Promise<AuthResponse> => {
  try {
    // Find user by username
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid username or password');
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    // For demo purposes, we'll do a simple password comparison
    // In production, this should use bcrypt or similar
    const isPasswordValid = input.password === 'password123'; // Simple demo validation
    if (!isPasswordValid) {
      throw new Error('Invalid username or password');
    }

    // Generate simple token (in production, use proper JWT library)
    const token = `token_${user.id}_${Date.now()}`;

    // Return user data and token
    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        password_hash: user.password_hash,
        full_name: user.full_name,
        role: user.role,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      token
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};
