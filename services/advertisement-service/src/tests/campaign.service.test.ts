import { CampaignService } from '../services/campaign.service';
import { createTestAdvertiser } from './setup';

describe('CampaignService', () => {
    let campaignService: CampaignService;

    beforeEach(() => {
        campaignService = new CampaignService();
    });

    describe('createCampaign', () => {
        it('should create a new campaign', async () => {
            const advertiser = await createTestAdvertiser();

            const campaignData = {
                name: 'Test Campaign',
                description: 'A test campaign',
                budget: 1000,
                start_date: new Date().toISOString(),
                objective: 'traffic' as const
            };

            const campaign = await campaignService.createCampaign(advertiser.id, campaignData);

            expect(campaign).toBeDefined();
            expect(campaign.name).toBe(campaignData.name);
            expect(campaign.advertiser_id).toBe(advertiser.id);
            expect(campaign.budget).toBe(campaignData.budget);
            expect(campaign.objective).toBe(campaignData.objective);
            expect(campaign.status).toBe('draft');
        });

        it('should create campaign with daily budget', async () => {
            const advertiser = await createTestAdvertiser();

            const campaignData = {
                name: 'Test Campaign with Daily Budget',
                budget: 1000,
                daily_budget: 50,
                start_date: new Date().toISOString(),
                objective: 'conversions' as const
            };

            const campaign = await campaignService.createCampaign(advertiser.id, campaignData);

            expect(campaign.daily_budget).toBe(campaignData.daily_budget);
        });
    });

    describe('getCampaignById', () => {
        it('should retrieve campaign by ID', async () => {
            const advertiser = await createTestAdvertiser();
            const campaignData = {
                name: 'Test Campaign',
                budget: 500,
                start_date: new Date().toISOString(),
                objective: 'awareness' as const
            };

            const createdCampaign = await campaignService.createCampaign(advertiser.id, campaignData);
            const retrievedCampaign = await campaignService.getCampaignById(createdCampaign.id);

            expect(retrievedCampaign).toBeDefined();
            expect(retrievedCampaign!.id).toBe(createdCampaign.id);
            expect(retrievedCampaign!.name).toBe(campaignData.name);
        });

        it('should return null for non-existent campaign', async () => {
            const campaign = await campaignService.getCampaignById(99999);
            expect(campaign).toBeNull();
        });
    });

    describe('updateCampaign', () => {
        it('should update campaign fields', async () => {
            const advertiser = await createTestAdvertiser();
            const campaignData = {
                name: 'Original Campaign',
                budget: 500,
                start_date: new Date().toISOString(),
                objective: 'traffic' as const
            };

            const campaign = await campaignService.createCampaign(advertiser.id, campaignData);

            const updateData = {
                name: 'Updated Campaign',
                budget: 750
            };

            const updatedCampaign = await campaignService.updateCampaign(campaign.id, updateData);

            expect(updatedCampaign).toBeDefined();
            expect(updatedCampaign!.name).toBe(updateData.name);
            expect(updatedCampaign!.budget).toBe(updateData.budget);
            expect(updatedCampaign!.objective).toBe(campaignData.objective); // Should remain unchanged
        });
    });

    describe('checkBudgetAvailability', () => {
        it('should return available budget for new campaign', async () => {
            const advertiser = await createTestAdvertiser();
            const campaignData = {
                name: 'Budget Test Campaign',
                budget: 1000,
                start_date: new Date().toISOString(),
                objective: 'conversions' as const
            };

            const campaign = await campaignService.createCampaign(advertiser.id, campaignData);
            const budgetInfo = await campaignService.checkBudgetAvailability(campaign.id);

            expect(budgetInfo.available).toBe(true);
            expect(budgetInfo.remaining).toBe(1000);
        });

        it('should return false for non-existent campaign', async () => {
            const budgetInfo = await campaignService.checkBudgetAvailability(99999);
            expect(budgetInfo.available).toBe(false);
            expect(budgetInfo.remaining).toBe(0);
        });
    });
});