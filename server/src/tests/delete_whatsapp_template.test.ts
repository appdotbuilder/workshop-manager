
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { whatsappTemplatesTable, usersTable } from '../db/schema';
import { deleteWhatsappTemplate } from '../handlers/delete_whatsapp_template';
import { eq } from 'drizzle-orm';

describe('deleteWhatsappTemplate', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a WhatsApp template', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test User',
        role: 'ADMIN'
      })
      .returning()
      .execute();

    // Create a WhatsApp template
    const templateResult = await db.insert(whatsappTemplatesTable)
      .values({
        name: 'Test Template',
        type: 'THANK_YOU',
        content: 'Thank you for your service!',
        created_by_id: userResult[0].id
      })
      .returning()
      .execute();

    const templateId = templateResult[0].id;

    // Delete the template
    const result = await deleteWhatsappTemplate(templateId);

    // Verify deletion was successful
    expect(result.success).toBe(true);

    // Verify template no longer exists in database
    const templates = await db.select()
      .from(whatsappTemplatesTable)
      .where(eq(whatsappTemplatesTable.id, templateId))
      .execute();

    expect(templates).toHaveLength(0);
  });

  it('should throw error when template not found', async () => {
    const nonExistentId = 99999;

    // Attempt to delete non-existent template
    await expect(deleteWhatsappTemplate(nonExistentId))
      .rejects
      .toThrow(/template not found/i);
  });

  it('should not affect other templates when deleting one', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test User',
        role: 'ADMIN'
      })
      .returning()
      .execute();

    // Create two templates
    const template1Result = await db.insert(whatsappTemplatesTable)
      .values({
        name: 'Template 1',
        type: 'THANK_YOU',
        content: 'Thank you message 1',
        created_by_id: userResult[0].id
      })
      .returning()
      .execute();

    const template2Result = await db.insert(whatsappTemplatesTable)
      .values({
        name: 'Template 2',
        type: 'REMINDER',
        content: 'Reminder message 2',
        created_by_id: userResult[0].id
      })
      .returning()
      .execute();

    // Delete first template
    const result = await deleteWhatsappTemplate(template1Result[0].id);
    expect(result.success).toBe(true);

    // Verify first template is deleted
    const deletedTemplate = await db.select()
      .from(whatsappTemplatesTable)
      .where(eq(whatsappTemplatesTable.id, template1Result[0].id))
      .execute();
    expect(deletedTemplate).toHaveLength(0);

    // Verify second template still exists
    const remainingTemplate = await db.select()
      .from(whatsappTemplatesTable)
      .where(eq(whatsappTemplatesTable.id, template2Result[0].id))
      .execute();
    expect(remainingTemplate).toHaveLength(1);
    expect(remainingTemplate[0].name).toEqual('Template 2');
  });
});
