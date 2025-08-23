const rideConfig = {
    feePerKm: {
        luxury: 0.3,
        regular: 0.2,
        premium: 0.25,
        suv: 0.28,
        motorcycle: 0.15
    } as Record<string, number>,
    driverTypes: ['regular', 'luxury', 'premium', 'suv', 'motorcycle'],
    maxSearchRadius: 20, // km
    defaultSearchRadius: 10, // km
    rideTimeout: 15 * 60 * 1000, // 15 minutes in milliseconds
    locationUpdateInterval: 30 * 1000, // 30 seconds
    baseFare: 2.50,
    currency: 'USD'
};

export default rideConfig;