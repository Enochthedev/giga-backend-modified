import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import driverService from './driver.service';
import rideService from './ride.service';
import jwt from 'jsonwebtoken';

interface AuthenticatedSocket extends Socket {
    userId?: string;
    userType?: 'driver' | 'customer';
    driverId?: string;
}

class WebSocketService {
    private io: SocketIOServer;
    private connectedDrivers: Map<string, string> = new Map(); // driverId -> socketId
    private connectedCustomers: Map<string, string> = new Map(); // customerId -> socketId

    constructor(server: HTTPServer) {
        this.io = new SocketIOServer(server, {
            cors: {
                origin: process.env.WEBSOCKET_CORS_ORIGIN || "http://localhost:3000",
                methods: ["GET", "POST"]
            }
        });

        this.setupMiddleware();
        this.setupEventHandlers();
    }

    private setupMiddleware(): void {
        // Authentication middleware
        this.io.use(async (socket: AuthenticatedSocket, next) => {
            try {
                const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

                if (!token) {
                    return next(new Error('Authentication token required'));
                }

                const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
                socket.userId = decoded.userId;
                socket.userType = decoded.userType || 'customer';

                // If it's a driver, get driver ID
                if (socket.userType === 'driver') {
                    const driver = await driverService.getDriverByUserId(socket.userId!);
                    if (driver) {
                        socket.driverId = driver._id.toString();
                    }
                }

                next();
            } catch (error) {
                next(new Error('Invalid authentication token'));
            }
        });
    }

    private setupEventHandlers(): void {
        this.io.on('connection', (socket: AuthenticatedSocket) => {
            console.log(`User connected: ${socket.userId} (${socket.userType})`);

            // Handle driver connections
            if (socket.userType === 'driver' && socket.driverId) {
                this.handleDriverConnection(socket);
            }

            // Handle customer connections
            if (socket.userType === 'customer') {
                this.handleCustomerConnection(socket);
            }

            // Common event handlers
            this.setupCommonEventHandlers(socket);

            // Handle disconnection
            socket.on('disconnect', () => {
                this.handleDisconnection(socket);
            });
        });
    }

