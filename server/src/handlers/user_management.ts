
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type UpdateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

// Simple password hashing (in production, use bcrypt or similar)
function hashPassword(password: string): string {
  // This is a basic implementation - use bcrypt in production
  return Buffer.from(password).toString('base64');
}

export async function createUser(input: CreateUserInput): Promise<User> {
  try {
    // Hash the password
    const password_hash = hashPassword(input.password);

    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        username: input.username,
        email: input.email,
        password_hash,
        full_name: input.full_name,
        role: input.role,
        is_active: true // Default to active for new users
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
}

export async function updateUser(input: UpdateUserInput): Promise<User> {
  try {
    // Build update object with only provided fields
    const updateData: Partial<typeof usersTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.username !== undefined) {
      updateData.username = input.username;
    }
    if (input.email !== undefined) {
      updateData.email = input.email;
    }
    if (input.full_name !== undefined) {
      updateData.full_name = input.full_name;
    }
    if (input.role !== undefined) {
      updateData.role = input.role;
    }
    if (input.is_active !== undefined) {
      updateData.is_active = input.is_active;
    }

    const result = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('User not found');
    }

    return result[0];
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
}

export async function getUsers(): Promise<User[]> {
  try {
    const users = await db.select()
      .from(usersTable)
      .execute();

    return users;
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
}

export async function getUserById(id: number): Promise<User | null> {
  try {
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .execute();

    return users.length > 0 ? users[0] : null;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw error;
  }
}

export async function deleteUser(id: number): Promise<boolean> {
  try {
    // Soft delete by setting is_active to false
    const result = await db.update(usersTable)
      .set({ 
        is_active: false,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, id))
      .returning()
      .execute();

    return result.length > 0;
  } catch (error) {
    console.error('User deletion failed:', error);
    throw error;
  }
}
