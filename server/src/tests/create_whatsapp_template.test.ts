
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { createDB, resetDB } from '../helpers';
import { db } from '../db';
import { usersTable, whatsappTemplatesTable } from '../db/schema';
import { type CreateWhatsappTemplateInput } from '../schema';
import { createWhatsappTemplate } from '../handlers/create_whatsapp_template';
import { eq } from 'drizzle-orm';

describe('createWhatsappTemplate', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;

  beforeEach(async () => {
    // Create test user first
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
    
    testUserId = userResult[0].id;
  });

  const testInput: CreateWhatsappTemplateInput = {
    name: 'Thank You Template',
    type: 'THANK_YOU',
    content: 'Thank you for choosing our service! Your vehicle has been serviced successfully.',
    created_by_id: 1 // Will be overridden in tests
  };

  it('should create a WhatsApp template', async () => {
    const input = { ...testInput, created_by_id: testUserId };
    const result = await createWhatsappTemplate(input);

    // Basic field validation
    expect(result.name).toEqual('Thank You Template');
    expect(result.type).toEqual('THANK_YOU');
    expect(result.content).toEqual(testInput.content);
    expect(result.created_by_id).toEqual(testUserId);
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeNull();
  });

  it('should save template to database', async () => {
    const input = { ...testInput, created_by_id: testUserId };
    const result = await createWhatsappTemplate(input);

    // Query using proper drizzle syntax
    const templates = await db.select()
      .from(whatsappTemplatesTable)
      .where(eq(whatsappTemplatesTable.id, result.id))
      .execute();

    expect(templates).toHaveLength(1);
    expect(templates[0].name).toEqual('Thank You Template');
    expect(templates[0].type).toEqual('THANK_YOU');
    expect(templates[0].content).toEqual(testInput.content);
    expect(templates[0].created_by_id).toEqual(testUserId);
    expect(templates[0].is_active).toEqual(true);
    expect(templates[0].created_at).toBeInstanceOf(Date);
  });

  it('should create different template types', async () => {
    const reminderInput: CreateWhatsappTemplateInput = {
      name: 'Service Reminder',
      type: 'REMINDER',
      content: 'This is a reminder that your vehicle is due for service.',
      created_by_id: testUserId
    };

    const result = await createWhatsappTemplate(reminderInput);

    expect(result.name).toEqual('Service Reminder');
    expect(result.type).toEqual('REMINDER');
    expect(result.content).toEqual(reminderInput.content);
  });

  it('should handle foreign key constraint with valid user', async () => {
    const input = { ...testInput, created_by_id: testUserId };
    
    const result = await createWhatsappTemplate(input);
    
    expect(result.created_by_id).toEqual(testUserId);
    
    // Verify the relationship works
    const templates = await db.select()
      .from(whatsappTemplatesTable)
      .where(eq(whatsappTemplatesTable.created_by_id, testUserId))
      .execute();
    
    expect(templates).toHaveLength(1);
    expect(templates[0].id).toEqual(result.id);
  });
});
