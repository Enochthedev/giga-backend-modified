export interface Location {
    latitude: number;
    longitude: number;
}

export interface Point {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
}

export enum RideStatus {
    REQUESTED = 'requested',
    ACCEPTED = 'accepted',
    DRIVER_ARRIVING = 'driver_arriving',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled'
}

export enum DriverStatus {
    OFFLINE = 'offline',
    AVAILABLE = 'available',
    BUSY = 'busy',
    ON_RIDE = 'on_ride'
}

export enum VehicleType {
    REGULAR = 'regular',
    LUXURY = 'luxury',
    SUV = 'suv',
    MOTORCYCLE = 'motorcycle'
}

export interface RideRequestData {
    customerId: string;
    pickupLocation: Location;
    dropoffLocation: Location;
    vehicleType?: VehicleType;
    estimatedDistance?: number;
    estimatedDuration?: number;
}

export interface DriverLocationUpdate {
    driverId: string;
    location: Location;
    heading?: number;
    speed?: number;
    timestamp: Date;
}

export interface RideMatchResult {
    driverId: string;
    estimatedArrivalTime: number;
    estimatedFare: number;
    distance: number;
}

export interface WebSocketMessage {
    type: string;
    payload: any;
    timestamp: Date;
}

export interface RideEstimate {
    distance: number;
    duration: number;
    fare: number;
    currency: string;
}