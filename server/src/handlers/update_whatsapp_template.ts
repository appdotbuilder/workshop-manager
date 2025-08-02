
import { db } from '../db';
import { whatsappTemplatesTable } from '../db/schema';
import { type UpdateWhatsappTemplateInput, type WhatsappTemplate } from '../schema';
import { eq } from 'drizzle-orm';

export const updateWhatsappTemplate = async (input: UpdateWhatsappTemplateInput): Promise<WhatsappTemplate> => {
  try {
    // Build update object with only provided fields
    const updateData: any = {};
    
    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    
    if (input.type !== undefined) {
      updateData.type = input.type;
    }
    
    if (input.content !== undefined) {
      updateData.content = input.content;
    }
    
    if (input.is_active !== undefined) {
      updateData.is_active = input.is_active;
    }
    
    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    // Update the template
    const result = await db.update(whatsappTemplatesTable)
      .set(updateData)
      .where(eq(whatsappTemplatesTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`WhatsApp template with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('WhatsApp template update failed:', error);
    throw error;
  }
};
