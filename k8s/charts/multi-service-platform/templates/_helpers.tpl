{{/*
Expand the name of the chart.
*/}}
{{- define "multi-service-platform.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "multi-service-platform.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "multi-service-platform.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "multi-service-platform.labels" -}}
helm.sh/chart: {{ include "multi-service-platform.chart" . }}
{{ include "multi-service-platform.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: {{ include "multi-service-platform.name" . }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "multi-service-platform.selectorLabels" -}}
app.kubernetes.io/name: {{ include "multi-service-platform.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "multi-service-platform.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "multi-service-platform.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Generate service template
*/}}
{{- define "multi-service-platform.service" -}}
{{- $serviceName := .serviceName -}}
{{- $serviceConfig := .serviceConfig -}}
{{- $global := .global -}}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ $serviceName }}
  namespace: {{ $global.Values.namespace }}
  labels:
    app: {{ $serviceName }}
    app.kubernetes.io/name: {{ $serviceName }}
    app.kubernetes.io/component: {{ $serviceConfig.component | default "service" }}
    version: v1
    {{- include "multi-service-platform.labels" $global | nindent 4 }}
spec:
  replicas: {{ $serviceConfig.replicaCount }}
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: {{ if gt ($serviceConfig.replicaCount | int) 2 }}2{{ else }}1{{ end }}
  selector:
    matchLabels:
      app: {{ $serviceName }}
  template:
    metadata:
      labels:
        app: {{ $serviceName }}
        app.kubernetes.io/name: {{ $serviceName }}
        version: v1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: {{ $serviceConfig.service.port | quote }}
        prometheus.io/path: "/metrics"
        {{- if $serviceConfig.podAnnotations }}
        {{- toYaml $serviceConfig.podAnnotations | nindent 8 }}
        {{- end }}
    spec:
      serviceAccountName: {{ include "multi-service-platform.serviceAccountName" $global }}
      containers:
      - name: {{ $serviceName }}
        image: "{{ $serviceConfig.image.repository }}:{{ $serviceConfig.image.tag | default $global.Chart.AppVersion }}"
        imagePullPolicy: {{ $serviceConfig.image.pullPolicy }}
        ports:
        - containerPort: {{ $serviceConfig.service.port }}
          name: http
          protocol: TCP
        env:
        - name: PORT
          value: {{ $serviceConfig.service.port | quote }}
        - name: SERVICE_NAME
          value: {{ $serviceName | quote }}
        envFrom:
        - configMapRef:
            name: platform-config
        - secretRef:
            name: platform-secrets
        resources:
          {{- toYaml $serviceConfig.resources | nindent 10 }}
        livenessProbe:
          httpGet:
            path: /health
            port: {{ $serviceConfig.service.port }}
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: {{ $serviceConfig.service.port }}
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        securityContext:
          runAsNonRoot: true
          runAsUser: 1000
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        {{- if $serviceConfig.persistence }}
        {{- if $serviceConfig.persistence.enabled }}
        - name: {{ $serviceName }}-data
          mountPath: {{ $serviceConfig.persistence.mountPath }}
        {{- end }}
        {{- end }}
      volumes:
      - name: tmp
        emptyDir: {}
      {{- if $serviceConfig.persistence }}
      {{- if $serviceConfig.persistence.enabled }}
      - name: {{ $serviceName }}-data
        persistentVolumeClaim:
          claimName: {{ $serviceName }}-pvc
      {{- end }}
      {{- end }}
      {{- with $global.Values.global.imagePullSecrets }}
      imagePullSecrets:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with $global.Values.nodeSelector }}
      nodeSelector:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with $global.Values.affinity }}
      affinity:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with $global.Values.tolerations }}
      tolerations:
        {{- toYaml . | nindent 8 }}
      {{- end }}
---
apiVersion: v1
kind: Service
metadata:
  name: {{ $serviceName }}
  namespace: {{ $global.Values.namespace }}
  labels:
    app: {{ $serviceName }}
    app.kubernetes.io/name: {{ $serviceName }}
    app.kubernetes.io/component: {{ $serviceConfig.component | default "service" }}
    {{- include "multi-service-platform.labels" $global | nindent 4 }}
spec:
  selector:
    app: {{ $serviceName }}
  ports:
  - port: {{ $serviceConfig.service.port }}
    targetPort: {{ $serviceConfig.service.port }}
    protocol: TCP
    name: http
  type: {{ $serviceConfig.service.type }}
{{- if $serviceConfig.autoscaling.enabled }}
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ $serviceName }}-hpa
  namespace: {{ $global.Values.namespace }}
  labels:
    app: {{ $serviceName }}
    app.kubernetes.io/name: {{ $serviceName }}
    app.kubernetes.io/component: autoscaler
    {{- include "multi-service-platform.labels" $global | nindent 4 }}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ $serviceName }}
  minReplicas: {{ $serviceConfig.autoscaling.minReplicas }}
  maxReplicas: {{ $serviceConfig.autoscaling.maxReplicas }}
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: {{ $serviceConfig.autoscaling.targetCPUUtilizationPercentage }}
  {{- if $serviceConfig.autoscaling.targetMemoryUtilizationPercentage }}
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: {{ $serviceConfig.autoscaling.targetMemoryUtilizationPercentage }}
  {{- end }}
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
{{- end }}
{{- if $serviceConfig.persistence }}
{{- if $serviceConfig.persistence.enabled }}
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: {{ $serviceName }}-pvc
  namespace: {{ $global.Values.namespace }}
  labels:
    app: {{ $serviceName }}
    app.kubernetes.io/name: {{ $serviceName }}
    app.kubernetes.io/component: storage
    {{- include "multi-service-platform.labels" $global | nindent 4 }}
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: {{ $serviceConfig.persistence.size }}
  {{- if $global.Values.global.storageClass }}
  storageClassName: {{ $global.Values.global.storageClass }}
  {{- end }}
{{- end }}
{{- end }}
{{- end }}