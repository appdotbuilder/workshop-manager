
import { db } from '../db';
import { technicalAnalysisTable, serviceOrdersTable } from '../db/schema';
import { type CreateTechnicalAnalysisInput, type TechnicalAnalysis } from '../schema';
import { eq } from 'drizzle-orm';

export const createTechnicalAnalysis = async (input: CreateTechnicalAnalysisInput): Promise<TechnicalAnalysis> => {
  try {
    // Verify service order exists
    const serviceOrder = await db.select()
      .from(serviceOrdersTable)
      .where(eq(serviceOrdersTable.id, input.service_order_id))
      .execute();

    if (serviceOrder.length === 0) {
      throw new Error('Service order not found');
    }

    // Insert technical analysis record
    const result = await db.insert(technicalAnalysisTable)
      .values({
        service_order_id: input.service_order_id,
        problem_description: input.problem_description,
        root_cause_analysis: input.root_cause_analysis,
        recommended_actions: input.recommended_actions,
        visual_evidence_urls: input.visual_evidence_urls || [],
        analyzed_by_id: input.analyzed_by_id
      })
      .returning()
      .execute();

    const technicalAnalysis = result[0];
    
    return {
      ...technicalAnalysis,
      analysis_date: new Date(technicalAnalysis.analysis_date),
      visual_evidence_urls: Array.isArray(technicalAnalysis.visual_evidence_urls) 
        ? technicalAnalysis.visual_evidence_urls 
        : []
    };
  } catch (error) {
    console.error('Technical analysis creation failed:', error);
    throw error;
  }
};
