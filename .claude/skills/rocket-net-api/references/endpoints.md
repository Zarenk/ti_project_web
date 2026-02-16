# Rocket.net API Endpoints Reference

Complete list of all 200+ API endpoints organized by category.

**Base URL**: `https://api.rocket.net/v1`
**Documentation**: https://rocketdotnet.readme.io/reference/introduction

## Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | `/login` | Authenticate user and generate JWT token |

## Billing

| Method | Path | Description |
|--------|------|-------------|
| GET | `/billing/addresses` | List Billing Addresses |
| POST | `/billing/addresses` | Create Billing Address |
| GET | `/billing/addresses/{address_id}` | Get Billing Address |
| PATCH | `/billing/addresses/{address_id}` | Update Billing Address |
| DELETE | `/billing/addresses/{address_id}` | Delete Billing Address |
| GET | `/billing/invoices` | List Invoices |
| GET | `/billing/emails` | List Billing Emails |
| GET | `/billing/invoices/{invoice_id}` | Get Invoice |
| GET | `/billing/emails/{email_id}` | Get Billing Email |
| POST | `/billing/invoices/{invoice_id}/credit_card_payment` | Record a Credit Card Payment |
| PATCH | `/billing/invoices/{invoice_id}/paypal_subscription` | Update a PayPal Subscription |
| POST | `/billing/invoices/{invoice_id}/paypal_subscription` | Create a PayPal Subscription |
| GET | `/billing/invoices/{invoice_id}/pdf` | Download Invoice PDF |
| GET | `/billing/payment_methods` | List Payment Methods |
| POST | `/billing/payment_methods` | Add Credit Card |
| GET | `/billing/payment_methods/{method_id}` | Get Payment Method |
| DELETE | `/billing/payment_methods/{method_id}` | Delete Payment Method |
| PATCH | `/billing/payment_methods/{method_id}` | Update Payment Method |
| POST | `/billing/payment_methods/credit_card_setup_intent` | Create Credit Card Setup Intent |
| GET | `/billing/products` | List Available Products |

## Sites

| Method | Path | Description |
|--------|------|-------------|
| GET | `/sites` | List sites |
| POST | `/sites` | Create new site |
| GET | `/sites/{id}` | Get information about site from system |
| DELETE | `/sites/{id}` | Delete site from system |
| PATCH | `/sites/{id}` | Update site properties |
| POST | `/sites/{id}/access_token` | Generate token valid for accessing site operations |
| GET | `/sites/all_locations` | List Site locations (including restricted) |
| POST | `/sites/{id}/clone` | Clone a site (via background task) |
| GET | `/sites/{id}/credentials` | Get password and username for site |
| GET | `/sites/locations` | List Site locations |
| POST | `/sites/{id}/lock` | Lock a site so that no modifications can be made |
| DELETE | `/sites/{id}/lock` | Unlock a site so that modifications can be made again |
| GET | `/sites/{id}/pma_login` | Get SSO link for phpMyAdmin account |
| GET | `/sites/{id}/settings` | Get site settings |
| PATCH | `/sites/{id}/settings` | Update site settings |
| POST | `/sites/{id}/staging` | Create new staging site for given site (via background task) |
| GET | `/sites/{id}/settings/schema` | Get schema of all possible settings for the site |
| DELETE | `/sites/{id}/staging` | Delete staging site for given site |
| POST | `/sites/{id}/staging/publish` | Publish staging site as an active site (via background task) |
| GET | `/sites/{id}/tasks` | List Site Tasks |
| POST | `/sites/{id}/tasks/{task_id}/cancel` | Mark Site Task as Cancelled |
| GET | `/sites/{id}/usage` | Get site usage |

## Site Templates

| Method | Path | Description |
|--------|------|-------------|
| POST | `/site_templates/task` | Create new site template |
| GET | `/sites/templates` | List Site Templates |
| POST | `/sites/templates` | [Deprecated]: Create new site template |
| GET | `/sites/templates/{id}` | Get Site Templates |
| DELETE | `/sites/templates/{id}` | Delete Site Templates |
| POST | `/sites/templates/{id}/sites` | Create new site from a site template |

## Domains

