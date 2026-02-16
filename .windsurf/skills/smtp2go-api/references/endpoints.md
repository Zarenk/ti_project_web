# SMTP2GO API Endpoints Reference

Complete reference of all SMTP2GO API v3 endpoints.

## Base URLs

| Region | URL |
|--------|-----|
| Global | `https://api.smtp2go.com/v3` |
| US | `https://us-api.smtp2go.com/v3` |
| EU | `https://eu-api.smtp2go.com/v3` |
| AU | `https://au-api.smtp2go.com/v3` |

## Authentication

All requests require API key via header or body:

```
X-Smtp2go-Api-Key: api-XXXXXXXXXXXX
```

Or in request body:
```json
{ "api_key": "api-XXXXXXXXXXXX" }
```

---

## Email Endpoints

### Send Standard Email

**POST** `/email/send`

Send email with individual components.

**Request:**
```json
{
  "sender": "noreply@example.com",
  "to": ["recipient@example.com"],
  "subject": "Subject line",
  "html_body": "<h1>HTML content</h1>",
  "text_body": "Plain text content",
  "cc": ["cc@example.com"],
  "bcc": ["bcc@example.com"],
  "reply_to": "reply@example.com",
  "custom_headers": [
    { "header": "X-Custom", "value": "value" }
  ],
  "attachments": [
    {
      "filename": "file.pdf",
      "mimetype": "application/pdf",
      "fileblob": "base64-encoded-content"
    }
  ],
  "inlines": [
    {
      "filename": "logo.png",
      "mimetype": "image/png",
      "fileblob": "base64-encoded-content",
      "cid": "logo-cid"
    }
  ],
  "template_id": "template-uuid",
  "template_data": {
    "variable1": "value1"
  },
  "subaccount_id": "subaccount-uuid"
}
```

**Response (200):**
```json
{
  "request_id": "aa253464-0bd0-467a-b24b-6159dcd7be60",
  "data": {
    "succeeded": 1,
    "failed": 0,
    "failures": [],
    "email_id": "1er8bV-6Tw0Mi-7h"
  }
}
```

**Limits:**
- Max 100 recipients per To/CC/BCC field
- Max 50 MB total email size

---

### Send MIME Email

**POST** `/email/mime`

Send pre-encoded MIME message.

**Request:**
```json
{
  "mime_email": "MIME-encoded-string"
}
```

---

### Search Sent Emails (Deprecated)

**POST** `/email/search`

**Note:** Deprecated - use `/activity/search` instead.

Rate limit: 20/min

---

### Search Scheduled Emails

**POST** `/email/scheduled`

Search for scheduled emails.

---

### Remove Scheduled Email

**POST** `/email/scheduled/remove`

Cancel a scheduled email.

---

## Template Endpoints

### Add Template

**POST** `/template/add`

```json
{
  "template_name": "welcome-email",
  "html_body": "<h1>Welcome {{ name }}</h1>",
  "text_body": "Welcome {{ name }}"
}
```

### Edit Template

**POST** `/template/edit`

```json
{
  "template_id": "template-uuid",
  "template_name": "updated-name",
  "html_body": "<h1>Updated content</h1>"
}
```

### Delete Template

**POST** `/template/delete`

```json
{
  "template_id": "template-uuid"
}
```

### Search Templates

**POST** `/template/search`

```json
{
  "query": "welcome"
}
```

### View Template

**POST** `/template/view`

```json
{
  "template_id": "template-uuid"
}
```

---

## Webhook Endpoints

### View Webhooks

**POST** `/webhook/view`

Returns all configured webhooks.

### Add Webhook

**POST** `/webhook/add`

```json
{
  "url": "https://api.example.com/webhooks/smtp2go",
  "events": ["delivered", "bounce", "spam", "unsubscribe", "open", "click"]
}
```

### Edit Webhook

**POST** `/webhook/edit`

```json
{
  "webhook_id": "webhook-uuid",
  "url": "https://new-url.example.com/webhook",
  "events": ["delivered", "bounce"]
}
```

### Remove Webhook

**POST** `/webhook/remove`

```json
{
  "webhook_id": "webhook-uuid"
}
```

---

## Statistics Endpoints

### Email Summary

**POST** `/stats/email_summary`

Combined report: bounces + cycles + spam + unsubscribes.

```json
{}
```

### Email Bounces

**POST** `/stats/email_bounces`

Bounce summary for last 30 days.

### Email Cycle

**POST** `/stats/email_cycle`

Email cycle statistics.

### Email History

**POST** `/stats/email_history`

Historical email data.

### Email Spam

**POST** `/stats/email_spam`

Spam report statistics.

### Email Unsubscribes

**POST** `/stats/email_unsubs`

Unsubscribe statistics.

---

## Activity Endpoints

### Search Activity

**POST** `/activity/search`

Search for email events (opens, clicks, bounces, etc.).

**Rate limit:** 60 requests/min
**Max results:** 1,000

```json
{
  "start_date": "2026-01-01",
  "end_date": "2026-01-31",
  "event_type": "delivered"
}
```

---

## Suppression Endpoints

### Add Suppression

**POST** `/suppression/add`

```json
{
  "email": "blocked@example.com"
}
```

Or suppress entire domain:
```json
{
  "domain": "blocked-domain.com"
}
```

### View Suppressions

**POST** `/suppression/view`

List suppressed addresses.

### Remove Suppression

**POST** `/suppression/remove`

```json
{
  "email": "unblocked@example.com"
}
```

