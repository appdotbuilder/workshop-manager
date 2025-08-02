
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { login, validateToken, createUserWithHashedPassword } from '../handlers/auth';
import { eq } from 'drizzle-orm';

const testUserData = {
  username: 'testmechanic',
  email: 'test@example.com',
  password: 'password123',
  full_name: 'Test Mechanic',
  role: 'MECHANIC' as const
};

const testLoginInput: LoginInput = {
  username: 'testmechanic',
  password: 'password123'
};

describe('Authentication', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('login', () => {
    it('should authenticate valid user credentials', async () => {
      // Create test user
      await createUserWithHashedPassword(testUserData);

      const result = await login(testLoginInput);

      // Verify response structure
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');

      // Verify user data
      expect(result.user.username).toEqual('testmechanic');
      expect(result.user.email).toEqual('test@example.com');
      expect(result.user.full_name).toEqual('Test Mechanic');
      expect(result.user.role).toEqual('MECHANIC');
      expect(result.user.is_active).toBe(true);

      // Ensure password hash is not included in response
      expect((result.user as any).password_hash).toBeUndefined();
    });

    it('should reject invalid username', async () => {
      // Create test user
      await createUserWithHashedPassword(testUserData);

      const invalidInput: LoginInput = {
        username: 'nonexistent',
        password: 'password123'
      };

      await expect(login(invalidInput)).rejects.toThrow(/invalid credentials/i);
    });

    it('should reject invalid password', async () => {
      // Create test user
      await createUserWithHashedPassword(testUserData);

      const invalidInput: LoginInput = {
        username: 'testmechanic',
        password: 'wrongpassword'
      };

      await expect(login(invalidInput)).rejects.toThrow(/invalid credentials/i);
    });

    it('should reject deactivated user', async () => {
      // Create test user
      const user = await createUserWithHashedPassword(testUserData);

      // Deactivate user
      await db.update(usersTable)
        .set({ is_active: false })
        .where(eq(usersTable.id, user.id))
        .execute();

      await expect(login(testLoginInput)).rejects.toThrow(/account is deactivated/i);
    });

    it('should generate valid JWT token', async () => {
      // Create test user
      await createUserWithHashedPassword(testUserData);

      const result = await login(testLoginInput);

      // Token should be a non-empty string
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(result.token.length).toBeGreaterThan(0);

      // Token should have JWT structure (3 parts separated by dots)
      const tokenParts = result.token.split('.');
      expect(tokenParts).toHaveLength(3);
    });
  });

  describe('validateToken', () => {
    it('should validate valid token and return user data', async () => {
      // Create test user and login to get token
      await createUserWithHashedPassword(testUserData);
      const loginResult = await login(testLoginInput);

      const user = await validateToken(loginResult.token);

      expect(user).toBeDefined();
      expect(user?.username).toEqual('testmechanic');
      expect(user?.email).toEqual('test@example.com');
      expect(user?.role).toEqual('MECHANIC');
      expect(user?.is_active).toBe(true);

      // Ensure password hash is not included
      expect((user as any)?.password_hash).toBeUndefined();
    });

    it('should reject invalid token', async () => {
      const invalidToken = 'invalid.jwt.token';

      const user = await validateToken(invalidToken);

      expect(user).toBeNull();
    });

    it('should reject token for non-existent user', async () => {
      // Create test user and get token
      await createUserWithHashedPassword(testUserData);
      const loginResult = await login(testLoginInput);

      // Delete user from database
      await db.delete(usersTable)
        .where(eq(usersTable.username, 'testmechanic'))
        .execute();

      const user = await validateToken(loginResult.token);

      expect(user).toBeNull();
    });

    it('should reject token for deactivated user', async () => {
      // Create test user and get token
      const testUser = await createUserWithHashedPassword(testUserData);
      const loginResult = await login(testLoginInput);

      // Deactivate user
      await db.update(usersTable)
        .set({ is_active: false })
        .where(eq(usersTable.id, testUser.id))
        .execute();

      const user = await validateToken(loginResult.token);

      expect(user).toBeNull();
    });

    it('should handle malformed token gracefully', async () => {
      const malformedTokens = [
        '',
        'not-a-jwt',
        'header.payload', // missing signature
        'invalid.jwt.format.extra.parts'
      ];

      for (const token of malformedTokens) {
        const user = await validateToken(token);
        expect(user).toBeNull();
      }
    });

    it('should reject expired token', async () => {
      // This test verifies the token expiration logic
      // We'll simulate an expired token by creating one with past expiration
      const expiredTokenPayload = {
        userId: 1,
        username: 'test',
        role: 'MECHANIC',
        iat: Date.now() - 10000,
        exp: Date.now() - 5000 // Expired 5 seconds ago
      };

      // Manually create expired token structure
      const encodedPayload = btoa(JSON.stringify(expiredTokenPayload));
      const encodedHeader = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      
      // Create signature (simplified for test)
      const data = `${encodedHeader}.${encodedPayload}`;
      const hasher = new Bun.CryptoHasher('sha256');
      hasher.update(data + (process.env['JWT_SECRET'] || 'your-secret-key-change-in-production'));
      const signature = hasher.digest('hex');
      const encodedSignature = btoa(signature);
      
      const expiredToken = `${encodedHeader}.${encodedPayload}.${encodedSignature}`;

      const user = await validateToken(expiredToken);
      expect(user).toBeNull();
    });
  });

  describe('createUserWithHashedPassword', () => {
    it('should create user with hashed password', async () => {
      const user = await createUserWithHashedPassword(testUserData);

      // Verify user creation
      expect(user.username).toEqual('testmechanic');
      expect(user.email).toEqual('test@example.com');
      expect(user.full_name).toEqual('Test Mechanic');
      expect(user.role).toEqual('MECHANIC');
      expect(user.is_active).toBe(true);
      expect(user.id).toBeDefined();
      expect(user.created_at).toBeInstanceOf(Date);

      // Verify password is hashed in database
      const dbUsers = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, user.id))
        .execute();

      expect(dbUsers).toHaveLength(1);
      expect(dbUsers[0].password_hash).toBeDefined();
      expect(dbUsers[0].password_hash).not.toEqual('password123'); // Should be hashed
      expect(dbUsers[0].password_hash.length).toBeGreaterThan(0);
    });

    it('should create users with different roles', async () => {
      const roles = ['MECHANIC', 'ADMIN', 'KABENG', 'OWNER', 'PLANNER'] as const;

      for (const role of roles) {
        const userData = {
          ...testUserData,
          username: `test${role.toLowerCase()}`,
          email: `${role.toLowerCase()}@example.com`,
          role
        };

        const user = await createUserWithHashedPassword(userData);
        expect(user.role).toEqual(role);
      }
    });

    it('should hash different passwords differently', async () => {
      const user1Data = { ...testUserData, username: 'user1', email: 'user1@test.com', password: 'password1' };
      const user2Data = { ...testUserData, username: 'user2', email: 'user2@test.com', password: 'password2' };

      await createUserWithHashedPassword(user1Data);
      await createUserWithHashedPassword(user2Data);

      // Get both users from database
      const dbUsers = await db.select()
        .from(usersTable)
        .execute();

      expect(dbUsers).toHaveLength(2);
      expect(dbUsers[0].password_hash).not.toEqual(dbUsers[1].password_hash);
    });
  });

  describe('password verification', () => {
    it('should authenticate with correct password after user creation', async () => {
      // Create user
      await createUserWithHashedPassword(testUserData);

      // Try to login with same password
      const result = await login(testLoginInput);

      expect(result.user.username).toEqual('testmechanic');
      expect(result.token).toBeDefined();
    });

    it('should fail authentication with wrong password after user creation', async () => {
      // Create user
      await createUserWithHashedPassword(testUserData);

      // Try to login with wrong password
      const wrongPasswordInput: LoginInput = {
        username: 'testmechanic',
        password: 'wrongpassword'
      };

      await expect(login(wrongPasswordInput)).rejects.toThrow(/invalid credentials/i);
    });
  });
});
