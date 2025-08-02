
import { db } from '../db';
import { estimationLibraryTable } from '../db/schema';
import { type CreateEstimationLibraryInput, type EstimationLibrary } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createEstimationLibraryItem = async (input: CreateEstimationLibraryInput): Promise<EstimationLibrary> => {
  try {
    const result = await db.insert(estimationLibraryTable)
      .values({
        service_type: input.service_type,
        service_name: input.service_name,
        economic_price: input.economic_price.toString(),
        standard_price: input.standard_price.toString(),
        premium_price: input.premium_price.toString(),
        estimated_labor_hours: input.estimated_labor_hours.toString(),
        description: input.description,
        created_by_id: input.created_by_id
      })
      .returning()
      .execute();

    const item = result[0];
    return {
      ...item,
      economic_price: parseFloat(item.economic_price),
      standard_price: parseFloat(item.standard_price),
      premium_price: parseFloat(item.premium_price),
      estimated_labor_hours: parseFloat(item.estimated_labor_hours)
    };
  } catch (error) {
    console.error('Estimation library item creation failed:', error);
    throw error;
  }
};

export const getEstimationLibrary = async (): Promise<EstimationLibrary[]> => {
  try {
    const results = await db.select()
      .from(estimationLibraryTable)
      .where(eq(estimationLibraryTable.is_active, true))
      .execute();

    return results.map(item => ({
      ...item,
      economic_price: parseFloat(item.economic_price),
      standard_price: parseFloat(item.standard_price),
      premium_price: parseFloat(item.premium_price),
      estimated_labor_hours: parseFloat(item.estimated_labor_hours)
    }));
  } catch (error) {
    console.error('Failed to fetch estimation library:', error);
    throw error;
  }
};

export const getEstimationLibraryByServiceType = async (serviceType: string): Promise<EstimationLibrary[]> => {
  try {
    const results = await db.select()
      .from(estimationLibraryTable)
      .where(
        and(
          eq(estimationLibraryTable.service_type, serviceType as any),
          eq(estimationLibraryTable.is_active, true)
        )
      )
      .execute();

    return results.map(item => ({
      ...item,
      economic_price: parseFloat(item.economic_price),
      standard_price: parseFloat(item.standard_price),
      premium_price: parseFloat(item.premium_price),
      estimated_labor_hours: parseFloat(item.estimated_labor_hours)
    }));
  } catch (error) {
    console.error('Failed to fetch estimation library by service type:', error);
    throw error;
  }
};

export const updateEstimationLibraryItem = async (id: number, input: Partial<CreateEstimationLibraryInput>): Promise<EstimationLibrary> => {
  try {
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.service_type !== undefined) updateData.service_type = input.service_type;
    if (input.service_name !== undefined) updateData.service_name = input.service_name;
    if (input.economic_price !== undefined) updateData.economic_price = input.economic_price.toString();
    if (input.standard_price !== undefined) updateData.standard_price = input.standard_price.toString();
    if (input.premium_price !== undefined) updateData.premium_price = input.premium_price.toString();
    if (input.estimated_labor_hours !== undefined) updateData.estimated_labor_hours = input.estimated_labor_hours.toString();
    if (input.description !== undefined) updateData.description = input.description;

    const result = await db.update(estimationLibraryTable)
      .set(updateData)
      .where(eq(estimationLibraryTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Estimation library item not found');
    }

    const item = result[0];
    return {
      ...item,
      economic_price: parseFloat(item.economic_price),
      standard_price: parseFloat(item.standard_price),
      premium_price: parseFloat(item.premium_price),
      estimated_labor_hours: parseFloat(item.estimated_labor_hours)
    };
  } catch (error) {
    console.error('Estimation library item update failed:', error);
    throw error;
  }
};

export const deleteEstimationLibraryItem = async (id: number): Promise<boolean> => {
  try {
    const result = await db.update(estimationLibraryTable)
      .set({ 
        is_active: false,
        updated_at: new Date()
      })
      .where(eq(estimationLibraryTable.id, id))
      .returning()
      .execute();

    return result.length > 0;
  } catch (error) {
    console.error('Estimation library item deletion failed:', error);
    throw error;
  }
};
