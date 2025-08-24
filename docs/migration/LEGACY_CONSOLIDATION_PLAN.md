# Legacy Services Consolidation Plan

## Current State Analysis

### Legacy Services to Consolidate:
1. **`payment-service/`** → `services/payment-service/` ✅ (Has comprehensive Stripe integration)
2. **`giga_taxi_main/`** + **`giga_taxi_driver/`** → `services/taxi-service/` 
3. **`ecommerce-backend/`** → `services/ecommerce-service/`
4. **`hotel-service/`** → `services/hotel-service/` (needs creation)
5. **`advertisement-service/`** → `services/advertisement-service/` (needs creation)

### Modern Services (Already Complete):
- ✅ `services/authentication-service/` (enhanced with giga_main features)
- ✅ `services/api-gateway/`
- ✅ `services/search-service/`
- ✅ `services/file-service/`
- ✅ `services/notification-service/`
- ✅ `services/messaging-service/`
- ✅ `services/analytics-service/`
- ✅ `services/admin-service/`

## Consolidation Strategy

### Phase 1: Payment Service (PRIORITY 1)
**Status**: Legacy has full implementation, modern is empty
**Action**: Move legacy implementation to modern structure
- Copy and enhance payment-service → services/payment-service
- Update to use @giga/common package
- Maintain Stripe integration and webhook handling
- Add proper TypeScript types and validation

### Phase 2: Taxi Service Consolidation (PRIORITY 2)  
**Status**: Two legacy services need merging into one modern service
**Action**: Merge giga_taxi_main + giga_taxi_driver → services/taxi-service
- Analyze both legacy services for unique functionality
- Create unified data models for drivers and rides
- Merge real-time location tracking features
- Consolidate ride matching and pricing algorithms

### Phase 3: E-commerce Service (PRIORITY 3)
**Status**: Legacy has vendor management, modern has basic structure
**Action**: Enhance ecommerce-backend → services/ecommerce-service
- Extract vendor management features
- Migrate product catalog and inventory
- Enhance order processing workflows
- Add advanced shopping cart features

### Phase 4: Hotel Service Creation (PRIORITY 4)
**Status**: Legacy exists, modern service needs creation
**Action**: Create services/hotel-service from hotel-service
- Extract property management features
- Migrate booking and availability systems
- Add property owner dashboards
- Implement review and rating systems

### Phase 5: Advertisement Service Creation (PRIORITY 5)
**Status**: Legacy exists, modern service needs creation  
**Action**: Create services/advertisement-service from advertisement-service
- Extract campaign management features
- Migrate analytics and reporting
- Add advertiser billing integration
- Implement ad serving algorithms

## Success Criteria
- All legacy services consolidated into services/ directory
- Modern architecture patterns applied consistently
- @giga/common package used throughout
- Comprehensive testing and validation
- Legacy services can be safely removed
- Docker Compose updated for unified orchestration

## Next Steps
1. Start with Payment Service (highest value, clearest path)
2. Proceed with Taxi Service consolidation
3. Continue with remaining services in priority order
4. Test and validate each consolidation
5. Update configurations and documentation
6. Remove legacy services once validated