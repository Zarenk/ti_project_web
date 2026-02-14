# ADSLab Monitoring and Runbooks

# ADS Lab Overview

This document provides context for contributors working within ADS Lab. It outlines core architectural concepts and operational practices that guide development and maintenance of the system.

## Feature Flags
Feature flags allow conditional enabling of functionality without redeploying code. Flags are configured via environment variables and can be toggled per deployment to facilitate gradual roll‑outs and A/B experimentation.

## Queue Operations
The system uses [BullMQ](https://docs.bullmq.io/) to manage asynchronous jobs. Queues handle tasks such as asset generation and publishing. Jobs are retried with backoff strategies and include dead‑letter queues to capture failures for later inspection.

## Provider Adapters
Publishing targets rely on provider adapters that abstract external services. Each adapter implements a common interface to upload or distribute assets. The `PublishAdapter` enum defines available implementations like local stubs or third‑party APIs, enabling easy extension.

## Security Practices
Security is enforced through JWT‑based authentication, role‑based authorization, and HTTPS for all external communication. Sensitive secrets reside in environment variables and are never committed to source control. Dependencies are kept current to mitigate known vulnerabilities.

## Service Level Objectives (SLOs)
The platform aims for 99.9% availability of core APIs and targets sub‑second response times for read operations. Background job completion is monitored, and alerts trigger if error rates exceed thresholds or if queues back up beyond acceptable limits.

## Data Retention
Operational logs and generated assets are retained for 30 days in storage before being purged. Aggregated metrics and anonymized audit information may be kept longer for analytics, but personal data is removed in accordance with privacy regulations.

## Service Level Objective
- **SLO:** 99% of generate jobs are ready within 60 seconds.
- **Alert thresholds:**
  - Warning when readiness falls below 97%.
  - Critical when readiness falls below 95%.

These thresholds are configured in `backend/adslab-slo.json` and applied when `ADSLAB_ENABLED=true`.

## Alerting Setup
1. Set the environment variable `ADSLAB_ENABLED=true` on the backend service.
2. Deploy with the SLO configuration file present at `backend/adslab-slo.json`.
3. Monitoring hooks are initialised at startup and log the active SLO and alert thresholds.

## Runbooks
### Pause a Queue
1. Log in to the message-queue console.
2. Select the `generate` queue.
3. Choose **Pause** to stop processing new jobs.

### Resume a Queue
1. In the console, select the paused `generate` queue.
2. Choose **Resume** to restart normal processing.

### Drain the Dead-Letter Queue (DLQ)
1. Locate the `generate` queue's DLQ.
2. Review messages for recoverability.
3. Requeue valid messages to the main queue or delete irrecoverable ones.
4. Monitor queue depth to confirm it drains to zero.

## Notes
All ADSLab features are gated behind the `ADSLAB_ENABLED` environment variable to ensure existing APIs remain unaffected.