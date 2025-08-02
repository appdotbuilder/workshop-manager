
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, usersTable, vehiclesTable, serviceOrdersTable, whatsappTemplatesTable } from '../db/schema';
import { type SendThankYouMessageInput } from '../schema';
import { sendThankYouMessage } from '../handlers/send_thank_you_message';

describe('sendThankYouMessage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should send thank you message successfully', async () => {
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

    const user = userResult[0];

    // Create test customer with phone
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john@example.com'
      })
      .returning()
      .execute();

    const customer = customerResult[0];

    // Create test vehicle
    const vehicleResult = await db.insert(vehiclesTable)
      .values({
        customer_id: customer.id,
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        license_plate: 'ABC123'
      })
      .returning()
      .execute();

    const vehicle = vehicleResult[0];

    // Create test service order
    const serviceOrderResult = await db.insert(serviceOrdersTable)
      .values({
        order_number: 'SO-2024-001',
        customer_id: customer.id,
        vehicle_id: vehicle.id,
        service_types: ['GENERAL_SERVICE'],
        complaints: 'Regular maintenance',
        created_by_id: user.id
      })
      .returning()
      .execute();

    const serviceOrder = serviceOrderResult[0];

    // Create WhatsApp template
    await db.insert(whatsappTemplatesTable)
      .values({
        name: 'thank_you_basic',
        type: 'THANK_YOU',
        content: 'Thank you for choosing our service!',
        created_by_id: user.id
      })
      .execute();

    const input: SendThankYouMessageInput = {
      customer_id: customer.id,
      service_order_id: serviceOrder.id,
      template_name: 'thank_you_basic'
    };

    const result = await sendThankYouMessage(input);

    expect(result.success).toBe(true);
    expect(result.message).toContain('Thank you message sent successfully');
    expect(result.message).toContain('John Doe');
    expect(result.message).toContain('+1234567890');
    expect(result.message).toContain('SO-2024-001');
    expect(result.message).toContain('thank_you_basic');
    expect(result.message_id).toBeDefined();
    expect(result.message_id).toContain('whatsapp_');
  });

  it('should fail when customer not found', async () => {
    const input: SendThankYouMessageInput = {
      customer_id: 999,
      service_order_id: 1,
      template_name: 'thank_you_basic'
    };

    const result = await sendThankYouMessage(input);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Customer not found');
    expect(result.message_id).toBeNull();
  });

  it('should fail when service order not found', async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'John Doe',
        phone: '+1234567890'
      })
      .returning()
      .execute();

    const customer = customerResult[0];

    const input: SendThankYouMessageInput = {
      customer_id: customer.id,
      service_order_id: 999,
      template_name: 'thank_you_basic'
    };

    const result = await sendThankYouMessage(input);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Service order not found or does not belong to customer');
    expect(result.message_id).toBeNull();
  });

  it('should fail when service order belongs to different customer', async () => {
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

    const user = userResult[0];

    // Create two customers
    const customer1Result = await db.insert(customersTable)
      .values({
        name: 'Customer 1',
        phone: '+1111111111'
      })
      .returning()
      .execute();

    const customer2Result = await db.insert(customersTable)
      .values({
        name: 'Customer 2',
        phone: '+2222222222'
      })
      .returning()
      .execute();

    const customer1 = customer1Result[0];
    const customer2 = customer2Result[0];

    // Create vehicle for customer 1
    const vehicleResult = await db.insert(vehiclesTable)
      .values({
        customer_id: customer1.id,
        make: 'Honda',
        model: 'Civic',
        year: 2019,
        license_plate: 'XYZ789'
      })
      .returning()
      .execute();

    const vehicle = vehicleResult[0];

    // Create service order for customer 1
    const serviceOrderResult = await db.insert(serviceOrdersTable)
      .values({
        order_number: 'SO-2024-002',
        customer_id: customer1.id,
        vehicle_id: vehicle.id,
        service_types: ['BRAKE_SERVICE'],
        complaints: 'Brake issues',
        created_by_id: user.id
      })
      .returning()
      .execute();

    const serviceOrder = serviceOrderResult[0];

    // Try to send message for customer 2 using customer 1's service order
    const input: SendThankYouMessageInput = {
      customer_id: customer2.id,
      service_order_id: serviceOrder.id,
      template_name: 'thank_you_basic'
    };

    const result = await sendThankYouMessage(input);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Service order not found or does not belong to customer');
    expect(result.message_id).toBeNull();
  });

  it('should fail when template not found', async () => {
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

    const user = userResult[0];

    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Jane Doe',
        phone: '+1234567890'
      })
      .returning()
      .execute();

    const customer = customerResult[0];

    // Create test vehicle
    const vehicleResult = await db.insert(vehiclesTable)
      .values({
        customer_id: customer.id,
        make: 'Ford',
        model: 'Focus',
        year: 2021,
        license_plate: 'DEF456'
      })
      .returning()
      .execute();

    const vehicle = vehicleResult[0];

    // Create test service order
    const serviceOrderResult = await db.insert(serviceOrdersTable)
      .values({
        order_number: 'SO-2024-003',
        customer_id: customer.id,
        vehicle_id: vehicle.id,
        service_types: ['ENGINE_SERVICE'],
        complaints: 'Engine noise',
        created_by_id: user.id
      })
      .returning()
      .execute();

    const serviceOrder = serviceOrderResult[0];

    const input: SendThankYouMessageInput = {
      customer_id: customer.id,
      service_order_id: serviceOrder.id,
      template_name: 'nonexistent_template'
    };

    const result = await sendThankYouMessage(input);

    expect(result.success).toBe(false);
    expect(result.message).toBe("WhatsApp template 'nonexistent_template' not found or inactive");
    expect(result.message_id).toBeNull();
  });

  it('should fail when template is inactive', async () => {
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

    const user = userResult[0];

    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Bob Smith',
        phone: '+1234567890'
      })
      .returning()
      .execute();

    const customer = customerResult[0];

    // Create test vehicle
    const vehicleResult = await db.insert(vehiclesTable)
      .values({
        customer_id: customer.id,
        make: 'BMW',
        model: 'X3',
        year: 2022,
        license_plate: 'GHI789'
      })
      .returning()
      .execute();

    const vehicle = vehicleResult[0];

    // Create test service order
    const serviceOrderResult = await db.insert(serviceOrdersTable)
      .values({
        order_number: 'SO-2024-004',
        customer_id: customer.id,
        vehicle_id: vehicle.id,
        service_types: ['AC_SERVICE'],
        complaints: 'AC not working',
        created_by_id: user.id
      })
      .returning()
      .execute();

    const serviceOrder = serviceOrderResult[0];

    // Create inactive WhatsApp template
    await db.insert(whatsappTemplatesTable)
      .values({
        name: 'inactive_template',
        type: 'THANK_YOU',
        content: 'This template is inactive',
        created_by_id: user.id,
        is_active: false
      })
      .execute();

    const input: SendThankYouMessageInput = {
      customer_id: customer.id,
      service_order_id: serviceOrder.id,
      template_name: 'inactive_template'
    };

    const result = await sendThankYouMessage(input);

    expect(result.success).toBe(false);
    expect(result.message).toBe("WhatsApp template 'inactive_template' not found or inactive");
    expect(result.message_id).toBeNull();
  });

  it('should fail when customer has no phone number', async () => {
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

    const user = userResult[0];

    // Create test customer without phone
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Alice Brown',
        phone: '' // Empty phone number
      })
      .returning()
      .execute();

    const customer = customerResult[0];

    // Create test vehicle
    const vehicleResult = await db.insert(vehiclesTable)
      .values({
        customer_id: customer.id,
        make: 'Mercedes',
        model: 'C-Class',
        year: 2023,
        license_plate: 'JKL012'
      })
      .returning()
      .execute();

    const vehicle = vehicleResult[0];

    // Create test service order
    const serviceOrderResult = await db.insert(serviceOrdersTable)
      .values({
        order_number: 'SO-2024-005',
        customer_id: customer.id,
        vehicle_id: vehicle.id,
        service_types: ['BODY_WORK'],
        complaints: 'Paint scratch',
        created_by_id: user.id
      })
      .returning()
      .execute();

    const serviceOrder = serviceOrderResult[0];

    // Create WhatsApp template
    await db.insert(whatsappTemplatesTable)
      .values({
        name: 'test_template',
        type: 'THANK_YOU',
        content: 'Thank you message',
        created_by_id: user.id
      })
      .execute();

    const input: SendThankYouMessageInput = {
      customer_id: customer.id,
      service_order_id: serviceOrder.id,
      template_name: 'test_template'
    };

    const result = await sendThankYouMessage(input);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Customer phone number not available');
    expect(result.message_id).toBeNull();
  });
});
