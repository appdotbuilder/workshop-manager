
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Hash the password (using Bun's built-in password hashing)
    const password_hash = await Bun.password.hash(input.password);

    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        username: input.username,
        email: input.email,
        password_hash: password_hash,
        full_name: input.full_name,
        role: input.role
      })
      .returning()
      .execute();

    const user = result[0];
    return {
      ...user,
      // Ensure boolean conversion for is_active (should already be boolean from DB)
      is_active: Boolean(user.is_active)
    };
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};
