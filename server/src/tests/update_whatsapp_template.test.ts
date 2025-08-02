
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, whatsappTemplatesTable } from '../db/schema';
import { type UpdateWhatsappTemplateInput } from '../schema';
import { updateWhatsappTemplate } from '../handlers/update_whatsapp_template';
import { eq } from 'drizzle-orm';

describe('updateWhatsappTemplate', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update a WhatsApp template', async () => {
    // Create test user
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

    const userId = userResult[0].id;

    // Create test template
    const templateResult = await db.insert(whatsappTemplatesTable)
      .values({
        name: 'Original Template',
        type: 'THANK_YOU',
        content: 'Original content',
        created_by_id: userId
      })
      .returning()
      .execute();

    const templateId = templateResult[0].id;

    // Update input
    const updateInput: UpdateWhatsappTemplateInput = {
      id: templateId,
      name: 'Updated Template',
      content: 'Updated content',
      is_active: false
    };

    const result = await updateWhatsappTemplate(updateInput);

    // Verify updated fields
    expect(result.id).toBe(templateId);
    expect(result.name).toBe('Updated Template');
    expect(result.type).toBe('THANK_YOU'); // Unchanged
    expect(result.content).toBe('Updated content');
    expect(result.is_active).toBe(false);
    expect(result.created_by_id).toBe(userId); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update only provided fields', async () => {
    // Create test user
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

    const userId = userResult[0].id;

    // Create test template
    const templateResult = await db.insert(whatsappTemplatesTable)
      .values({
        name: 'Original Template',
        type: 'REMINDER',
        content: 'Original content',
        created_by_id: userId,
        is_active: true
      })
      .returning()
      .execute();

    const templateId = templateResult[0].id;

    // Update only name
    const updateInput: UpdateWhatsappTemplateInput = {
      id: templateId,
      name: 'Only Name Updated'
    };

    const result = await updateWhatsappTemplate(updateInput);

    // Verify only name was updated
    expect(result.name).toBe('Only Name Updated');
    expect(result.type).toBe('REMINDER'); // Unchanged
    expect(result.content).toBe('Original content'); // Unchanged
    expect(result.is_active).toBe(true); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updates to database', async () => {
    // Create test user
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

    const userId = userResult[0].id;

    // Create test template
    const templateResult = await db.insert(whatsappTemplatesTable)
      .values({
        name: 'Original Template',
        type: 'FOLLOW_UP',
        content: 'Original content',
        created_by_id: userId
      })
      .returning()
      .execute();

    const templateId = templateResult[0].id;

    // Update template
    const updateInput: UpdateWhatsappTemplateInput = {
      id: templateId,
      type: 'PROMOTION',
      content: 'New promotional content'
    };

    await updateWhatsappTemplate(updateInput);

    // Verify in database
    const templates = await db.select()
      .from(whatsappTemplatesTable)
      .where(eq(whatsappTemplatesTable.id, templateId))
      .execute();

    expect(templates).toHaveLength(1);
    expect(templates[0].name).toBe('Original Template'); // Unchanged
    expect(templates[0].type).toBe('PROMOTION'); // Updated
    expect(templates[0].content).toBe('New promotional content'); // Updated
    expect(templates[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when template not found', async () => {
    const updateInput: UpdateWhatsappTemplateInput = {
      id: 99999,
      name: 'Non-existent Template'
    };

    await expect(updateWhatsappTemplate(updateInput))
      .rejects.toThrow(/template with id 99999 not found/i);
  });

  it('should update type correctly', async () => {
    // Create test user
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

    const userId = userResult[0].id;

    // Create test template
    const templateResult = await db.insert(whatsappTemplatesTable)
      .values({
        name: 'Test Template',
        type: 'THANK_YOU',
        content: 'Test content',
        created_by_id: userId
      })
      .returning()
      .execute();

    const templateId = templateResult[0].id;

    // Update type
    const updateInput: UpdateWhatsappTemplateInput = {
      id: templateId,
      type: 'REMINDER'
    };

    const result = await updateWhatsappTemplate(updateInput);

    expect(result.type).toBe('REMINDER');
    expect(result.name).toBe('Test Template'); // Unchanged
    expect(result.content).toBe('Test content'); // Unchanged
  });
});
