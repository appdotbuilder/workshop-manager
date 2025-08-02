
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { loginUser } from '../handlers/auth_login';

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should authenticate user with valid credentials', async () => {
    // Create test user
    const result = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password_123',
        full_name: 'Test User',
        role: 'ADMIN',
        is_active: true
      })
      .returning()
      .execute();

    const validLoginInput: LoginInput = {
      username: 'testuser',
      password: 'password123'
    };

    const loginResult = await loginUser(validLoginInput);

    // Verify user data
    expect(loginResult.user.username).toEqual('testuser');
    expect(loginResult.user.email).toEqual('test@example.com');
    expect(loginResult.user.full_name).toEqual('Test User');
    expect(loginResult.user.role).toEqual('ADMIN');
    expect(loginResult.user.is_active).toBe(true);
    expect(loginResult.user.id).toBeDefined();
    expect(loginResult.user.created_at).toBeInstanceOf(Date);

    // Verify token is present
    expect(loginResult.token).toBeDefined();
    expect(typeof loginResult.token).toBe('string');
    expect(loginResult.token).toMatch(/^token_\d+_\d+$/);
  });

  it('should reject invalid username', async () => {
    // Create test user
    await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password_123',
        full_name: 'Test User',
        role: 'ADMIN',
        is_active: true
      })
      .execute();

    const invalidInput: LoginInput = {
      username: 'nonexistent',
      password: 'password123'
    };

    await expect(loginUser(invalidInput)).rejects.toThrow(/invalid username or password/i);
  });

  it('should reject invalid password', async () => {
    // Create test user
    await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password_123',
        full_name: 'Test User',
        role: 'ADMIN',
        is_active: true
      })
      .execute();

    const invalidInput: LoginInput = {
      username: 'testuser',
      password: 'wrongpassword'
    };

    await expect(loginUser(invalidInput)).rejects.toThrow(/invalid username or password/i);
  });

  it('should reject deactivated user', async () => {
    // Create deactivated user
    await db.insert(usersTable)
      .values({
        username: 'deactivated',
        email: 'deactivated@example.com',
        password_hash: 'hashed_password_123',
        full_name: 'Deactivated User',
        role: 'ADMIN',
        is_active: false
      })
      .execute();

    const deactivatedInput: LoginInput = {
      username: 'deactivated',
      password: 'password123'
    };

    await expect(loginUser(deactivatedInput)).rejects.toThrow(/account is deactivated/i);
  });

  it('should handle different user roles', async () => {
    // Create mechanic user
    await db.insert(usersTable)
      .values({
        username: 'mechanic1',
        email: 'mechanic@example.com',
        password_hash: 'hashed_mechanic_password',
        full_name: 'Mechanic User',
        role: 'MECHANIC',
        is_active: true
      })
      .execute();

    const mechanicLogin: LoginInput = {
      username: 'mechanic1',
      password: 'password123'
    };

    const result = await loginUser(mechanicLogin);

    expect(result.user.role).toEqual('MECHANIC');
    expect(result.user.full_name).toEqual('Mechanic User');
    expect(result.token).toBeDefined();
  });

  it('should reject empty username', async () => {
    // Create test user
    await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password_123',
        full_name: 'Test User',
        role: 'ADMIN',
        is_active: true
      })
      .execute();

    const emptyInput: LoginInput = {
      username: '',
      password: 'password123'
    };

    await expect(loginUser(emptyInput)).rejects.toThrow(/invalid username or password/i);
  });

  it('should handle case-sensitive username', async () => {
    // Create test user
    await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password_123',
        full_name: 'Test User',
        role: 'ADMIN',
        is_active: true
      })
      .execute();

    const casedInput: LoginInput = {
      username: 'TESTUSER', // Different case
      password: 'password123'
    };

    await expect(loginUser(casedInput)).rejects.toThrow(/invalid username or password/i);
  });

  it('should return user with all required fields', async () => {
    // Create test user
    await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password_123',
        full_name: 'Test User',
        role: 'ADMIN',
        is_active: true
      })
      .execute();

    const validLoginInput: LoginInput = {
      username: 'testuser',
      password: 'password123'
    };

    const result = await loginUser(validLoginInput);

    // Verify all user schema fields are present
    expect(result.user).toHaveProperty('id');
    expect(result.user).toHaveProperty('username');
    expect(result.user).toHaveProperty('email');
    expect(result.user).toHaveProperty('password_hash');
    expect(result.user).toHaveProperty('full_name');
    expect(result.user).toHaveProperty('role');
    expect(result.user).toHaveProperty('is_active');
    expect(result.user).toHaveProperty('created_at');
    expect(result.user).toHaveProperty('updated_at');

    // Verify types
    expect(typeof result.user.id).toBe('number');
    expect(typeof result.user.username).toBe('string');
    expect(typeof result.user.email).toBe('string');
    expect(typeof result.user.password_hash).toBe('string');
    expect(typeof result.user.full_name).toBe('string');
    expect(typeof result.user.is_active).toBe('boolean');
    expect(result.user.created_at).toBeInstanceOf(Date);
  });

  it('should generate unique tokens for different logins', async () => {
    // Create test user
    await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password_123',
        full_name: 'Test User',
        role: 'ADMIN',
        is_active: true
      })
      .execute();

    const validLoginInput: LoginInput = {
      username: 'testuser',
      password: 'password123'
    };

    const result1 = await loginUser(validLoginInput);
    
    // Wait a millisecond to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 1));
    
    const result2 = await loginUser(validLoginInput);

    expect(result1.token).not.toEqual(result2.token);
    expect(result1.token).toMatch(/^token_\d+_\d+$/);
    expect(result2.token).toMatch(/^token_\d+_\d+$/);
  });
});
