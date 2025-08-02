
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUsers } from '../handlers/get_users';

// Test user data
const testUser1: CreateUserInput = {
  username: 'mechanic1',
  email: 'mechanic1@example.com',
  password: 'password123',
  full_name: 'John Mechanic',
  role: 'MECHANIC'
};

const testUser2: CreateUserInput = {
  username: 'admin1',
  email: 'admin1@example.com',
  password: 'password123',
  full_name: 'Jane Admin',
  role: 'ADMIN'
};

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();
    
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return all users from database', async () => {
    // Create test users in database directly without bcrypt for testing
    await db.insert(usersTable).values([
      {
        username: testUser1.username,
        email: testUser1.email,
        password_hash: 'hashed_password_1',
        full_name: testUser1.full_name,
        role: testUser1.role
      },
      {
        username: testUser2.username,
        email: testUser2.email,
        password_hash: 'hashed_password_2',
        full_name: testUser2.full_name,
        role: testUser2.role
      }
    ]).execute();

    const result = await getUsers();

    expect(result).toHaveLength(2);
    
    // Check first user
    const user1 = result.find(u => u.username === 'mechanic1');
    expect(user1).toBeDefined();
    expect(user1!.email).toEqual('mechanic1@example.com');
    expect(user1!.full_name).toEqual('John Mechanic');
    expect(user1!.role).toEqual('MECHANIC');
    expect(user1!.is_active).toBe(true);
    expect(user1!.created_at).toBeInstanceOf(Date);
    expect(user1!.id).toBeDefined();

    // Check second user
    const user2 = result.find(u => u.username === 'admin1');
    expect(user2).toBeDefined();
    expect(user2!.email).toEqual('admin1@example.com');
    expect(user2!.full_name).toEqual('Jane Admin');
    expect(user2!.role).toEqual('ADMIN');
    expect(user2!.is_active).toBe(true);
    expect(user2!.created_at).toBeInstanceOf(Date);
    expect(user2!.id).toBeDefined();
  });

  it('should return users with correct field types', async () => {
    // Create a test user
    await db.insert(usersTable).values({
      username: testUser1.username,
      email: testUser1.email,
      password_hash: 'hashed_password_test',
      full_name: testUser1.full_name,
      role: testUser1.role,
      is_active: false // Test non-default value
    }).execute();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    const user = result[0];
    
    // Verify field types
    expect(typeof user.id).toBe('number');
    expect(typeof user.username).toBe('string');
    expect(typeof user.email).toBe('string');
    expect(typeof user.password_hash).toBe('string');
    expect(typeof user.full_name).toBe('string');
    expect(typeof user.role).toBe('string');
    expect(typeof user.is_active).toBe('boolean');
    expect(user.created_at).toBeInstanceOf(Date);
    expect(user.updated_at).toBeNull();
    
    // Verify specific values
    expect(user.is_active).toBe(false);
    expect(user.role).toEqual('MECHANIC');
  });

  it('should return users ordered by creation time', async () => {
    // Create users with slight delay to ensure different timestamps
    await db.insert(usersTable).values({
      username: 'first_user',
      email: 'first@example.com',
      password_hash: 'hashed_password_1',
      full_name: 'First User',
      role: 'MECHANIC'
    }).execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(usersTable).values({
      username: 'second_user',
      email: 'second@example.com',
      password_hash: 'hashed_password_2',
      full_name: 'Second User',
      role: 'ADMIN'
    }).execute();

    const result = await getUsers();
    
    expect(result).toHaveLength(2);
    
    // Users should be returned in database order (typically by ID)
    expect(result[0].username).toEqual('first_user');
    expect(result[1].username).toEqual('second_user');
    expect(result[0].created_at <= result[1].created_at).toBe(true);
  });
});
