
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type CreateCustomerInput } from '../schema';
import { getCustomers } from '../handlers/get_customers';

describe('getCustomers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no customers exist', async () => {
    const result = await getCustomers();

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return all customers', async () => {
    // Create test customers
    const testCustomer1: CreateCustomerInput = {
      name: 'John Doe',
      phone: '1234567890',
      email: 'john@example.com',
      address: '123 Main St'
    };

    const testCustomer2: CreateCustomerInput = {
      name: 'Jane Smith',
      phone: '0987654321',
      email: 'jane@example.com',
      address: '456 Oak Ave'
    };

    await db.insert(customersTable)
      .values([
        {
          name: testCustomer1.name,
          phone: testCustomer1.phone,
          email: testCustomer1.email,
          address: testCustomer1.address
        },
        {
          name: testCustomer2.name,
          phone: testCustomer2.phone,
          email: testCustomer2.email,
          address: testCustomer2.address
        }
      ])
      .execute();

    const result = await getCustomers();

    expect(result).toHaveLength(2);
    
    // Verify first customer
    expect(result[0].name).toEqual('John Doe');
    expect(result[0].phone).toEqual('1234567890');
    expect(result[0].email).toEqual('john@example.com');
    expect(result[0].address).toEqual('123 Main St');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);

    // Verify second customer
    expect(result[1].name).toEqual('Jane Smith');
    expect(result[1].phone).toEqual('0987654321');
    expect(result[1].email).toEqual('jane@example.com');
    expect(result[1].address).toEqual('456 Oak Ave');
    expect(result[1].id).toBeDefined();
    expect(result[1].created_at).toBeInstanceOf(Date);
  });

  it('should handle customers with optional fields', async () => {
    // Create customer with minimal required fields
    await db.insert(customersTable)
      .values({
        name: 'Bob Wilson',
        phone: '5555555555',
        email: null, // Optional field
        address: null // Optional field
      })
      .execute();

    const result = await getCustomers();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Bob Wilson');
    expect(result[0].phone).toEqual('5555555555');
    expect(result[0].email).toBeNull();
    expect(result[0].address).toBeNull();
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeNull();
  });

  it('should return customers ordered by creation date', async () => {
    // Create customers with slight delay to ensure different timestamps
    await db.insert(customersTable)
      .values({
        name: 'First Customer',
        phone: '1111111111'
      })
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(customersTable)
      .values({
        name: 'Second Customer', 
        phone: '2222222222'
      })
      .execute();

    const result = await getCustomers();

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('First Customer');
    expect(result[1].name).toEqual('Second Customer');
    expect(result[0].created_at <= result[1].created_at).toBe(true);
  });
});
