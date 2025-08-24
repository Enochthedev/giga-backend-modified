import { Router, Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/user-model';
import { AuthService } from '../services/auth-service';
import { ApiResponseUtil, ValidationMiddleware } from '@giga/common';
import { userValidationSchemas } from '../validation/user-validation';
import { authMiddleware, requirePermission } from '../middleware/auth-middleware';
import { validateRequest, validateParams } from '../middleware/validation-middleware';
import { authValidation } from '../validation/auth-validation';
import Joi from 'joi';

const router = Router();

// Enhanced validation schemas
const userValidation = {
    getUserById: Joi.object({
        id: Joi.string().uuid().required()
    }),
    updateProfile: authValidation.updateProfile,
    addRating: authValidation.addRating,
    createTaxiAccount: authValidation.createTaxiAccount
};

/**
 * GET /api/users/me
 * Get current user profile
 */
router.get('/me', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.userId;
        const userProfile = await AuthService.getUserProfile(userId);

        res.json(
            ApiResponseUtil.success(
                userProfile,
                'User profile retrieved successfully',
                req.headers['x-request-id'] as string
            )
        );
        return;
    } catch (error) {
        next(error);
        return;
    }
});

/**
 * PUT /api/users/me
 * Update current user profile
 */
router.put('/me', authMiddleware, validateRequest(userValidation.updateProfile), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.userId;
        const result = await AuthService.updateProfile(userId, req.body);

        res.json(
            ApiResponseUtil.success(
                result.user,
                result.message,
                req.headers['x-request-id'] as string
            )
        );
        return;
    } catch (error) {
        next(error);
        return;
    }
});

/**
 * GET /api/users/:id
 * Get user by ID (admin only)
 */
router.get('/:id',
    authMiddleware,
    requirePermission('users.read'),
    ValidationMiddleware.validateUuidParams('id'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const user = await UserModel.findById(id!);

            if (!user) {
                return res.status(404).json(
                    ApiResponseUtil.error(
                        'User not found',
                        'USER_NOT_FOUND',
                        req.headers['x-request-id'] as string
                    )
                );
            }

            res.json(
                ApiResponseUtil.success({
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    phone: user.phone,
                    dateOfBirth: user.dateOfBirth,
                    isVerified: user.isVerified,
                    lastLoginAt: user.lastLoginAt,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt
                }, 'User retrieved successfully', req.headers['x-request-id'] as string)
            );
            return;
        } catch (error) {
            next(error);
            return;
        }
    }
);

/**
 * GET /api/users/:id/profile
 * Get user profile with roles and permissions (admin only)
 */
router.get('/:id/profile',
    authMiddleware,
    requirePermission('users.read'),
    ValidationMiddleware.validateUuidParams('id'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const userWithRoles = await UserModel.findByIdWithRoles(id!);

            if (!userWithRoles) {
                return res.status(404).json(
                    ApiResponseUtil.error(
                        'User not found',
                        'USER_NOT_FOUND',
                        req.headers['x-request-id'] as string
                    )
                );
            }

            res.json(
                ApiResponseUtil.success({
                    id: userWithRoles.id,
                    email: userWithRoles.email,
                    firstName: userWithRoles.firstName,
                    lastName: userWithRoles.lastName,
                    phone: userWithRoles.phone,
                    dateOfBirth: userWithRoles.dateOfBirth,
                    isVerified: userWithRoles.isVerified,
                    lastLoginAt: userWithRoles.lastLoginAt,
                    createdAt: userWithRoles.createdAt,
                    updatedAt: userWithRoles.updatedAt,
                    roles: userWithRoles.roles.map(role => ({
                        id: role.id,
                        name: role.name,
                        permissions: role.permissions
                    }))
                }, 'User profile retrieved successfully', req.headers['x-request-id'] as string)
            );
            return;
        } catch (error) {
            next(error);
            return;
        }
    }
);

/**
 * PUT /api/users/:id
 * Update user information (admin only)
 */
router.put('/:id',
    authMiddleware,
    requirePermission('users.write'),
    ValidationMiddleware.validateUuidParams('id'),
    ValidationMiddleware.validateZod(userValidationSchemas.updateUser),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const updatedUser = await UserModel.update(id!, req.body);

            res.json(
                ApiResponseUtil.success({
                    id: updatedUser.id,
                    email: updatedUser.email,
                    firstName: updatedUser.firstName,
                    lastName: updatedUser.lastName,
                    phone: updatedUser.phone,
                    dateOfBirth: updatedUser.dateOfBirth,
                    isVerified: updatedUser.isVerified,
                    lastLoginAt: updatedUser.lastLoginAt,
                    createdAt: updatedUser.createdAt,
                    updatedAt: updatedUser.updatedAt
                }, 'User updated successfully', req.headers['x-request-id'] as string)
            );
            return;
        } catch (error) {
            next(error);
        }
    }
);