    private handleDriverConnection(socket: AuthenticatedSocket): void {
        const driverId = socket.driverId!;
        this.connectedDrivers.set(driverId, socket.id);

        // Join driver-specific room
        socket.join(`driver:${driverId}`);

        // Handle location updates
        socket.on('location_update', async (data: {
            latitude: number;
            longitude: number;
            heading?: number;
            speed?: number;
        }) => {
            try {
                await driverService.updateDriverLocation({
                    driverId,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    heading: data.heading,
                    speed: data.speed
                });

                // Broadcast location to relevant customers (those with active rides)
                await this.broadcastDriverLocation(driverId, {
                    latitude: data.latitude,
                    longitude: data.longitude
                });

                // Acknowledge the update
                socket.emit('location_update_ack', { success: true, timestamp: new Date() });
            } catch (error: any) {
                console.error('Error updating driver location:', error);
                socket.emit('location_update_ack', { success: false, error: error.message });
            }
        });

        // Handle driver status updates
        socket.on('status_update', async (data: { status: string }) => {
            try {
                await driverService.updateDriverStatus(driverId, data.status as any);
                socket.emit('status_update_ack', { success: true });
            } catch (error: any) {
                console.error('Error updating driver status:', error);
                socket.emit('status_update_ack', { success: false, error: error.message });
            }
        });

        // Handle ride acceptance
        socket.on('accept_ride', async (data: { rideId: string }) => {
            try {
                const ride = await rideService.acceptRide(driverId, data.rideId);

                // Notify customer
                this.notifyCustomer(ride.customerId, 'ride_accepted', {
                    rideId: ride._id,
                    driverId: driverId,
                    estimatedArrival: ride.driverArrivalTime
                });

                socket.emit('ride_accepted_ack', { success: true, rideId: ride._id });
            } catch (error: any) {
                console.error('Error accepting ride:', error);
                socket.emit('ride_accepted_ack', { success: false, error: error.message });
            }
        });

        // Handle driver arrival
        socket.on('driver_arrived', async (data: { rideId: string }) => {
            try {
                const ride = await rideService.driverArrived(data.rideId, driverId);

                // Notify customer
                this.notifyCustomer(ride.customerId, 'driver_arrived', {
                    rideId: ride._id,
                    message: 'Your driver has arrived'
                });

                socket.emit('driver_arrived_ack', { success: true });
            } catch (error: any) {
                console.error('Error marking driver arrived:', error);
                socket.emit('driver_arrived_ack', { success: false, error: error.message });
            }
        });

        // Handle ride start
        socket.on('start_ride', async (data: { rideId: string }) => {
            try {
                const ride = await rideService.startRide(data.rideId, driverId);

                // Notify customer
                this.notifyCustomer(ride.customerId, 'ride_started', {
                    rideId: ride._id,
                    message: 'Your ride has started'
                });

                socket.emit('ride_started_ack', { success: true });
            } catch (error: any) {
                console.error('Error starting ride:', error);
                socket.emit('ride_started_ack', { success: false, error: error.message });
            }
        });

        // Handle ride completion
        socket.on('complete_ride', async (data: {
            rideId: string;
            finalFare?: number;
            actualDistance?: number;
        }) => {
            try {
                const ride = await rideService.completeRide(
                    data.rideId,
                    driverId,
                    data.finalFare,
                    data.actualDistance
                );

                // Notify customer
                this.notifyCustomer(ride.customerId, 'ride_completed', {
                    rideId: ride._id,
                    finalFare: ride.finalFare,
                    message: 'Your ride has been completed'
                });

                socket.emit('ride_completed_ack', { success: true });
            } catch (error: any) {
                console.error('Error completing ride:', error);
                socket.emit('ride_completed_ack', { success: false, error: error.message });
            }
        });
    }

    private handleCustomerConnection(socket: AuthenticatedSocket): void {
        const customerId = socket.userId!;
        this.connectedCustomers.set(customerId, socket.id);

        // Join customer-specific room
        socket.join(`customer:${customerId}`);

        // Handle ride requests
        socket.on('request_ride', async (data: {
            pickupLocation: { latitude: number; longitude: number };
            dropoffLocation: { latitude: number; longitude: number };
            vehicleType?: string;
        }) => {
            try {
                const result = await rideService.requestRide({
                    customerId,
                    pickupLocation: data.pickupLocation,
                    dropoffLocation: data.dropoffLocation,
                    vehicleType: data.vehicleType as any
                });

                // Notify available drivers
                for (const match of result.availableDrivers) {
                    this.notifyDriver(match.driverId, 'ride_request', {
                        rideId: result.ride._id,
                        pickup: data.pickupLocation,
                        dropoff: data.dropoffLocation,
                        estimatedFare: result.ride.estimatedFare,
                        estimatedArrival: match.estimatedArrivalTime,
                        distance: match.distance
                    });
                }

                socket.emit('ride_request_ack', {
                    success: true,
                    rideId: result.ride._id,
                    availableDrivers: result.availableDrivers.length
                });
            } catch (error: any) {
                console.error('Error requesting ride:', error);
                socket.emit('ride_request_ack', { success: false, error: error.message });
            }
        });

        // Handle ride cancellation
        socket.on('cancel_ride', async (data: { rideId: string; reason?: string }) => {
            try {
                const ride = await rideService.cancelRide(data.rideId, 'customer', data.reason);

                // Notify driver if ride was accepted
                if (ride.driverId) {
                    this.notifyDriver(ride.driverId.toString(), 'ride_cancelled', {
                        rideId: ride._id,
                        reason: data.reason || 'Customer cancelled the ride'
                    });
                }

                socket.emit('ride_cancelled_ack', { success: true });
            } catch (error: any) {
                console.error('Error cancelling ride:', error);
                socket.emit('ride_cancelled_ack', { success: false, error: error.message });
            }
        });

        // Handle ride rating
        socket.on('rate_ride', async (data: {
            rideId: string;
            rating: number;
            review?: string;
        }) => {
            try {
                await rideService.rateRide(data.rideId, 'customer', data.rating, data.review);
                socket.emit('ride_rated_ack', { success: true });
            } catch (error: any) {
                console.error('Error rating ride:', error);
                socket.emit('ride_rated_ack', { success: false, error: error.message });
            }
        });
    }

