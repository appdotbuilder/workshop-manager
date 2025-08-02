
import { db } from '../db';
import { paymentsTable } from '../db/schema';
import { type CreatePaymentInput, type Payment } from '../schema';
import { eq } from 'drizzle-orm';

export const createPayment = async (input: CreatePaymentInput): Promise<Payment> => {
  try {
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

export const getPaymentsByServiceOrder = async (serviceOrderId: number): Promise<Payment[]> => {
  try {
    const results = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.service_order_id, serviceOrderId))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(payment => ({
      ...payment,
      amount: parseFloat(payment.amount) // Convert string back to number
    }));
  } catch (error) {
    console.error('Failed to fetch payments:', error);
    throw error;
  }
};

export const updatePaymentStatus = async (paymentId: number, status: 'PENDING' | 'PAID' | 'PARTIAL' | 'OVERDUE' | 'CANCELLED', paymentDate?: Date): Promise<Payment> => {
  try {
    const updateData: any = {
      payment_status: status
    };

    if (paymentDate) {
      updateData.payment_date = paymentDate;
    }

    const result = await db.update(paymentsTable)
      .set(updateData)
      .where(eq(paymentsTable.id, paymentId))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Payment not found');
    }

    // Convert numeric fields back to numbers before returning
    const payment = result[0];
    return {
      ...payment,
      amount: parseFloat(payment.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Payment status update failed:', error);
    throw error;
  }
};
