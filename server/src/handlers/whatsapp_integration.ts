
import { db } from '../db';
import { whatsappTemplatesTable, customersTable, serviceOrdersTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { type SendThankYouMessageInput, type WhatsappMessageResponse } from '../schema';

export interface WhatsAppMessage {
  recipient: string;
  message: string;
  type: 'update' | 'estimate' | 'invoice' | 'thank_you';
}

// Mock WhatsApp API integration
const sendWhatsAppMessage = async (phone: string, message: string): Promise<{ success: boolean; message_id?: string }> => {
  // This would integrate with actual WhatsApp Business API
  // For now, simulate API call with delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Simulate success/failure based on phone format
  const isValidPhone = /^\+?\d{10,15}$/.test(phone);
  
  if (isValidPhone) {
    return {
      success: true,
      message_id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  } else {
    return { success: false };
  }
};

export async function sendServiceUpdate(serviceOrderId: number, message: string): Promise<boolean> {
  try {
    // Get customer phone from service order
    const result = await db.select({
      phone: customersTable.phone
    })
    .from(serviceOrdersTable)
    .innerJoin(customersTable, eq(serviceOrdersTable.customer_id, customersTable.id))
    .where(eq(serviceOrdersTable.id, serviceOrderId))
    .execute();

    if (result.length === 0) {
      return false;
    }

    const { phone } = result[0];
    const response = await sendWhatsAppMessage(phone, message);
    return response.success;
  } catch (error) {
    console.error('Failed to send service update:', error);
    return false;
  }
}

export async function sendEstimateMessage(serviceOrderId: number, estimationData: any): Promise<boolean> {
  try {
    // Get customer phone from service order
    const result = await db.select({
      phone: customersTable.phone,
      customer_name: customersTable.name
    })
    .from(serviceOrdersTable)
    .innerJoin(customersTable, eq(serviceOrdersTable.customer_id, customersTable.id))
    .where(eq(serviceOrdersTable.id, serviceOrderId))
    .execute();

    if (result.length === 0) {
      return false;
    }

    const { phone, customer_name } = result[0];
    
    // Format estimation message
    const message = `Hello ${customer_name},

Here's your service estimate:

ECONOMIC TIER: $${estimationData.economic_tier_price}
${estimationData.economic_description}

STANDARD TIER: $${estimationData.standard_tier_price}
${estimationData.standard_description}

PREMIUM TIER: $${estimationData.premium_tier_price}
${estimationData.premium_description}

Please let us know which option you'd prefer.`;

    const response = await sendWhatsAppMessage(phone, message);
    return response.success;
  } catch (error) {
    console.error('Failed to send estimate message:', error);
    return false;
  }
}

export async function sendInvoiceMessage(serviceOrderId: number, invoiceUrl: string): Promise<boolean> {
  try {
    // Get customer phone from service order
    const result = await db.select({
      phone: customersTable.phone,
      customer_name: customersTable.name
    })
    .from(serviceOrdersTable)
    .innerJoin(customersTable, eq(serviceOrdersTable.customer_id, customersTable.id))
    .where(eq(serviceOrdersTable.id, serviceOrderId))
    .execute();

    if (result.length === 0) {
      return false;
    }

    const { phone, customer_name } = result[0];
    
    // Format invoice message
    const message = `Hello ${customer_name},

Your service is complete! 

Invoice: ${invoiceUrl}

Thank you for choosing our service. Your vehicle is ready for pickup.

We provide a warranty on all work performed. Please contact us if you have any questions.`;

    const response = await sendWhatsAppMessage(phone, message);
    return response.success;
  } catch (error) {
    console.error('Failed to send invoice message:', error);
    return false;
  }
}

export async function sendThankYouMessage(input: SendThankYouMessageInput): Promise<WhatsappMessageResponse> {
  try {
    // Get the template
    const templateResult = await db.select()
      .from(whatsappTemplatesTable)
      .where(
        and(
          eq(whatsappTemplatesTable.name, input.template_name),
          eq(whatsappTemplatesTable.is_active, true)
        )
      )
      .execute();

    if (templateResult.length === 0) {
      return {
        success: false,
        message: 'Template not found or inactive',
        message_id: null
      };
    }

    // Get customer phone and name
    const customerResult = await db.select({
      phone: customersTable.phone,
      customer_name: customersTable.name
    })
    .from(customersTable)
    .where(eq(customersTable.id, input.customer_id))
    .execute();

    if (customerResult.length === 0) {
      return {
        success: false,
        message: 'Customer not found',
        message_id: null
      };
    }

    const { phone, customer_name } = customerResult[0];
    const template = templateResult[0];

    // Replace template variables
    let message = template.content;
    message = message.replace(/\{customer_name\}/g, customer_name);
    message = message.replace(/\{service_order_id\}/g, input.service_order_id.toString());

    const response = await sendWhatsAppMessage(phone, message);
    
    if (response.success) {
      return {
        success: true,
        message: 'Thank you message sent successfully',
        message_id: response.message_id || null
      };
    } else {
      return {
        success: false,
        message: 'Failed to send WhatsApp message',
        message_id: null
      };
    }
  } catch (error) {
    console.error('Failed to send thank you message:', error);
    return {
      success: false,
      message: 'Internal server error',
      message_id: null
    };
  }
}

export async function getWhatsAppTemplates(): Promise<string[]> {
  try {
    const templates = await db.select({
      name: whatsappTemplatesTable.name
    })
    .from(whatsappTemplatesTable)
    .where(eq(whatsappTemplatesTable.is_active, true))
    .execute();

    return templates.map(t => t.name);
  } catch (error) {
    console.error('Failed to get WhatsApp templates:', error);
    return [];
  }
}

export async function createWhatsAppTemplate(name: string, content: string): Promise<boolean> {
  try {
    // This is a simplified version - in practice, you'd need created_by_id
    // For now, using a default user ID of 1
    await db.insert(whatsappTemplatesTable)
      .values({
        name,
        type: 'THANK_YOU', // Default type
        content,
        created_by_id: 1
      })
      .execute();

    return true;
  } catch (error) {
    console.error('Failed to create WhatsApp template:', error);
    return false;
  }
}
