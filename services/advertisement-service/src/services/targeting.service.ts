import { db } from '../database/connection';
import {
    TargetingCriteria,
    CreateTargetingRequest,
    TargetingType,
    TargetingOperator
} from '../types/advertisement.types';

export class TargetingService {
    async createTargetingCriteria(targetingData: CreateTargetingRequest): Promise<TargetingCriteria> {
        const query = `
      INSERT INTO targeting_criteria (ad_group_id, criteria_type, criteria_value, operator)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

        const values = [
            targetingData.ad_group_id,
            targetingData.criteria_type,
            targetingData.criteria_value,
            targetingData.operator || 'equals'
        ];

        const result = await db.query(query, values);
        return result.rows[0];
    }

    async getTargetingCriteriaByAdGroup(adGroupId: number): Promise<TargetingCriteria[]> {
        const query = `
      SELECT * FROM targeting_criteria 
      WHERE ad_group_id = $1 
      ORDER BY criteria_type, created_at
    `;

        const result = await db.query(query, [adGroupId]);
        return result.rows;
    }

    async updateTargetingCriteria(
        id: number,
        updateData: { criteria_value?: string; operator?: TargetingOperator }
    ): Promise<TargetingCriteria | null> {
        const setClauses: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        Object.entries(updateData).forEach(([key, value]) => {
            if (value !== undefined) {
                setClauses.push(`${key} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        });

        if (setClauses.length === 0) {
            return this.getTargetingCriteriaById(id);
        }

        values.push(id);
        const query = `
      UPDATE targeting_criteria 
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

        const result = await db.query(query, values);
        return result.rows[0] || null;
    }

    async deleteTargetingCriteria(id: number): Promise<boolean> {
        const query = 'DELETE FROM targeting_criteria WHERE id = $1';
        const result = await db.query(query, [id]);
        return result.rowCount > 0;
    }

    async getTargetingCriteriaById(id: number): Promise<TargetingCriteria | null> {
        const query = 'SELECT * FROM targeting_criteria WHERE id = $1';
        const result = await db.query(query, [id]);
        return result.rows[0] || null;
    }

    async bulkCreateTargetingCriteria(
        adGroupId: number,
        criteriaList: Omit<CreateTargetingRequest, 'ad_group_id'>[]
    ): Promise<TargetingCriteria[]> {
        if (criteriaList.length === 0) {
            return [];
        }

        const values: any[] = [];
        const placeholders: string[] = [];

        criteriaList.forEach((criteria, index) => {
            const baseIndex = index * 4;
            placeholders.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4})`);
            values.push(
                adGroupId,
                criteria.criteria_type,
                criteria.criteria_value,
                criteria.operator || 'equals'
            );
        });

        const query = `
      INSERT INTO targeting_criteria (ad_group_id, criteria_type, criteria_value, operator)
      VALUES ${placeholders.join(', ')}
      RETURNING *
    `;

        const result = await db.query(query, values);
        return result.rows;
    }

    async deleteTargetingCriteriaByAdGroup(adGroupId: number): Promise<boolean> {
        const query = 'DELETE FROM targeting_criteria WHERE ad_group_id = $1';
        const result = await db.query(query, [adGroupId]);
        return result.rowCount > 0;
    }

    async getTargetingCriteriaByCampaign(campaignId: number): Promise<TargetingCriteria[]> {
        const query = `
      SELECT tc.* FROM targeting_criteria tc
      JOIN ad_groups ag ON tc.ad_group_id = ag.id
      WHERE ag.campaign_id = $1
      ORDER BY tc.criteria_type, tc.created_at
    `;

        const result = await db.query(query, [campaignId]);
        return result.rows;
    }

    async evaluateTargeting(
        adGroupId: number,
        userContext: {
            age?: number;
            gender?: string;
            location?: string;
            interests?: string[];
            device?: string;
            platform?: string;
        }
    ): Promise<boolean> {
        const criteria = await this.getTargetingCriteriaByAdGroup(adGroupId);

        if (criteria.length === 0) {
            // No targeting criteria means show to everyone
            return true;
        }

        // Group criteria by type
        const criteriaByType = criteria.reduce((acc, criterion) => {
            if (!acc[criterion.criteria_type]) {
                acc[criterion.criteria_type] = [];
            }
            acc[criterion.criteria_type].push(criterion);
            return acc;
        }, {} as Record<TargetingType, TargetingCriteria[]>);

        // Evaluate each type (AND logic between types, OR logic within types)
        for (const [type, typeCriteria] of Object.entries(criteriaByType)) {
            const typeMatches = typeCriteria.some(criterion =>
                this.evaluateSingleCriterion(criterion, userContext)
            );

            if (!typeMatches) {
                return false;
            }
        }

        return true;
    }

    private evaluateSingleCriterion(
        criterion: TargetingCriteria,
        userContext: any
    ): boolean {
        const userValue = userContext[criterion.criteria_type];

        if (userValue === undefined || userValue === null) {
            return false;
        }

        switch (criterion.operator) {
            case 'equals':
                return String(userValue).toLowerCase() === criterion.criteria_value.toLowerCase();

            case 'contains':
                return String(userValue).toLowerCase().includes(criterion.criteria_value.toLowerCase());

            case 'in':
                const values = criterion.criteria_value.split(',').map(v => v.trim().toLowerCase());
                return values.includes(String(userValue).toLowerCase());

            case 'between':
                if (criterion.criteria_type === 'age') {
                    const [min, max] = criterion.criteria_value.split('-').map(v => parseInt(v.trim()));
                    const age = parseInt(String(userValue));
                    return age >= min && age <= max;
                }
                return false;

            default:
                return false;
        }
    }

    async getTargetingStats(adGroupId: number): Promise<any> {
        const query = `
      SELECT 
        criteria_type,
        COUNT(*) as criteria_count,
        array_agg(criteria_value) as values
      FROM targeting_criteria 
      WHERE ad_group_id = $1
      GROUP BY criteria_type
    `;

        const result = await db.query(query, [adGroupId]);
        return result.rows;
    }
}