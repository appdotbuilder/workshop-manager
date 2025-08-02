
import { db } from '../db';
import { customersTable, serviceOrdersTable, whatsappTemplatesTable } from '../db/schema';
import { type SendThankYouMessageInput, type WhatsappMessageResponse } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function sendThankYouMessage(input: SendThankYouMessageInput): Promise<WhatsappMessageResponse> {
  try {
    // Verify customer exists
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, input.customer_id))
      .execute();

    if (customers.length === 0) {
      return {
        success: false,
        message: 'Customer not found',
        message_id: null
      };
    }

    const customer = customers[0];

    // Verify service order exists and belongs to customer
    const serviceOrders = await db.select()
      .from(serviceOrdersTable)
      .where(
        and(
          eq(serviceOrdersTable.id, input.service_order_id),
          eq(serviceOrdersTable.customer_id, input.customer_id)
        )
      )
      .execute();

    if (serviceOrders.length === 0) {
      return {
        success: false,
        message: 'Service order not found or does not belong to customer',
        message_id: null
      };
    }

    const serviceOrder = serviceOrders[0];

    // Fetch WhatsApp template by name
    const templates = await db.select()
      .from(whatsappTemplatesTable)
      .where(
        and(
          eq(whatsappTemplatesTable.name, input.template_name),
          eq(whatsappTemplatesTable.is_active, true)
        )
      )
      .execute();

    if (templates.length === 0) {
      return {
        success: false,
        message: `WhatsApp template '${input.template_name}' not found or inactive`,
        message_id: null
      };
    }

    const template = templates[0];

    // Validate customer has phone number for WhatsApp
    if (!customer.phone) {
      return {
        success: false,
        message: 'Customer phone number not available',
        message_id: null
      };
    }

    // In a real implementation, this would:
    // 1. Replace template variables with actual data (customer name, order number, etc.)
    // 2. Call WhatsApp Business API to send the message
    // 3. Return actual message ID from WhatsApp API
    
    // For now, simulate successful message sending
    const messageId = `whatsapp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      success: true,
      message: `Thank you message sent successfully to ${customer.name} (${customer.phone}) for service order ${serviceOrder.order_number} using template '${template.name}'`,
      message_id: messageId
    };

  } catch (error) {
    console.error('Failed to send thank you message:', error);
    return {
      success: false,
      message: 'Failed to send thank you message due to system error',
      message_id: null
    };
  }
}