| Method | Path | Description |
|--------|------|-------------|
| GET | `/sites/{id}/domains` | List additional domains (aliases) for the site |
| POST | `/sites/{id}/domains` | Create additional domain |
| DELETE | `/sites/{id}/domains/{domain_id}` | Delete additional domain |
| GET | `/sites/{id}/domains/{domain_id}/edge_settings` | Get additional domain Edge Settings |
| PATCH | `/sites/{id}/domains/{domain_id}/edge_settings` | Update additional domain Edge Settings |
| GET | `/sites/{id}/maindomain` | Get site main domain info |
| POST | `/sites/{id}/maindomain` | Set a domain for a Site |
| PATCH | `/sites/{id}/maindomain` | Update maindomain validation method or SSL CA |
| PUT | `/sites/{id}/maindomain` | Replace current maindomain with different one |
| GET | `/sites/{id}/maindomain/edge_settings` | Get Maindomain Edge Settings |
| PATCH | `/sites/{id}/maindomain/edge_settings` | Update Maindomain Edge Settings |
| PATCH | `/sites/{id}/maindomain/prefix` | Change existing prefix for domain |
| GET | `/sites/{id}/maindomain/recheck` | Force validation status recheck |
| GET | `/sites/{id}/maindomain/status` | Checks the status of the maindomain, any alternate maindomains, and additional domains |

## CDN Cache

| Method | Path | Description |
|--------|------|-------------|
| POST | `/sites/{id}/cache/purge` | Purge files from cache on cloudflare |
| POST | `/sites/{id}/cache/purge_everything` | Purge all files from single domain from cache on cloudflare |

## FTP Accounts

| Method | Path | Description |
|--------|------|-------------|
| GET | `/sites/{id}/ftp_accounts` | List Ftp Accounts |
| POST | `/sites/{id}/ftp_accounts` | Create new ftp account |
| PATCH | `/sites/{id}/ftp_accounts` | Update ftp account |
| DELETE | `/sites/{id}/ftp_accounts` | Delete ftp account |

## Plugins

| Method | Path | Description |
|--------|------|-------------|
| GET | `/sites/{id}/featured_plugins` | List available featured plugins |
| GET | `/sites/{id}/plugins` | List installed WordPress plugins on account |
| POST | `/sites/{id}/plugins` | Install new WordPress plugins to site |
| PATCH | `/sites/{id}/plugins` | Activate or deactivate WordPress plugins on given site |
| PUT | `/sites/{id}/plugins` | Update WordPress plugins on given site |
| DELETE | `/sites/{id}/plugins` | Delete WordPress plugins from given site |
| POST | `/sites/{id}/plugins/rocket_cdn_cache_management` | Install / re-install the Rocket CDN Cache Management plugin |
| GET | `/sites/{id}/plugins/search` | Search for WordPress plugins that can be installed |

## Themes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/sites/{id}/themes` | List installed Wordpress themes on account |
| POST | `/sites/{id}/themes` | Install new WordPress themes to site |
| PATCH | `/sites/{id}/themes` | Activate or deactivate WordPress themes on given site |
| PUT | `/sites/{id}/themes` | Update WordPress themes on given site |
| DELETE | `/sites/{id}/themes` | Delete WordPress theme from site |
| GET | `/sites/{id}/themes/search` | Search for WordPress themes that can be installed |

## Reporting

| Method | Path | Description |
|--------|------|-------------|
| GET | `/reporting/sites/{id}/cdn_requests` | Retrieve CDN requests report |
| GET | `/reporting/sites/{id}/cdn_cache_status` | Retrieve CDN cache-status report |
| GET | `/reporting/sites/{id}/cdn_cache_content` | Retrieve CDN cache-content report |
| GET | `/reporting/sites/{id}/cdn_cache_top` | [Deprecated] Retrieve cdn cache-top report |
| GET | `/reporting/sites/{id}/visitors` | Retrieve cdn visitors report |
| GET | `/reporting/sites/{id}/waf_eventlist` | List WAF Events |
| GET | `/reporting/sites/{id}/waf_events_source` | Retrieve WAF events source report |
| GET | `/reporting/sites/{id}/waf_firewall_events` | Retrieve WAF firewall events report |
| GET | `/reporting/sites/{id}/waf_events_services` | Retrieve WAF events services report |
| GET | `/reporting/sites/{id}/waf_events_time` | Retrieve WAF events time report |
| GET | `/reporting/sites/{id}/waf_events` | [Deprecated]: List WAF Events |
| GET | `/reporting/sites/{id}/bandwidth_top_usage` | Get top usage bandwidth report |
| GET | `/reporting/sites/{id}/bandwidth_usage` | Get usage bandwidth report |
| GET | `/sites/{id}/access_logs` | List Access Logs |
| GET | `/sites/{id}/reporting/cdn_request_volume_by_source` | CDN Request Volume by Source |
| GET | `/sites/{id}/reporting/total_requests` | Total requests from all sources |

