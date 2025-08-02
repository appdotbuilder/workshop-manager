
import { db } from '../db';
import { paymentsTable } from '../db/schema';
import { type Payment } from '../schema';

export const getPayments = async (): Promise<Payment[]> => {
  try {
    const results = await db.select()
      .from(paymentsTable)
      .execute();

    // Convert numeric fields back to numbers for all payment records
    return results.map(payment => ({
      ...payment,
      amount: parseFloat(payment.amount) // Convert string back to number
    }));
  } catch (error) {
    console.error('Failed to fetch payments:', error);
    throw error;
  }
};
