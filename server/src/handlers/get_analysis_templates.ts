
import { db } from '../db';
import { analysisTemplatesTable } from '../db/schema';
import { type AnalysisTemplate } from '../schema';
import { desc } from 'drizzle-orm';

export const getAnalysisTemplates = async (): Promise<AnalysisTemplate[]> => {
  try {
    const results = await db.select()
      .from(analysisTemplatesTable)
      .orderBy(desc(analysisTemplatesTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch analysis templates:', error);
    throw error;
  }
};
