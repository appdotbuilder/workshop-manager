
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type UpdateUserInput } from '../schema';
import { createUser, updateUser, getUsers, getUserById, deleteUser } from '../handlers/user_management';
import { eq } from 'drizzle-orm';

const testUserInput: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123',
  full_name: 'Test User',
  role: 'MECHANIC'
};

const testAdminInput: CreateUserInput = {
  username: 'admin',
  email: 'admin@example.com',
  password: 'adminpass',
  full_name: 'Admin User',
  role: 'ADMIN'
};

describe('User Management', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createUser', () => {
    it('should create a new user', async () => {
      const result = await createUser(testUserInput);

      expect(result.username).toEqual('testuser');
      expect(result.email).toEqual('test@example.com');
      expect(result.full_name).toEqual('Test User');
      expect(result.role).toEqual('MECHANIC');
      expect(result.is_active).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.password_hash).toBeDefined();
      expect(result.password_hash).not.toEqual('password123'); // Should be hashed
    });

    it('should save user to database', async () => {
      const result = await createUser(testUserInput);

      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, result.id))
        .execute();

      expect(users).toHaveLength(1);
      expect(users[0].username).toEqual('testuser');
      expect(users[0].email).toEqual('test@example.com');
      expect(users[0].role).toEqual('MECHANIC');
      expect(users[0].is_active).toBe(true);
    });

    it('should create user with different roles', async () => {
      const adminResult = await createUser(testAdminInput);
      expect(adminResult.role).toEqual('ADMIN');

      const plannerInput: CreateUserInput = {
        username: 'planner',
        email: 'planner@example.com',
        password: 'plannerpass',
        full_name: 'Planner User',
        role: 'PLANNER'
      };

      const plannerResult = await createUser(plannerInput);
      expect(plannerResult.role).toEqual('PLANNER');
    });

    it('should handle duplicate username error', async () => {
      await createUser(testUserInput);

      const duplicateInput: CreateUserInput = {
        ...testUserInput,
        email: 'different@example.com'
      };

      await expect(createUser(duplicateInput)).rejects.toThrow();
    });

    it('should handle duplicate email error', async () => {
      await createUser(testUserInput);

      const duplicateInput: CreateUserInput = {
        ...testUserInput,
        username: 'differentuser'
      };

      await expect(createUser(duplicateInput)).rejects.toThrow();
    });
  });

  describe('updateUser', () => {
    it('should update user information', async () => {
      const user = await createUser(testUserInput);

      const updateData: UpdateUserInput = {
        id: user.id,
        full_name: 'Updated Name',
        role: 'ADMIN',
        is_active: false
      };

      const result = await updateUser(updateData);

      expect(result.id).toEqual(user.id);
      expect(result.full_name).toEqual('Updated Name');
      expect(result.role).toEqual('ADMIN');
      expect(result.is_active).toBe(false);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should update only provided fields', async () => {
      const user = await createUser(testUserInput);

      const updateData: UpdateUserInput = {
        id: user.id,
        full_name: 'Partial Update'
      };

      const result = await updateUser(updateData);

      expect(result.full_name).toEqual('Partial Update');
      expect(result.username).toEqual(user.username); // Should remain unchanged
      expect(result.email).toEqual(user.email); // Should remain unchanged
      expect(result.role).toEqual(user.role); // Should remain unchanged
    });

    it('should handle non-existent user', async () => {
      const updateData: UpdateUserInput = {
        id: 999,
        full_name: 'Non-existent'
      };

      await expect(updateUser(updateData)).rejects.toThrow(/User not found/i);
    });

    it('should save updates to database', async () => {
      const user = await createUser(testUserInput);

      const updateData: UpdateUserInput = {
        id: user.id,
        username: 'updateduser',
        email: 'updated@example.com'
      };

      await updateUser(updateData);

      const updatedUser = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, user.id))
        .execute();

      expect(updatedUser[0].username).toEqual('updateduser');
      expect(updatedUser[0].email).toEqual('updated@example.com');
      expect(updatedUser[0].updated_at).toBeInstanceOf(Date);
    });
  });

  describe('getUsers', () => {
    it('should return empty array when no users exist', async () => {
      const result = await getUsers();
      expect(result).toEqual([]);
    });

    it('should return all users', async () => {
      await createUser(testUserInput);
      await createUser(testAdminInput);

      const result = await getUsers();

      expect(result).toHaveLength(2);
      expect(result.map(u => u.username)).toContain('testuser');
      expect(result.map(u => u.username)).toContain('admin');
    });

    it('should include inactive users', async () => {
      const user = await createUser(testUserInput);
      
      // Deactivate user
      await updateUser({
        id: user.id,
        is_active: false
      });

      const result = await getUsers();

      expect(result).toHaveLength(1);
      expect(result[0].is_active).toBe(false);
    });
  });

  describe('getUserById', () => {
    it('should return user by id', async () => {
      const user = await createUser(testUserInput);

      const result = await getUserById(user.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(user.id);
      expect(result!.username).toEqual('testuser');
      expect(result!.email).toEqual('test@example.com');
    });

    it('should return null for non-existent user', async () => {
      const result = await getUserById(999);
      expect(result).toBeNull();
    });

    it('should return inactive users', async () => {
      const user = await createUser(testUserInput);
      
      await updateUser({
        id: user.id,
        is_active: false
      });

      const result = await getUserById(user.id);

      expect(result).not.toBeNull();
      expect(result!.is_active).toBe(false);
    });
  });

  describe('deleteUser', () => {
    it('should soft delete user by setting is_active to false', async () => {
      const user = await createUser(testUserInput);

      const result = await deleteUser(user.id);

      expect(result).toBe(true);

      // Verify user still exists but is inactive
      const deletedUser = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, user.id))
        .execute();

      expect(deletedUser).toHaveLength(1);
      expect(deletedUser[0].is_active).toBe(false);
      expect(deletedUser[0].updated_at).toBeInstanceOf(Date);
    });

    it('should return false for non-existent user', async () => {
      const result = await deleteUser(999);
      expect(result).toBe(false);
    });

    it('should handle multiple deletions of same user', async () => {
      const user = await createUser(testUserInput);

      const firstDelete = await deleteUser(user.id);
      const secondDelete = await deleteUser(user.id);

      expect(firstDelete).toBe(true);
      expect(secondDelete).toBe(true); // Should still return true as user exists

      // Verify user is still inactive
      const deletedUser = await getUserById(user.id);
      expect(deletedUser!.is_active).toBe(false);
    });
  });
});
