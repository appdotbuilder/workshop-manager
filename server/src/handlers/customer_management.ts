
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type CreateCustomerInput, type Customer } from '../schema';
import { eq, or, ilike } from 'drizzle-orm';

export const createCustomer = async (input: CreateCustomerInput): Promise<Customer> => {
  try {
    // Check if phone number already exists
    const existingCustomer = await db.select()
      .from(customersTable)
      .where(eq(customersTable.phone, input.phone))
      .execute();

    if (existingCustomer.length > 0) {
      throw new Error(`Customer with phone number ${input.phone} already exists`);
    }

    // Insert customer record
    const result = await db.insert(customersTable)
      .values({
        name: input.name,
        phone: input.phone,
        email: input.email || null,
        address: input.address || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Customer creation failed:', error);
    throw error;
  }
};

export const getCustomers = async (): Promise<Customer[]> => {
  try {
    const customers = await db.select()
      .from(customersTable)
      .execute();

    return customers;
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    throw error;
  }
};

export const getCustomerById = async (id: number): Promise<Customer | null> => {
  try {
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, id))
      .execute();

    return customers.length > 0 ? customers[0] : null;
  } catch (error) {
    console.error('Failed to fetch customer by ID:', error);
    throw error;
  }
};

export const searchCustomers = async (query: string): Promise<Customer[]> => {
  try {
    const customers = await db.select()
      .from(customersTable)
      .where(
        or(
          ilike(customersTable.name, `%${query}%`),
          ilike(customersTable.phone, `%${query}%`),
          ilike(customersTable.email, `%${query}%`)
        )
      )
      .execute();

    return customers;
  } catch (error) {
    console.error('Customer search failed:', error);
    throw error;
  }
};