## SSH Keys

| Method | Path | Description |
|--------|------|-------------|
| GET | `/sites/{id}/ssh_keys` | List SSH keys for given site |
| POST | `/sites/{id}/ssh_keys` | Import an ssh key for a site |
| DELETE | `/sites/{id}/ssh_keys` | Delete SSH key for given site |
| POST | `/sites/{id}/ssh_keys/authorize` | Activate SSH key for given site |
| POST | `/sites/{id}/ssh_keys/deauthorize` | Deactivate SSH key for given site |
| GET | `/sites/{id}/ssh_keys/{name}` | View SSH key info for given site |

## Visitors

| Method | Path | Description |
|--------|------|-------------|
| GET | `/account/visitors` | Get unique visitors statistics for user account |
| GET | `/sites/{id}/visitors` | Get unique visitors statistics for given site |

## Bandwidth

| Method | Path | Description |
|--------|------|-------------|
| GET | `/account/bandwidth` | Get bandwidth usage statistics for user account |
| GET | `/sites/{id}/reporting/bandwidth` | Get bandwidth usage statistics for given site |

## Backups

| Method | Path | Description |
|--------|------|-------------|
| POST | `/sites/{id}/backup` | Create a new backup for given site |
| GET | `/sites/{id}/backup` | Get a list of backups for site |
| GET | `/sites/{id}/backup/{backup_id}` | Download given backup for site |
| DELETE | `/sites/{id}/backup/{backup_id}` | Delete given backup for site from the system |
| POST | `/sites/{id}/backup/{backup_id}/restore` | Restore a backup for given site (via background task) |
| GET | `/sites/{id}/backup/automated` | List automated backups |
| POST | `/sites/{id}/backup/automated/{restore_id}/restore` | Restore existing automated restore point (via background task) |
| POST | `/sites/{id}/backup/automated/{restore_id}/restore_database` | Restore existing automated restore point database |
| POST | `/sites/{id}/backup/automated/{restore_id}/restore_files` | Restore existing automated restore point files |

## Cloud Backups

| Method | Path | Description |
|--------|------|-------------|
| GET | `/sites/{id}/cloud_backups` | List cloud backups |
| POST | `/sites/{id}/cloud_backups` | Create a new cloud backup |
| GET | `/sites/{id}/cloud_backups/{backup_id}` | Get a cloud backup |
| DELETE | `/sites/{id}/cloud_backups/{backup_id}` | Delete a cloud backup |
| GET | `/sites/{id}/cloud_backups/{backup_id}/download` | Get Cloud Backup Download Link |
| POST | `/sites/{id}/cloud_backups/{backup_id}/restore` | Restore cloud backup / Create new site from backup |

## Files

| Method | Path | Description |
|--------|------|-------------|
| GET | `/sites/{id}/file_manager/files` | List Site Files |
| GET | `/sites/{id}/files` | [Deprecated] List files in a site installation |
| POST | `/sites/{id}/files` | Upload a file to the site installation |
| PUT | `/sites/{id}/files` | Save contents of a file to the site installation |
| DELETE | `/sites/{id}/files` | Delete file from a site installation |
| POST | `/sites/{id}/files/extract` | Extract a file |
| POST | `/sites/{id}/files/compress` | Compress files or folders |
| PATCH | `/sites/{id}/files/chmod` | Change file permissions |
| GET | `/sites/{id}/files/download` | Download contents of a given file |
| POST | `/sites/{id}/files/folder` | Create folder in a site installation |
| GET | `/sites/{id}/files/view` | View contents of a given file |

## Account

