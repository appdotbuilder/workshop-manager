
import { db } from '../db';
import { whatsappTemplatesTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteWhatsappTemplate = async (id: number): Promise<{ success: boolean }> => {
  try {
    // Delete the WhatsApp template
    const result = await db.delete(whatsappTemplatesTable)
      .where(eq(whatsappTemplatesTable.id, id))
      .returning()
      .execute();

    // Check if template was found and deleted
    if (result.length === 0) {
      throw new Error('WhatsApp template not found');
    }

    return { success: true };
  } catch (error) {
    console.error('WhatsApp template deletion failed:', error);
    throw error;
  }
};
