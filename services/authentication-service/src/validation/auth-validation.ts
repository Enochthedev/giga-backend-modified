import Joi from 'joi';

export const authValidation = {
    register: Joi.object({
        email: Joi.string().email().required().messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),
        password: Joi.string()
            .min(8)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
            .required()
            .messages({
                'string.min': 'Password must be at least 8 characters long',
                'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
                'any.required': 'Password is required'
            }),
        firstName: Joi.string().min(1).max(100).required().messages({
            'string.min': 'First name is required',
            'string.max': 'First name cannot exceed 100 characters',
            'any.required': 'First name is required'
        }),
        lastName: Joi.string().max(100).optional(),
        otherNames: Joi.string().max(100).optional(),
        username: Joi.string().min(3).max(50).alphanum().required().messages({
            'string.min': 'Username must be at least 3 characters long',
            'string.max': 'Username cannot exceed 50 characters',
            'string.alphanum': 'Username can only contain letters and numbers',
            'any.required': 'Username is required'
        }),
        phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).required().messages({
            'string.pattern.base': 'Please provide a valid phone number',
            'any.required': 'Phone number is required'
        }),
        country: Joi.string().min(1).max(100).required().messages({
            'any.required': 'Country is required'
        }),
        address: Joi.string().min(1).required().messages({
            'any.required': 'Address is required'
        }),
        street: Joi.string().min(1).max(255).required().messages({
            'any.required': 'Street is required'
        }),
        city: Joi.string().min(1).max(100).required().messages({
            'any.required': 'City is required'
        }),
        zipCode: Joi.string().min(1).max(20).required().messages({
            'any.required': 'Zip code is required'
        }),
        gender: Joi.string().valid('male', 'female', 'other', 'prefer-not-to-say').required().messages({
            'any.only': 'Gender must be one of: male, female, other, prefer-not-to-say',
            'any.required': 'Gender is required'
        }),
        weight: Joi.number().min(20).max(500).optional(),
        maritalStatus: Joi.string().valid('single', 'married', 'divorced', 'widowed', 'prefer-not-to-say').required().messages({
            'any.only': 'Marital status must be one of: single, married, divorced, widowed, prefer-not-to-say',
            'any.required': 'Marital status is required'
        }),
        ageGroup: Joi.string().valid('18-24', '25-34', '35-44', '45-54', '55-64', '65+').required().messages({
            'any.only': 'Age group must be one of: 18-24, 25-34, 35-44, 45-54, 55-64, 65+',
            'any.required': 'Age group is required'
        }),
        areaOfInterest: Joi.string().min(1).required().messages({
            'any.required': 'Area of interest is required'
        }),
        profilePicture: Joi.string().uri().optional()
    }),

    login: Joi.object({
        email: Joi.string().email().required().messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),
        password: Joi.string().required().messages({
            'any.required': 'Password is required'
        }),
        deviceId: Joi.string().optional()
    }),

    refreshToken: Joi.object({
        refreshToken: Joi.string().required().messages({
            'any.required': 'Refresh token is required'
        })
    }),

    logout: Joi.object({
        refreshToken: Joi.string().required().messages({
            'any.required': 'Refresh token is required'
        })
    }),

    changePassword: Joi.object({
        currentPassword: Joi.string().required().messages({
            'any.required': 'Current password is required'
        }),
        newPassword: Joi.string()
            .min(8)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
            .required()
            .messages({
                'string.min': 'New password must be at least 8 characters long',
                'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
                'any.required': 'New password is required'
            })
    }),

    verifyOTP: Joi.object({
        otp: Joi.string().length(6).pattern(/^\d+$/).required().messages({
            'string.length': 'OTP must be 6 digits',
            'string.pattern.base': 'OTP must contain only numbers',
            'any.required': 'OTP is required'
        })
    }),

    verifyEmail: Joi.object({
        email: Joi.string().email().required().messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),
        token: Joi.string().required().messages({
            'any.required': 'Verification token is required'
        })
    }),

    verifyToken: Joi.object({
        token: Joi.string().required().messages({
            'any.required': 'Token is required'
        })
    }),

    updateProfile: Joi.object({
        firstName: Joi.string().min(1).max(100).optional(),
        lastName: Joi.string().max(100).optional(),
        otherNames: Joi.string().max(100).optional(),
        country: Joi.string().min(1).max(100).optional(),
        address: Joi.string().min(1).optional(),
        street: Joi.string().min(1).max(255).optional(),
        city: Joi.string().min(1).max(100).optional(),
        zipCode: Joi.string().min(1).max(20).optional(),
        gender: Joi.string().valid('male', 'female', 'other', 'prefer-not-to-say').optional(),
        weight: Joi.number().min(20).max(500).optional(),
        maritalStatus: Joi.string().valid('single', 'married', 'divorced', 'widowed', 'prefer-not-to-say').optional(),
        ageGroup: Joi.string().valid('18-24', '25-34', '35-44', '45-54', '55-64', '65+').optional(),
        areaOfInterest: Joi.string().min(1).optional(),
        profilePicture: Joi.string().uri().optional()
    }),

    addRating: Joi.object({
        rating: Joi.number().min(1).max(5).required().messages({
            'number.min': 'Rating must be at least 1',
            'number.max': 'Rating cannot exceed 5',
            'any.required': 'Rating is required'
        })
    }),

    createTaxiAccount: Joi.object({
        taxiProfileId: Joi.string().required().messages({
            'any.required': 'Taxi profile ID is required'
        }),
        type: Joi.string().valid('TaxiDriver', 'TaxiCustomer').required().messages({
            'any.only': 'Type must be either TaxiDriver or TaxiCustomer',
            'any.required': 'Type is required'
        })
    })
};