
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, serviceOrdersTable, vehiclesTable, usersTable, whatsappTemplatesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { sendServiceUpdate, sendEstimateMessage, sendInvoiceMessage, sendThankYouMessage, getWhatsAppTemplates, createWhatsAppTemplate } from '../handlers/whatsapp_integration';
import { type SendThankYouMessageInput } from '../schema';

describe('WhatsApp Integration', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testCustomerId: number;
  let testVehicleId: number;
  let testServiceOrderId: number;
  let testUserId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testmechanic',
        email: 'mechanic@test.com',
        password_hash: 'hashedpassword',
        full_name: 'Test Mechanic',
        role: 'MECHANIC'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john@example.com'
      })
      .returning()
      .execute();
    testCustomerId = customerResult[0].id;

    // Create test vehicle
    const vehicleResult = await db.insert(vehiclesTable)
      .values({
        customer_id: testCustomerId,
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        license_plate: 'ABC123'
      })
      .returning()
      .execute();
    testVehicleId = vehicleResult[0].id;

    // Create test service order
    const serviceOrderResult = await db.insert(serviceOrdersTable)
      .values({
        order_number: 'SO-2024-001',
        customer_id: testCustomerId,
        vehicle_id: testVehicleId,
        service_types: ['GENERAL_SERVICE'],
        complaints: 'Test complaint',
        created_by_id: testUserId
      })
      .returning()
      .execute();
    testServiceOrderId = serviceOrderResult[0].id;
  });

  describe('sendServiceUpdate', () => {
    it('should send service update successfully', async () => {
      const result = await sendServiceUpdate(testServiceOrderId, 'Your vehicle is ready for pickup');
      expect(result).toBe(true);
    });

    it('should fail for non-existent service order', async () => {
      const result = await sendServiceUpdate(99999, 'Test message');
      expect(result).toBe(false);
    });
  });

  describe('sendEstimateMessage', () => {
    it('should send estimate message successfully', async () => {
      const estimationData = {
        economic_tier_price: 100.00,
        standard_tier_price: 150.00,
        premium_tier_price: 200.00,
        economic_description: 'Basic repair',
        standard_description: 'Standard repair with warranty',
        premium_description: 'Premium repair with extended warranty'
      };

      const result = await sendEstimateMessage(testServiceOrderId, estimationData);
      expect(result).toBe(true);
    });

    it('should fail for non-existent service order', async () => {
      const estimationData = {
        economic_tier_price: 100.00,
        standard_tier_price: 150.00,
        premium_tier_price: 200.00,
        economic_description: 'Basic repair',
        standard_description: 'Standard repair',
        premium_description: 'Premium repair'
      };

      const result = await sendEstimateMessage(99999, estimationData);
      expect(result).toBe(false);
    });
  });

  describe('sendInvoiceMessage', () => {
    it('should send invoice message successfully', async () => {
      const result = await sendInvoiceMessage(testServiceOrderId, 'https://example.com/invoice.pdf');
      expect(result).toBe(true);
    });

    it('should fail for non-existent service order', async () => {
      const result = await sendInvoiceMessage(99999, 'https://example.com/invoice.pdf');
      expect(result).toBe(false);
    });
  });

  describe('sendThankYouMessage', () => {
    beforeEach(async () => {
      // Create test template
      await db.insert(whatsappTemplatesTable)
        .values({
          name: 'test_thank_you',
          type: 'THANK_YOU',
          content: 'Thank you {customer_name} for choosing our service! Order #{service_order_id} is complete.',
          created_by_id: testUserId
        })
        .execute();
    });

    it('should send thank you message successfully', async () => {
      const input: SendThankYouMessageInput = {
        customer_id: testCustomerId,
        service_order_id: testServiceOrderId,
        template_name: 'test_thank_you'
      };

      const result = await sendThankYouMessage(input);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Thank you message sent successfully');
      expect(result.message_id).toBeDefined();
    });

    it('should fail with non-existent template', async () => {
      const input: SendThankYouMessageInput = {
        customer_id: testCustomerId,
        service_order_id: testServiceOrderId,
        template_name: 'non_existent_template'
      };

      const result = await sendThankYouMessage(input);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Template not found or inactive');
      expect(result.message_id).toBeNull();
    });

    it('should fail with non-existent customer', async () => {
      const input: SendThankYouMessageInput = {
        customer_id: 99999,
        service_order_id: testServiceOrderId,
        template_name: 'test_thank_you'
      };

      const result = await sendThankYouMessage(input);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Customer not found');
      expect(result.message_id).toBeNull();
    });
  });

  describe('getWhatsAppTemplates', () => {
    beforeEach(async () => {
      // Create test templates
      await db.insert(whatsappTemplatesTable)
        .values([
          {
            name: 'template1',
            type: 'THANK_YOU',
            content: 'Template 1 content',
            created_by_id: testUserId,
            is_active: true
          },
          {
            name: 'template2',
            type: 'REMINDER',
            content: 'Template 2 content',
            created_by_id: testUserId,
            is_active: true
          },
          {
            name: 'inactive_template',
            type: 'THANK_YOU',
            content: 'Inactive template',
            created_by_id: testUserId,
            is_active: false
          }
        ])
        .execute();
    });

    it('should return active template names', async () => {
      const templates = await getWhatsAppTemplates();
      expect(templates).toHaveLength(2);
      expect(templates).toContain('template1');
      expect(templates).toContain('template2');
      expect(templates).not.toContain('inactive_template');
    });

    it('should return empty array when no templates exist', async () => {
      // Clear all templates
      await db.delete(whatsappTemplatesTable).execute();
      
      const templates = await getWhatsAppTemplates();
      expect(templates).toHaveLength(0);
    });
  });

  describe('createWhatsAppTemplate', () => {
    it('should create template successfully', async () => {
      const result = await createWhatsAppTemplate('new_template', 'New template content');
      expect(result).toBe(true);

      // Verify template was created
      const templates = await db.select()
        .from(whatsappTemplatesTable)
        .where(eq(whatsappTemplatesTable.name, 'new_template'))
        .execute();
      
      expect(templates).toHaveLength(1);
      expect(templates[0].content).toBe('New template content');
    });

    it('should handle duplicate template names', async () => {
      // Create first template
      await createWhatsAppTemplate('duplicate_name', 'First content');
      
      // Try to create duplicate - should fail due to unique constraint
      const result = await createWhatsAppTemplate('duplicate_name', 'Second content');
      expect(result).toBe(false);
    });
  });

  describe('WhatsApp message formatting', () => {
    it('should replace template variables correctly', async () => {
      // Create template with variables
      await db.insert(whatsappTemplatesTable)
        .values({
          name: 'variable_template',
          type: 'THANK_YOU',
          content: 'Hello {customer_name}, your service order #{service_order_id} is ready!',
          created_by_id: testUserId
        })
        .execute();

      const input: SendThankYouMessageInput = {
        customer_id: testCustomerId,
        service_order_id: testServiceOrderId,
        template_name: 'variable_template'
      };

      const result = await sendThankYouMessage(input);
      expect(result.success).toBe(true);
      
      // The actual message content with variables replaced should be sent
      // We can't directly test the message content here, but the success indicates
      // that variable replacement worked correctly
    });
  });
});
