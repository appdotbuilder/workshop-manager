
import { db } from '../db';
import { whatsappTemplatesTable } from '../db/schema';
import { type WhatsappTemplate } from '../schema';
import { desc } from 'drizzle-orm';

export const getWhatsappTemplates = async (): Promise<WhatsappTemplate[]> => {
  try {
    const results = await db.select()
      .from(whatsappTemplatesTable)
      .orderBy(desc(whatsappTemplatesTable.created_at))
      .execute();

    return results.map(template => ({
      ...template,
      created_at: new Date(template.created_at),
      updated_at: template.updated_at ? new Date(template.updated_at) : null
    }));
  } catch (error) {
    console.error('Failed to fetch WhatsApp templates:', error);
    throw error;
  }
};
