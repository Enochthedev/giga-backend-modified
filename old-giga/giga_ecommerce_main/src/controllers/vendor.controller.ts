import { Request, Response } from 'express';
import httpStatus from 'http-status';
import VendorService from '../services/vendor.service';
import VendorZod from '../validations/vendor.model.zod';


export class VendorController {

    public async createVendor(req: Request, res: Response) {
        try {
            const payload = VendorZod.CreateVendorPayload.parse(req.body);
            const response = await VendorService.createVendor(payload);
            res.status(response.status).json(response);

        }catch (error: any) {
            console.error('Error creating category:', error.message);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }

    public async getAllVendors(req: Request, res: Response) {
        try {
            const payload = VendorZod.GetAllVendorsPayload.parse(req.query);
            const response = await VendorService.getAllVendors(payload);
            res.status(response.status).json(response);
        }catch (error: any) {
            console.error('Error getting all categories:', error.message);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }

    public async getAllVendorsInfo(req: Request, res: Response) {
        try {
            const payload = VendorZod.GetAllVendorsPayload.parse(req.query);
            const response = await VendorService.getAllVendorsInfo(payload);
            res.status(response.status).json(response);
        }catch (error: any) {
            console.error('Error getting all categories:', error.message);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }

    public async getVendor(req: Request, res: Response) {
        try {
            const payload = VendorZod.GetVendorPayload.parse(req.params);
            const response = await VendorService.getVendor(payload);
            res.status(response.status).json(response);
        }catch (error: any) {
            console.error('Error getting all categories:', error.message);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }

    public async updateVendor(req: Request, res: Response) {
        try {
            const payload = VendorZod.UpdateVendorPayload.parse(req.body);
            const response = await VendorService.updateVendor(payload);
            res.status(response.status).json(response);
        }catch (error: any) {
            console.error('Error getting all categories:', error.message);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }

    public async deleteVendor(req: Request, res: Response) {
        try {
            const payload = VendorZod.GetVendorPayload.parse(req.params);
            const response = await VendorService.deleteVendor(payload);
            res.status(response.status).json(response);
        }catch (error: any) {
            console.error('Error getting all categories:', error.message);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }

    public async addKYC(req: Request, res: Response) {
        try {
            const payload = VendorZod.AddKYCPayload.parse(req.body);
            const response = await VendorService.addKYC(payload);
            res.status(response.status).json(response);
        }catch (error: any) {
            console.error('Error getting all categories:', error.message);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }

    public async addBankDetails(req: Request, res: Response) {
        try {
            const payload = VendorZod.AddBankDetailsPayload.parse(req.body);
            const response = await VendorService.addBankDetails(payload);
            res.status(response.status).json(response);
        }catch (error: any) {
            console.error('Error getting all categories:', error.message);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }

    public async blacklistVendor(req: Request, res: Response) {
        try {
            const payload = VendorZod.GetVendorPayload.parse(req.params);
            const response = await VendorService.blacklistVendor(payload);
            res.status(response.status).json(response);
        }catch (error: any) {
            console.error('Error getting all categories:', error.message);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error',
            });
        }

    }

    public async unBlacklistVendor(req: Request, res: Response) {
        try {
            const payload = VendorZod.GetVendorPayload.parse(req.params);
            const response = await VendorService.unblacklistVendor(payload);
            res.status(response.status).json(response);
        }catch (error: any) {
            console.error('Error getting all categories:', error.message);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    public async deactivateVendor(req: Request, res: Response) {
        try {
            const payload = VendorZod.GetVendorPayload.parse(req.params);
            const response = await VendorService.deactivateVendor(payload);
            res.status(response.status).json(response);
        }catch (error: any) {
            console.error('Error getting all categories:', error.message)
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    public async activateVendor(req: Request, res: Response) {
        try {
            const payload = VendorZod.GetVendorPayload.parse(req.params);
            const response = await VendorService.activateVendor(payload);
            res.status(response.status).json(response);
        }catch (error: any) {
            console.error('Error getting all categories:', error.message)
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
    
    public async reportVendor(req: Request, res: Response) {
        try {
            const payload = VendorZod.GetVendorPayload.parse(req.params);
            const response = await VendorService.reportVendor(payload);
            res.status(response.status).json(response);
        }catch (error: any) {
            console.error('Error reporting vendor:', error.message)
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    public async clearReport(req: Request, res: Response) {
        try {
            const payload = VendorZod.GetVendorPayload.parse(req.params);
            const response = await VendorService.clearReport(payload);
            res.status(response.status).json(response);
        }catch (error: any) {
            console.error('Error clearing report:', error.message)
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    public async rateVendor(req: Request, res: Response) {
        try {
            const payload = VendorZod.RateVendorPayload.parse(req.params);
            const response = await VendorService.rateVendor(payload);
            res.status(response.status).json(response);
        }catch (error: any) {
            console.error('Error rating vendor:', error.message)
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

}

export default new VendorController();
