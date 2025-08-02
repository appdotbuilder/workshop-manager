
import { db } from '../db';
import { whatsappTemplatesTable } from '../db/schema';
import { type CreateWhatsappTemplateInput, type WhatsappTemplate } from '../schema';

export const createWhatsappTemplate = async (input: CreateWhatsappTemplateInput): Promise<WhatsappTemplate> => {
  try {
    // Insert WhatsApp template record
    const result = await db.insert(whatsappTemplatesTable)
      .values({
        name: input.name,
        type: input.type,
        content: input.content,
        created_by_id: input.created_by_id
      })
      .returning()
      .execute();

    const template = result[0];
    return template;
  } catch (error) {
    console.error('WhatsApp template creation failed:', error);
    throw error;
  }
};
