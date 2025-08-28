# Service Down Runbook

## Alert: ServiceDown

**Severity**: Critical  
**Response Time**: 5 minutes  
**Escalation Time**: 15 minutes  

## Overview
This alert fires when a service is not responding to health checks for more than 1 minute.

## Immediate Actions (0-5 minutes)

### 1. Acknowledge Alert
- Acknowledge in PagerDuty/Slack
- Check which service is down from alert labels

### 2. Quick Assessment
```bash
# Check service status
kubectl get pods -n production -l app=SERVICE_NAME

# Check recent events
kubectl get events -n production --sort-by='.lastTimestamp'

# Check service logs
kubectl logs -f deployment/SERVICE_NAME -n production --tail=100
```

### 3. Check Dependencies
- Verify database connectivity
- Check Redis/cache status
- Verify message queue status
- Check external API dependencies

## Investigation Steps (5-15 minutes)

### 1. Pod Status Analysis
```bash
# Detailed pod information
kubectl describe pod POD_NAME -n production

# Check resource usage
kubectl top pods -n production -l app=SERVICE_NAME

# Check node status
kubectl get nodes
```### 2. 
Common Issues and Solutions

#### Issue: Pod CrashLoopBackOff
```bash
# Check pod logs for errors
kubectl logs POD_NAME -n production --previous

# Common fixes:
# - Resource limits too low
# - Configuration errors
# - Database connection issues
```

#### Issue: ImagePullBackOff
```bash
# Check image availability
kubectl describe pod POD_NAME -n production

# Fix: Update deployment with correct image
kubectl set image deployment/SERVICE_NAME container=NEW_IMAGE -n production
```

#### Issue: Resource Exhaustion
```bash
# Check resource usage
kubectl top nodes
kubectl top pods -n production

# Scale up if needed
kubectl scale deployment SERVICE_NAME --replicas=5 -n production
```

### 3. Database Connectivity
```bash
# Test database connection
kubectl exec -it postgres-pod -n production -- pg_isready

# Check connection pool
kubectl exec -it postgres-pod -n production -- psql -U postgres -c "SELECT * FROM pg_stat_activity;"
```

## Resolution Actions

### 1. Restart Service
```bash
# Rolling restart
kubectl rollout restart deployment/SERVICE_NAME -n production

# Force restart all pods
kubectl delete pods -l app=SERVICE_NAME -n production
```

### 2. Scale Service
```bash
# Increase replicas
kubectl scale deployment SERVICE_NAME --replicas=3 -n production

# Check scaling status
kubectl rollout status deployment/SERVICE_NAME -n production
```

### 3. Rollback if Recent Deployment
```bash
# Check rollout history
kubectl rollout history deployment/SERVICE_NAME -n production

# Rollback to previous version
kubectl rollout undo deployment/SERVICE_NAME -n production
```

## Escalation Criteria
- Service not responding after 15 minutes
- Multiple services affected
- Database or critical infrastructure issues
- Customer-facing impact confirmed

## Post-Resolution
1. Monitor service health for 30 minutes
2. Update incident status
3. Document root cause
4. Schedule post-mortem if needed

## Prevention
- Implement proper health checks
- Set appropriate resource limits
- Use circuit breakers
- Monitor dependencies
- Regular load testing