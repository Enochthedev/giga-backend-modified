# Incident Response Runbook

This runbook provides step-by-step procedures for responding to incidents in the multi-service platform.

## Incident Classification

### Severity Levels

#### Severity 1 (Critical)
- **Definition**: Complete service outage or data loss
- **Examples**: 
  - Payment processing completely down
  - Database corruption
  - Security breach
  - Complete platform unavailable
- **Response Time**: 15 minutes
- **Escalation**: Immediate to on-call engineer and management

#### Severity 2 (High)
- **Definition**: Major functionality impaired
- **Examples**:
  - Single service down (non-payment)
  - Performance degradation >50%
  - Partial data loss
- **Response Time**: 30 minutes
- **Escalation**: On-call engineer

#### Severity 3 (Medium)
- **Definition**: Minor functionality impaired
- **Examples**:
  - Non-critical feature unavailable
  - Performance degradation <50%
  - Intermittent errors
- **Response Time**: 2 hours
- **Escalation**: During business hours

#### Severity 4 (Low)
- **Definition**: Cosmetic issues or minor bugs
- **Examples**:
  - UI inconsistencies
  - Non-critical logging errors
  - Documentation issues
- **Response Time**: Next business day
- **Escalation**: Standard ticket queue

## Incident Response Process

### 1. Detection and Alerting

#### Automated Detection
- **Monitoring Systems**: Prometheus, Grafana, DataDog
- **Health Checks**: Service health endpoints
- **Log Analysis**: ELK stack alerts
- **Synthetic Monitoring**: Uptime checks

#### Manual Detection
- **User Reports**: Support tickets, social media
- **Team Reports**: Internal team notifications
- **Partner Reports**: Third-party service notifications

### 2. Initial Response (0-15 minutes)

#### Immediate Actions
1. **Acknowledge Alert**: Confirm receipt of incident notification
2. **Assess Severity**: Determine incident severity level
3. **Create Incident**: Log incident in incident management system
4. **Notify Team**: Alert appropriate team members
5. **Begin Investigation**: Start initial troubleshooting

#### Communication Template
```
🚨 INCIDENT ALERT - SEV [1/2/3/4]

Title: [Brief description]
Time: [Timestamp]
Services Affected: [List of services]
Impact: [User impact description]
Status: INVESTIGATING

Incident Commander: [Name]
Communication Channel: #incident-[number]

Next Update: [Time]
```

### 3. Investigation and Diagnosis (15-60 minutes)

#### Investigation Checklist
- [ ] Check service health endpoints
- [ ] Review recent deployments
- [ ] Analyze error logs
- [ ] Check infrastructure metrics
- [ ] Verify external dependencies
- [ ] Review configuration changes

#### Common Investigation Commands

```bash
# Check service status
kubectl get pods -n production
kubectl describe pod <pod-name> -n production

# Check service logs
kubectl logs <pod-name> -n production --tail=100

# Check resource usage
kubectl top pods -n production
kubectl top nodes

# Check database connections
psql -h <host> -U <user> -d <database> -c "SELECT count(*) FROM pg_stat_activity;"

# Check Redis status
redis-cli -h <host> -p <port> ping
redis-cli -h <host> -p <port> info

# Check message queue
rabbitmqctl list_queues
rabbitmqctl list_connections
```

#### Service-Specific Diagnostics

**Authentication Service**
```bash
# Check JWT token validation
curl -H "Authorization: Bearer <token>" http://auth-service/verify-token

# Check database connectivity
curl http://auth-service/health

# Check user login flow
curl -X POST http://auth-service/login -d '{"email":"test@example.com","password":"test"}'
```

**Payment Service**
```bash
# Check payment gateway connectivity
curl http://payment-service/health

# Check recent transactions
curl -H "Authorization: Bearer <token>" http://payment-service/payments?limit=10

# Test payment processing
curl -X POST http://payment-service/payments/test
```

**Ecommerce Service**
```bash
# Check product catalog
curl http://ecommerce-service/products?limit=5

# Check cart functionality
curl -H "Authorization: Bearer <token>" http://ecommerce-service/cart

# Check order processing
curl -H "Authorization: Bearer <token>" http://ecommerce-service/orders?limit=5
```

