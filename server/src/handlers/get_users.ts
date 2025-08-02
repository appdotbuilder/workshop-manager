
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User } from '../schema';

export const getUsers = async (): Promise<User[]> => {
  try {
    const result = await db.select()
      .from(usersTable)
      .execute();

    // Return users with proper field mapping
    return result.map(user => ({
      ...user,
      created_at: user.created_at,
      updated_at: user.updated_at
    }));
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
};
