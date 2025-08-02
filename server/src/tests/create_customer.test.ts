
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type CreateCustomerInput } from '../schema';
import { createCustomer } from '../handlers/create_customer';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateCustomerInput = {
  name: 'John Doe',
  phone: '1234567890',
  email: 'john.doe@example.com',
  address: '123 Main St, City, State'
};

describe('createCustomer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a customer with all fields', async () => {
    const result = await createCustomer(testInput);

    // Basic field validation
    expect(result.name).toEqual('John Doe');
    expect(result.phone).toEqual('1234567890');
    expect(result.email).toEqual('john.doe@example.com');
    expect(result.address).toEqual('123 Main St, City, State');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeNull();
  });

  it('should create a customer with optional fields as null', async () => {
    const minimalInput: CreateCustomerInput = {
      name: 'Jane Smith',
      phone: '0987654321'
    };

    const result = await createCustomer(minimalInput);

    expect(result.name).toEqual('Jane Smith');
    expect(result.phone).toEqual('0987654321');
    expect(result.email).toBeNull();
    expect(result.address).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save customer to database', async () => {
    const result = await createCustomer(testInput);

    // Query using proper drizzle syntax
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, result.id))
      .execute();

    expect(customers).toHaveLength(1);
    expect(customers[0].name).toEqual('John Doe');
    expect(customers[0].phone).toEqual('1234567890');
    expect(customers[0].email).toEqual('john.doe@example.com');
    expect(customers[0].address).toEqual('123 Main St, City, State');
    expect(customers[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle unique phone constraint violation', async () => {
    // Create first customer
    await createCustomer(testInput);

    // Try to create another customer with same phone
    const duplicateInput: CreateCustomerInput = {
      name: 'Different Name',
      phone: '1234567890', // Same phone number
      email: 'different@example.com'
    };

    await expect(createCustomer(duplicateInput)).rejects.toThrow(/unique constraint/i);
  });

  it('should create multiple customers with different phones', async () => {
    const customer1 = await createCustomer({
      name: 'Customer One',
      phone: '1111111111',
      email: 'customer1@example.com'
    });

    const customer2 = await createCustomer({
      name: 'Customer Two',
      phone: '2222222222',
      email: 'customer2@example.com'
    });

    expect(customer1.id).not.toEqual(customer2.id);
    expect(customer1.phone).toEqual('1111111111');
    expect(customer2.phone).toEqual('2222222222');

    // Verify both are in database
    const allCustomers = await db.select()
      .from(customersTable)
      .execute();

    expect(allCustomers).toHaveLength(2);
  });
});
