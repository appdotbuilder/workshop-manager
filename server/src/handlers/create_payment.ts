
import { db } from '../db';
import { paymentsTable, serviceOrdersTable } from '../db/schema';
import { type CreatePaymentInput, type Payment } from '../schema';
import { eq } from 'drizzle-orm';

export const createPayment = async (input: CreatePaymentInput): Promise<Payment> => {
  try {
    // Verify that the service order exists
    const serviceOrder = await db.select()
      .from(serviceOrdersTable)
      .where(eq(serviceOrdersTable.id, input.service_order_id))
      .execute();

    if (serviceOrder.length === 0) {
      throw new Error(`Service order with ID ${input.service_order_id} not found`);
    }

    // Insert payment record
    const result = await db.insert(paymentsTable)
      .values({
        service_order_id: input.service_order_id,
        amount: input.amount.toString(), // Convert number to string for numeric column
        payment_method: input.payment_method,
        transaction_id: input.transaction_id || null,
        created_by_id: input.created_by_id
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const payment = result[0];
    return {
      ...payment,
      amount: parseFloat(payment.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Payment creation failed:', error);
    throw error;
  }
};