### 4. Mitigation and Resolution

#### Immediate Mitigation Strategies

**Service Restart**
```bash
# Restart specific service
kubectl rollout restart deployment/<service-name> -n production

# Scale service replicas
kubectl scale deployment/<service-name> --replicas=5 -n production
```

**Traffic Routing**
```bash
# Route traffic away from problematic service
kubectl patch service <service-name> -p '{"spec":{"selector":{"version":"stable"}}}'

# Enable maintenance mode
kubectl apply -f maintenance-mode.yaml
```

**Database Issues**
```bash
# Check database locks
SELECT * FROM pg_locks WHERE NOT granted;

# Kill long-running queries
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active' AND query_start < now() - interval '5 minutes';

# Restart database connection pool
kubectl rollout restart deployment/pgbouncer -n production
```

**Cache Issues**
```bash
# Clear Redis cache
redis-cli -h <host> -p <port> FLUSHALL

# Restart Redis
kubectl rollout restart deployment/redis -n production
```

#### Rollback Procedures

**Application Rollback**
```bash
# Check deployment history
kubectl rollout history deployment/<service-name> -n production

# Rollback to previous version
kubectl rollout undo deployment/<service-name> -n production

# Rollback to specific revision
kubectl rollout undo deployment/<service-name> --to-revision=2 -n production
```

**Database Rollback**
```bash
# Restore from backup
pg_restore -h <host> -U <user> -d <database> <backup-file>

# Run rollback migration
npm run db:migrate:rollback
```

**Configuration Rollback**
```bash
# Revert configuration changes
kubectl apply -f previous-config.yaml

# Restart affected services
kubectl rollout restart deployment/<service-name> -n production
```

### 5. Communication Management

#### Internal Communication

**Incident Channel Setup**
```bash
# Create dedicated Slack channel
/create #incident-2024-001

# Add key stakeholders
/invite @oncall-engineer @team-lead @product-manager
```

**Status Updates Template**
```
📊 INCIDENT UPDATE - SEV [1/2/3/4] - [TIMESTAMP]

Status: [INVESTIGATING/MITIGATING/RESOLVED]
Services Affected: [List]
Current Impact: [Description]

Actions Taken:
- [Action 1]
- [Action 2]

Next Steps:
- [Next action]
- [ETA]

Next Update: [Time]
```

#### External Communication

**Status Page Updates**
```bash
# Update status page
curl -X POST https://api.statuspage.io/v1/pages/<page-id>/incidents \
  -H "Authorization: OAuth <token>" \
  -d '{
    "incident": {
      "name": "Service Degradation",
      "status": "investigating",
      "impact_override": "major"
    }
  }'
```

**Customer Communication Template**
```
We are currently experiencing issues with [service/feature]. 
Our team is actively investigating and working on a resolution. 
We will provide updates every [frequency] until resolved.

Affected Services: [List]
Estimated Resolution: [Time or "Under investigation"]
Workaround: [If available]

We apologize for any inconvenience.
```

### 6. Resolution and Recovery

#### Verification Checklist
- [ ] All services responding to health checks
- [ ] Key user journeys working end-to-end
- [ ] Performance metrics back to normal
- [ ] Error rates back to baseline
- [ ] No alerts firing
- [ ] Customer reports resolved

#### Recovery Validation

**Automated Tests**
```bash
# Run smoke tests
npm run test:smoke

# Run integration tests
npm run test:integration

# Run end-to-end tests
npm run test:e2e:critical
```

**Manual Verification**
- User registration and login
- Product search and purchase
- Ride booking flow
- Hotel booking flow
- Payment processing

### 7. Post-Incident Activities

#### Immediate Post-Incident (0-24 hours)

**Incident Closure**
```
🎉 INCIDENT RESOLVED - SEV [1/2/3/4]

Resolution Time: [Duration]
Root Cause: [Brief description]
Services Affected: [List]

Resolution Summary:
[Brief description of what was done]

Post-Mortem: Scheduled for [Date/Time]
```

**Data Collection**
- Timeline of events
- Actions taken
- Communication log
- Metrics and logs
- Customer impact assessment

#### Post-Mortem Process (24-72 hours)

