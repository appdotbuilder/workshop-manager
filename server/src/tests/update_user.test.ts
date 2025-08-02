
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type UpdateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

// Helper function to create a test user
const createTestUser = async (): Promise<number> => {
  const testUserInput: CreateUserInput = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    full_name: 'Test User',
    role: 'MECHANIC'
  };

  // Simple hash simulation for testing (in production, use proper bcrypt)
  const hashedPassword = `hashed_${testUserInput.password}`;

  const result = await db.insert(usersTable)
    .values({
      username: testUserInput.username,
      email: testUserInput.email,
      password_hash: hashedPassword,
      full_name: testUserInput.full_name,
      role: testUserInput.role
    })
    .returning()
    .execute();

  return result[0].id;
};

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update user with all fields', async () => {
    const userId = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: userId,
      username: 'updateduser',
      email: 'updated@example.com',
      full_name: 'Updated User',
      role: 'ADMIN',
      is_active: false
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(userId);
    expect(result.username).toEqual('updateduser');
    expect(result.email).toEqual('updated@example.com');
    expect(result.full_name).toEqual('Updated User');
    expect(result.role).toEqual('ADMIN');
    expect(result.is_active).toEqual(false);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update user with partial fields', async () => {
    const userId = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: userId,
      username: 'partialupdate',
      role: 'KABENG'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(userId);
    expect(result.username).toEqual('partialupdate');
    expect(result.email).toEqual('test@example.com'); // Should remain unchanged
    expect(result.full_name).toEqual('Test User'); // Should remain unchanged
    expect(result.role).toEqual('KABENG');
    expect(result.is_active).toEqual(true); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated user to database', async () => {
    const userId = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: userId,
      username: 'dbupdate',
      email: 'dbupdate@example.com'
    };

    await updateUser(updateInput);

    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].username).toEqual('dbupdate');
    expect(users[0].email).toEqual('dbupdate@example.com');
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent user', async () => {
    const updateInput: UpdateUserInput = {
      id: 999999,
      username: 'nonexistent'
    };

    expect(updateUser(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should handle role updates correctly', async () => {
    const userId = await createTestUser();

    const roles = ['ADMIN', 'OWNER', 'PLANNER'] as const;

    for (const role of roles) {
      const updateInput: UpdateUserInput = {
        id: userId,
        role: role
      };

      const result = await updateUser(updateInput);
      expect(result.role).toEqual(role);
    }
  });

  it('should handle is_active toggle', async () => {
    const userId = await createTestUser();

    // Deactivate user
    let updateInput: UpdateUserInput = {
      id: userId,
      is_active: false
    };

    let result = await updateUser(updateInput);
    expect(result.is_active).toEqual(false);

    // Reactivate user
    updateInput = {
      id: userId,
      is_active: true
    };

    result = await updateUser(updateInput);
    expect(result.is_active).toEqual(true);
  });
});
