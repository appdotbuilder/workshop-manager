
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123',
  full_name: 'Test User',
  role: 'MECHANIC'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with hashed password', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.username).toEqual('testuser');
    expect(result.email).toEqual('test@example.com');
    expect(result.full_name).toEqual('Test User');
    expect(result.role).toEqual('MECHANIC');
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeNull();
    
    // Password should be hashed, not plain text
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('password123');
    expect(result.password_hash.length).toBeGreaterThan(10);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];
    
    expect(savedUser.username).toEqual('testuser');
    expect(savedUser.email).toEqual('test@example.com');
    expect(savedUser.full_name).toEqual('Test User');
    expect(savedUser.role).toEqual('MECHANIC');
    expect(savedUser.is_active).toBe(true);
    expect(savedUser.password_hash).toBeDefined();
    expect(savedUser.created_at).toBeInstanceOf(Date);
  });

  it('should create user with different roles', async () => {
    const adminInput: CreateUserInput = {
      username: 'admin',
      email: 'admin@example.com',
      password: 'adminpass',
      full_name: 'Admin User',
      role: 'ADMIN'
    };

    const result = await createUser(adminInput);

    expect(result.role).toEqual('ADMIN');
    expect(result.username).toEqual('admin');
    expect(result.email).toEqual('admin@example.com');
  });

  it('should enforce unique username constraint', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create another user with same username
    const duplicateInput: CreateUserInput = {
      username: 'testuser', // Same username
      email: 'different@example.com',
      password: 'password456',
      full_name: 'Different User',
      role: 'ADMIN'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/unique/i);
  });

  it('should enforce unique email constraint', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create another user with same email
    const duplicateInput: CreateUserInput = {
      username: 'differentuser',
      email: 'test@example.com', // Same email
      password: 'password456',
      full_name: 'Different User',
      role: 'ADMIN'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/unique/i);
  });
});
