
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type CreateCustomerInput } from '../schema';
import { createCustomer, getCustomers, getCustomerById, searchCustomers } from '../handlers/customer_management';
import { eq } from 'drizzle-orm';

// Test inputs
const testCustomerInput: CreateCustomerInput = {
  name: 'John Doe',
  phone: '1234567890',
  email: 'john.doe@example.com',
  address: '123 Main St, City'
};

const testCustomerMinimal: CreateCustomerInput = {
  name: 'Jane Smith',
  phone: '0987654321'
};

describe('Customer Management', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createCustomer', () => {
    it('should create a customer with all fields', async () => {
      const result = await createCustomer(testCustomerInput);

      expect(result.name).toEqual('John Doe');
      expect(result.phone).toEqual('1234567890');
      expect(result.email).toEqual('john.doe@example.com');
      expect(result.address).toEqual('123 Main St, City');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeNull();
    });

    it('should create a customer with minimal fields', async () => {
      const result = await createCustomer(testCustomerMinimal);

      expect(result.name).toEqual('Jane Smith');
      expect(result.phone).toEqual('0987654321');
      expect(result.email).toBeNull();
      expect(result.address).toBeNull();
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save customer to database', async () => {
      const result = await createCustomer(testCustomerInput);

      const customers = await db.select()
        .from(customersTable)
        .where(eq(customersTable.id, result.id))
        .execute();

      expect(customers).toHaveLength(1);
      expect(customers[0].name).toEqual('John Doe');
      expect(customers[0].phone).toEqual('1234567890');
      expect(customers[0].email).toEqual('john.doe@example.com');
    });

    it('should throw error for duplicate phone number', async () => {
      await createCustomer(testCustomerInput);

      const duplicateInput: CreateCustomerInput = {
        name: 'Different Name',
        phone: '1234567890', // Same phone number
        email: 'different@example.com'
      };

      await expect(createCustomer(duplicateInput)).rejects.toThrow(/already exists/i);
    });
  });

  describe('getCustomers', () => {
    it('should return empty array when no customers exist', async () => {
      const result = await getCustomers();
      expect(result).toEqual([]);
    });

    it('should return all customers', async () => {
      await createCustomer(testCustomerInput);
      await createCustomer(testCustomerMinimal);

      const result = await getCustomers();

      expect(result).toHaveLength(2);
      expect(result[0].name).toEqual('John Doe');
      expect(result[1].name).toEqual('Jane Smith');
    });
  });

  describe('getCustomerById', () => {
    it('should return customer when found', async () => {
      const created = await createCustomer(testCustomerInput);

      const result = await getCustomerById(created.id);

      expect(result).not.toBeNull();
      expect(result!.name).toEqual('John Doe');
      expect(result!.phone).toEqual('1234567890');
      expect(result!.id).toEqual(created.id);
    });

    it('should return null when customer not found', async () => {
      const result = await getCustomerById(999);
      expect(result).toBeNull();
    });
  });

  describe('searchCustomers', () => {
    beforeEach(async () => {
      await createCustomer({
        name: 'John Doe',
        phone: '1234567890',
        email: 'john@example.com'
      });
      await createCustomer({
        name: 'Jane Smith',
        phone: '0987654321',
        email: 'jane@test.com'
      });
      await createCustomer({
        name: 'Bob Johnson',
        phone: '5555555555',
        email: 'bob@company.org'
      });
    });

    it('should search by name', async () => {
      const result = await searchCustomers('John');

      expect(result).toHaveLength(2); // John Doe and Bob Johnson
      expect(result.some(c => c.name === 'John Doe')).toBe(true);
      expect(result.some(c => c.name === 'Bob Johnson')).toBe(true);
    });

    it('should search by phone number', async () => {
      const result = await searchCustomers('1234');

      expect(result).toHaveLength(1);
      expect(result[0].name).toEqual('John Doe');
      expect(result[0].phone).toEqual('1234567890');
    });

    it('should search by email', async () => {
      const result = await searchCustomers('test.com');

      expect(result).toHaveLength(1);
      expect(result[0].name).toEqual('Jane Smith');
      expect(result[0].email).toEqual('jane@test.com');
    });

    it('should return empty array for no matches', async () => {
      const result = await searchCustomers('nonexistent');
      expect(result).toEqual([]);
    });

    it('should be case insensitive', async () => {
      const result = await searchCustomers('JANE');

      expect(result).toHaveLength(1);
      expect(result[0].name).toEqual('Jane Smith');
    });
  });
});