---

## SMS Endpoints

### Send SMS

**POST** `/sms/send`

```json
{
  "to": ["+61400000000"],
  "message": "Your verification code is 123456"
}
```

**Limits:** Max 100 phone numbers per request.

### View Received SMS

**POST** `/sms/received`

### View Sent SMS

**POST** `/sms/sent`

### SMS Summary

**POST** `/sms/summary`

---

## Sender Domain Endpoints

### Add Sender Domain

**POST** `/domain/add`

```json
{
  "domain": "example.com"
}
```

### Verify Sender Domain

**POST** `/domain/verify`

```json
{
  "domain": "example.com"
}
```

### View Sender Domains

**POST** `/domain/view`

### Remove Sender Domain

**POST** `/domain/remove`

### Edit Tracking Subdomain

**POST** `/domain/tracking`

### Edit Return-Path Subdomain

**POST** `/domain/returnpath`

---

## Single Sender Email Endpoints

### Add Single Sender

**POST** `/sender/add`

```json
{
  "email": "noreply@example.com"
}
```

### View Single Senders

**POST** `/sender/view`

### Remove Single Sender

**POST** `/sender/remove`

---

## SMTP User Endpoints

### Add SMTP User

**POST** `/smtp/add`

### Edit SMTP User

**POST** `/smtp/edit`

### Patch SMTP User

**PATCH** `/smtp/patch`

### Remove SMTP User

**POST** `/smtp/remove`

### View SMTP Users

**POST** `/smtp/view`

---

## API Key Endpoints

### View API Keys

**POST** `/api_keys/view`

### Add API Key

**POST** `/api_keys/add`

### Edit API Key

**POST** `/api_keys/edit`

### Patch API Key

**PATCH** `/api_keys/patch`

### Remove API Key

**POST** `/api_keys/remove`

### View Permissions

**POST** `/api_keys/permissions`

---

## Subaccount Endpoints

### Add Subaccount

**POST** `/subaccount/add`

### Update Subaccount

**POST** `/subaccount/update`

### Search Subaccounts

**POST** `/subaccount/search`

### Close Subaccount

**POST** `/subaccount/close`

### Reopen Subaccount

**POST** `/subaccount/reopen`

### Resend Invitation

**POST** `/subaccount/resend_invite`

---

## Allowed Senders/Recipients Endpoints

### Add Allowed Senders

**POST** `/allowed_senders/add`

### Update Allowed Senders

**POST** `/allowed_senders/update`

### View Allowed Senders

**POST** `/allowed_senders/view`

### Remove Allowed Senders

**POST** `/allowed_senders/remove`

### Add Allowed Recipients

**POST** `/allowed_recipients/add`

### Update Allowed Recipients

**POST** `/allowed_recipients/update`

### View Allowed Recipients

**POST** `/allowed_recipients/view`

### Remove Allowed Recipients

**POST** `/allowed_recipients/remove`

---

## Email Archive Endpoints

### Search Archived Emails

**POST** `/archive/search`

### View Archived Email

**POST** `/archive/view`

---

## IP Allowlist Endpoints

### View IP Allowlist

**POST** `/ip_allowlist/view`

### Add IP Allowlist

**POST** `/ip_allowlist/add`

### Edit IP Allowlist

**POST** `/ip_allowlist/edit`

### Remove IP Allowlist

**POST** `/ip_allowlist/remove`

---

## IP Auth Endpoints

### View IP Auth

**POST** `/ip_auth/view`

### Patch IP Auth

**PATCH** `/ip_auth/patch`

### Remove IP Auth

**POST** `/ip_auth/remove`

---

## Dedicated IP Endpoints

### View Dedicated IPs

**POST** `/dedicated_ips/view`

---

## Response Codes

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Success |
| 400 | Bad Request | Invalid parameters |
| 401 | Unauthorized | Invalid/missing API key |
| 402 | Request Failed | Valid params, request failed |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limited |
| 500-504 | Server Error | SMTP2GO server issue |

---

## Webhook Event Payloads

### Email Events

**Delivered:**
```json
{
  "event": "delivered",
  "time": "2026-02-06T10:30:00Z",
  "sendtime": "2026-02-06T10:29:55Z",
  "sender": "noreply@example.com",
  "from_address": "noreply@example.com",
  "rcpt": "user@recipient.com",
  "recipients": ["user@recipient.com"],
  "email_id": "1er8bV-6Tw0Mi-7h",
  "subject": "Order Confirmation"
}
```

**Bounce:**
```json
{
  "event": "bounce",
  "bounce": "hard",
  "rcpt": "invalid@example.com",
  "email_id": "1er8bV-6Tw0Mi-7h"
}
```

**Open:**
```json
{
  "event": "open",
  "rcpt": "user@example.com",
  "client": "Gmail",
  "geoip-country": "AU"
}
```

**Click:**
```json
{
  "event": "click",
  "rcpt": "user@example.com",
  "url": "https://example.com/clicked-link"
}
```

### SMS Events

**Delivered:**
```json
{
  "event": "delivered",
  "destination_number": "+61400000000",
  "message_id": "msg-uuid",
  "status_code": "delivered"
}
```

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| `/activity/search` | 60/min |
| `/email/search` | 20/min (deprecated) |
| Other endpoints | Configurable per API key |

---

**Last Updated:** 2026-02-06
**API Version:** v3.0.3
**Source:** [SMTP2GO Developer Documentation](https://developers.smtp2go.com/)