    private setupCommonEventHandlers(socket: AuthenticatedSocket): void {
        // Handle ping/pong for connection health
        socket.on('ping', () => {
            socket.emit('pong', { timestamp: new Date() });
        });

        // Handle subscription to ride updates
        socket.on('subscribe_ride_updates', (data: { rideId: string }) => {
            socket.join(`ride:${data.rideId}`);
        });

        // Handle unsubscription from ride updates
        socket.on('unsubscribe_ride_updates', (data: { rideId: string }) => {
            socket.leave(`ride:${data.rideId}`);
        });
    }

    private handleDisconnection(socket: AuthenticatedSocket): void {
        console.log(`User disconnected: ${socket.userId} (${socket.userType})`);

        if (socket.userType === 'driver' && socket.driverId) {
            this.connectedDrivers.delete(socket.driverId);
        }

        if (socket.userType === 'customer' && socket.userId) {
            this.connectedCustomers.delete(socket.userId);
        }
    }

    private async broadcastDriverLocation(driverId: string, location: { latitude: number; longitude: number }): Promise<void> {
        // Find active rides for this driver
        const rides = await rideService.getDriverRides(driverId, 1);
        const activeRide = rides.find(ride => ride.isActive());

        if (activeRide) {
            // Broadcast to customer in the active ride
            this.notifyCustomer(activeRide.customerId, 'driver_location_update', {
                rideId: activeRide._id,
                location,
                timestamp: new Date()
            });

            // Broadcast to ride-specific room
            this.io.to(`ride:${activeRide._id}`).emit('driver_location_update', {
                driverId,
                location,
                timestamp: new Date()
            });
        }
    }

    private notifyDriver(driverId: string, event: string, data: any): void {
        const socketId = this.connectedDrivers.get(driverId);
        if (socketId) {
            this.io.to(socketId).emit(event, data);
        }

        // Also emit to driver room in case of multiple connections
        this.io.to(`driver:${driverId}`).emit(event, data);
    }

    private notifyCustomer(customerId: string, event: string, data: any): void {
        const socketId = this.connectedCustomers.get(customerId);
        if (socketId) {
            this.io.to(socketId).emit(event, data);
        }

        // Also emit to customer room in case of multiple connections
        this.io.to(`customer:${customerId}`).emit(event, data);
    }

    // Public methods for external services to use

    public broadcastToRide(rideId: string, event: string, data: any): void {
        this.io.to(`ride:${rideId}`).emit(event, data);
    }

    public notifyDriverById(driverId: string, event: string, data: any): void {
        this.notifyDriver(driverId, event, data);
    }

    public notifyCustomerById(customerId: string, event: string, data: any): void {
        this.notifyCustomer(customerId, event, data);
    }

    public getConnectedDrivers(): string[] {
        return Array.from(this.connectedDrivers.keys());
    }

    public getConnectedCustomers(): string[] {
        return Array.from(this.connectedCustomers.keys());
    }

    public isDriverConnected(driverId: string): boolean {
        return this.connectedDrivers.has(driverId);
    }

    public isCustomerConnected(customerId: string): boolean {
        return this.connectedCustomers.has(customerId);
    }
}

export default WebSocketService;