/**
 * DELETE /api/users/:id
 * Deactivate user (soft delete) (admin only)
 */
router.delete('/:id',
    authMiddleware,
    requirePermission('users.delete'),
    ValidationMiddleware.validateUuidParams('id'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            await UserModel.deactivate(id!);

            res.json(
                ApiResponseUtil.success(
                    null,
                    'User deactivated successfully',
                    req.headers['x-request-id'] as string
                )
            );
            return;
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/users/:id/verify-email
 * Verify user email (admin only)
 */
router.post('/:id/verify-email',
    authMiddleware,
    requirePermission('users.write'),
    ValidationMiddleware.validateUuidParams('id'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            await UserModel.verifyEmail(id!);

            res.json(
                ApiResponseUtil.success(
                    null,
                    'Email verified successfully',
                    req.headers['x-request-id'] as string
                )
            );
            return;
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/users/:id/rating
 * Add rating to user
 */
router.post('/:id/rating',
    authMiddleware,
    ValidationMiddleware.validateUuidParams('id'),
    validateRequest(userValidation.addRating),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const { rating } = req.body;
            const raterId = (req as any).user.userId;

            // Prevent users from rating themselves
            if (id === raterId) {
                return res.status(400).json(
                    ApiResponseUtil.error(
                        'You cannot rate yourself',
                        'SELF_RATING_NOT_ALLOWED',
                        req.headers['x-request-id'] as string
                    )
                );
            }

            const result = await AuthService.addRating(id!, rating);

            res.json(
                ApiResponseUtil.success(
                    null,
                    result.message,
                    req.headers['x-request-id'] as string
                )
            );
            return;
        } catch (error) {
            next(error);
            return;
        }
    }
);

/**
 * POST /api/users/:id/taxi-account
 * Create taxi account association
 */
router.post('/:id/taxi-account',
    authMiddleware,
    ValidationMiddleware.validateUuidParams('id'),
    validateRequest(userValidation.createTaxiAccount),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const currentUserId = (req as any).user.userId;

            // Users can only create taxi accounts for themselves, unless they're admin
            const userRoles = (req as any).user.roles || [];
            const isAdmin = userRoles.includes('admin') || userRoles.includes('super_admin');

            if (id !== currentUserId && !isAdmin) {
                return res.status(403).json(
                    ApiResponseUtil.error(
                        'You can only create taxi accounts for yourself',
                        'FORBIDDEN',
                        req.headers['x-request-id'] as string
                    )
                );
            }

            const result = await AuthService.createTaxiAccount(id!, req.body);

            res.json(
                ApiResponseUtil.success(
                    null,
                    result.message,
                    req.headers['x-request-id'] as string
                )
            );
            return;
        } catch (error) {
            next(error);
            return;
        }
    }
);

/**
 * POST /api/users/:id/roles/:roleName
 * Assign role to user (admin only)
 */
router.post('/:id/roles/:roleName',
    authMiddleware,
    requirePermission('roles.write'),
    ValidationMiddleware.validateUuidParams('id'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id, roleName } = req.params;

            // Validate role name
            const validRoles = ['super_admin', 'admin', 'user', 'vendor', 'driver', 'property_owner'];
            if (!roleName || !validRoles.includes(roleName)) {
                return res.status(400).json(
                    ApiResponseUtil.error(
                        `Invalid role. Valid roles are: ${validRoles.join(', ')}`,
                        'INVALID_ROLE',
                        req.headers['x-request-id'] as string
                    )
                );
            }

            await UserModel.assignRole(id!, roleName!);

            res.json(
                ApiResponseUtil.success(
                    null,
                    `Role '${roleName}' assigned successfully`,
                    req.headers['x-request-id'] as string
                )
            );
            return;
        } catch (error) {
            next(error);
            return;
        }
    }
);

/**
 * DELETE /api/users/:id/roles/:roleName
 * Remove role from user (admin only)
 */
router.delete('/:id/roles/:roleName',
    authMiddleware,
    requirePermission('roles.write'),
    ValidationMiddleware.validateUuidParams('id'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id, roleName } = req.params;
            await UserModel.removeRole(id!, roleName!);

            res.json(
                ApiResponseUtil.success(
                    null,
                    `Role '${roleName}' removed successfully`,
                    req.headers['x-request-id'] as string
                )
            );
            return;
        } catch (error) {
            next(error);
        }
    }
);

export default router;