| Method | Path | Description |
|--------|------|-------------|
| POST | `/account/request_cancel` | Request that your Rocket.net account be cancelled |
| GET | `/account/hosting_plan` | Get Current Hosting Plan |
| PUT | `/account/hosting_plan` | Change Account's Hosting Plan |
| POST | `/account/hosting_plan` | Set Hosting Plan |
| GET | `/account/me` | Get user information |
| PATCH | `/account/me` | Update user account settings |
| GET | `/account/usage` | Get unique usage statistics for user account |
| POST | `/account/billing_sso` | Get a cookie to allow for access to billing data |
| POST | `/account/password` | Set a new password for your account |
| GET | `/account/tasks` | Get a list of account level tasks |

## Activity

| Method | Path | Description |
|--------|------|-------------|
| POST | `/sites/{id}/activity/disable` | Stops events logging |
| POST | `/sites/{id}/activity/enable` | Starts events logging |
| POST | `/sites/{id}/activity/events` | Insert new event into system |
| GET | `/sites/{id}/activity/events` | List Activity Events |
| GET | `/sites/{id}/activity/events/{event_id}` | Get event for a site installation with event id |
| DELETE | `/sites/{id}/activity/events/{event_id}` | Delete event from a site installation |

## Site Users

| Method | Path | Description |
|--------|------|-------------|
| GET | `/sites/{id}/users` | List all the site users for a Site |
| POST | `/sites/{id}/users` | Send invite to site user |
| GET | `/sites/{id}/users/accept` | Accept invite to site |
| POST | `/sites/{id}/users/accept` | Accept invite to site |
| DELETE | `/sites/{id}/users/{user_id}` | Remove site access for site user |
| POST | `/sites/{id}/users/{user_id}/reinvite` | Send re-invite to site user |
| POST | `/sites/users` | Create new site user |
| GET | `/sites/users` | List all the site for user |
| POST | `/sites/users/login` | Login as a site user |
| POST | `/sites/users/reset_password` | Reset password for the site user |
| PATCH | `/sites/users/{user_id}` | Update site user |
| POST | `/sites/users/{user_id}/password` | Create or update password for the site user |

## Password Protection

| Method | Path | Description |
|--------|------|-------------|
| GET | `/sites/{id}/password_protection` | Get site password protection status |
| POST | `/sites/{id}/password_protection` | Enable site password protection |
| DELETE | `/sites/{id}/password_protection` | Disable site password protection |
| GET | `/sites/{id}/password_protection/users` | List site password protection users |
| POST | `/sites/{id}/password_protection/users` | Add site password protection user |
| DELETE | `/sites/{id}/password_protection/users/{user_id}` | Remove site password protection user |

## Password Strength

| Method | Path | Description |
|--------|------|-------------|
| POST | `/password_strength` | Check strength of the given password |

## Account Users

| Method | Path | Description |
|--------|------|-------------|
| POST | `/users` | Create new user who can access your Rocket.net account |
| GET | `/users` | List all users in your account |
| DELETE | `/users/{user_id}` | Remove a User from your account |
| GET | `/users/{user_id}` | Get information about a specific user in your account |
| PATCH | `/users/{user_id}` | Update user |
| POST | `/users/{user_id}/password` | Create first time password for the Account User |
| POST | `/users/{user_id}/reinvite` | Re-send invite email to User |
| GET | `/users/accept` | Accept an invitation to help manage a Rocket.net account |

## ShopShield

| Method | Path | Description |
|--------|------|-------------|
| GET | `/sites/{id}/shopshield` | List ShopShield URIs for a site |
| POST | `/sites/{id}/shopshield` | Enable ShopShield for a URI |
| DELETE | `/sites/{id}/shopshield/{id}` | Disable ShopShield for a URI |
| GET | `/sites/{id}/shopshield/{id}` | Get ShopShield URI Details |

## WordPress

| Method | Path | Description |
|--------|------|-------------|
| POST | `/sites/{id}/cli` | Execute cli command on wp installation ([Deprecated]) |
| GET | `/sites/{id}/wp_login` | Get SSO link for wordpress account |
| GET | `/sites/{id}/wp_status` | Get Status of WordPress for the site |
| POST | `/sites/{id}/wpcli` | Execute wp cli command on site |