**Post-Mortem Meeting Agenda**
1. **Timeline Review** (15 minutes)
   - Chronological sequence of events
   - Decision points and actions

2. **Root Cause Analysis** (20 minutes)
   - Technical root cause
   - Contributing factors
   - Why detection was delayed

3. **Response Evaluation** (15 minutes)
   - What went well
   - What could be improved
   - Communication effectiveness

4. **Action Items** (10 minutes)
   - Preventive measures
   - Process improvements
   - Tool enhancements

**Post-Mortem Template**
```markdown
# Post-Mortem: [Incident Title]

## Incident Summary
- **Date**: [Date]
- **Duration**: [Duration]
- **Severity**: [1/2/3/4]
- **Services Affected**: [List]
- **Customer Impact**: [Description]

## Timeline
| Time | Event | Action Taken |
|------|-------|--------------|
| 14:30 | Alert fired | Acknowledged |
| 14:35 | Investigation started | Checked logs |
| 14:45 | Root cause identified | Applied fix |
| 15:00 | Service restored | Verified |

## Root Cause
[Detailed technical explanation]

## Contributing Factors
- [Factor 1]
- [Factor 2]

## What Went Well
- [Positive aspect 1]
- [Positive aspect 2]

## What Could Be Improved
- [Improvement 1]
- [Improvement 2]

## Action Items
| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| [Action 1] | [Name] | [Date] | Open |
| [Action 2] | [Name] | [Date] | Open |

## Lessons Learned
[Key takeaways]
```

## Escalation Procedures

### On-Call Rotation

**Primary On-Call**
- **Role**: First responder
- **Responsibilities**: Initial investigation and mitigation
- **Escalation Time**: 30 minutes for Sev 1, 60 minutes for Sev 2

**Secondary On-Call**
- **Role**: Backup support
- **Responsibilities**: Assist primary, take over if needed
- **Contact**: If primary doesn't respond in 15 minutes

**Management Escalation**
- **Engineering Manager**: For Sev 1 incidents immediately
- **VP Engineering**: For Sev 1 incidents lasting >2 hours
- **CTO**: For Sev 1 incidents lasting >4 hours

### External Escalations

**Cloud Provider**
- **AWS Support**: For infrastructure issues
- **Contact**: Support case or phone
- **SLA**: Based on support plan

**Third-Party Services**
- **Stripe**: For payment processing issues
- **SendGrid**: For email delivery issues
- **Twilio**: For SMS delivery issues

## Tools and Resources

### Incident Management Tools
- **PagerDuty**: Alerting and escalation
- **Slack**: Communication and coordination
- **Jira**: Incident tracking and post-mortem
- **Confluence**: Documentation and runbooks

### Monitoring and Observability
- **Grafana**: Metrics dashboards
- **Kibana**: Log analysis
- **Jaeger**: Distributed tracing
- **DataDog**: APM and infrastructure monitoring

### Access and Credentials
- **VPN**: Required for production access
- **AWS Console**: Infrastructure management
- **Kubernetes**: Service management
- **Database**: Direct database access (emergency only)

## Training and Preparedness

### Regular Drills
- **Monthly**: Incident response simulation
- **Quarterly**: Disaster recovery test
- **Annually**: Full system recovery test

### Training Requirements
- **New Team Members**: Incident response training within 30 days
- **All Engineers**: Annual incident response refresher
- **On-Call Engineers**: Advanced troubleshooting training

### Documentation Maintenance
- **Monthly**: Review and update runbooks
- **Post-Incident**: Update based on lessons learned
- **Quarterly**: Full documentation review

## Metrics and KPIs

### Response Metrics
- **MTTA (Mean Time to Acknowledge)**: <5 minutes
- **MTTI (Mean Time to Investigate)**: <15 minutes
- **MTTR (Mean Time to Resolve)**: <2 hours for Sev 1

### Quality Metrics
- **False Positive Rate**: <10%
- **Escalation Rate**: <20%
- **Customer Satisfaction**: >90%

### Availability Metrics
- **Uptime**: >99.9% for core services
- **Error Rate**: <0.1% for critical paths
- **Response Time**: <200ms for 95th percentile