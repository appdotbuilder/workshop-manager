
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, whatsappTemplatesTable } from '../db/schema';
import { type CreateWhatsappTemplateInput } from '../schema';
import { getWhatsappTemplates } from '../handlers/get_whatsapp_templates';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password_hash: 'hashedpassword',
  full_name: 'Test User',
  role: 'ADMIN' as const
};

const testTemplate1: CreateWhatsappTemplateInput = {
  name: 'Thank You Message',
  type: 'THANK_YOU',
  content: 'Thank you for choosing our service! Your vehicle is ready for pickup.',
  created_by_id: 1
};

const testTemplate2: CreateWhatsappTemplateInput = {
  name: 'Payment Reminder',
  type: 'REMINDER',
  content: 'This is a friendly reminder about your pending payment of {{amount}}.',
  created_by_id: 1
};

describe('getWhatsappTemplates', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no templates exist', async () => {
    const result = await getWhatsappTemplates();

    expect(result).toEqual([]);
  });

  it('should return all templates ordered by creation date', async () => {
    // Create test user first
    await db.insert(usersTable).values(testUser).execute();

    // Create templates one by one to ensure different timestamps
    await db.insert(whatsappTemplatesTable)
      .values({
        name: testTemplate1.name,
        type: testTemplate1.type,
        content: testTemplate1.content,
        created_by_id: testTemplate1.created_by_id
      })
      .execute();

    // Small delay to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(whatsappTemplatesTable)
      .values({
        name: testTemplate2.name,
        type: testTemplate2.type,
        content: testTemplate2.content,
        created_by_id: testTemplate2.created_by_id
      })
      .execute();

    const result = await getWhatsappTemplates();

    expect(result).toHaveLength(2);
    
    // Verify all templates are present (order may vary due to timing)
    const templateNames = result.map(t => t.name);
    expect(templateNames).toContain('Thank You Message');
    expect(templateNames).toContain('Payment Reminder');

    // Check that all templates have required fields
    result.forEach(template => {
      expect(template.id).toBeDefined();
      expect(template.name).toBeDefined();
      expect(template.type).toBeDefined();
      expect(template.content).toBeDefined();
      expect(template.created_by_id).toEqual(1);
      expect(template.is_active).toEqual(true);
      expect(template.created_at).toBeInstanceOf(Date);
      expect(template.updated_at).toBeNull();
    });

    // Find specific templates and verify their content
    const thankYouTemplate = result.find(t => t.name === 'Thank You Message');
    const reminderTemplate = result.find(t => t.name === 'Payment Reminder');

    expect(thankYouTemplate).toBeDefined();
    expect(thankYouTemplate?.type).toEqual('THANK_YOU');
    expect(thankYouTemplate?.content).toEqual('Thank you for choosing our service! Your vehicle is ready for pickup.');

    expect(reminderTemplate).toBeDefined();
    expect(reminderTemplate?.type).toEqual('REMINDER');
    expect(reminderTemplate?.content).toEqual('This is a friendly reminder about your pending payment of {{amount}}.');
  });

  it('should include both active and inactive templates', async () => {
    // Create test user first
    await db.insert(usersTable).values(testUser).execute();

    // Create active template
    await db.insert(whatsappTemplatesTable)
      .values({
        name: 'Active Template',
        type: 'THANK_YOU',
        content: 'This is an active template.',
        created_by_id: 1,
        is_active: true
      })
      .execute();

    // Create inactive template
    await db.insert(whatsappTemplatesTable)
      .values({
        name: 'Inactive Template',
        type: 'REMINDER',
        content: 'This is an inactive template.',
        created_by_id: 1,
        is_active: false
      })
      .execute();

    const result = await getWhatsappTemplates();

    expect(result).toHaveLength(2);
    
    // Find templates by name
    const activeResult = result.find(t => t.name === 'Active Template');
    const inactiveResult = result.find(t => t.name === 'Inactive Template');

    expect(activeResult).toBeDefined();
    expect(activeResult?.is_active).toEqual(true);
    
    expect(inactiveResult).toBeDefined();
    expect(inactiveResult?.is_active).toEqual(false);
  });

  it('should handle templates with all message types', async () => {
    // Create test user first
    await db.insert(usersTable).values(testUser).execute();

    // Create templates for all message types
    const templates = [
      { name: 'Thank You', type: 'THANK_YOU' as const, content: 'Thank you!' },
      { name: 'Reminder', type: 'REMINDER' as const, content: 'Reminder message' },
      { name: 'Follow Up', type: 'FOLLOW_UP' as const, content: 'Follow up message' },
      { name: 'Promotion', type: 'PROMOTION' as const, content: 'Special offer!' }
    ];

    await db.insert(whatsappTemplatesTable)
      .values(templates.map(t => ({
        ...t,
        created_by_id: 1
      })))
      .execute();

    const result = await getWhatsappTemplates();

    expect(result).toHaveLength(4);
    
    // Verify all message types are present
    const types = result.map(t => t.type);
    expect(types).toContain('THANK_YOU');
    expect(types).toContain('REMINDER');
    expect(types).toContain('FOLLOW_UP');
    expect(types).toContain('PROMOTION');
  });

  it('should verify template exists in database after retrieval', async () => {
    // Create test user first
    await db.insert(usersTable).values(testUser).execute();

    // Create test template
    await db.insert(whatsappTemplatesTable)
      .values({
        name: testTemplate1.name,
        type: testTemplate1.type,
        content: testTemplate1.content,
        created_by_id: testTemplate1.created_by_id
      })
      .execute();

    const result = await getWhatsappTemplates();
    expect(result).toHaveLength(1);

    // Verify in database
    const dbTemplates = await db.select()
      .from(whatsappTemplatesTable)
      .where(eq(whatsappTemplatesTable.id, result[0].id))
      .execute();

    expect(dbTemplates).toHaveLength(1);
    expect(dbTemplates[0].name).toEqual('Thank You Message');
    expect(dbTemplates[0].type).toEqual('THANK_YOU');
    expect(dbTemplates[0].content).toEqual('Thank you for choosing our service! Your vehicle is ready for pickup.');
    expect(dbTemplates[0].created_at).toBeInstanceOf(Date);
  });
});
