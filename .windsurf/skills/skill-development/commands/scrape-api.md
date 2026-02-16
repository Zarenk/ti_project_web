# Scrape API

Generate a skill from API documentation URL.

---

## Command Usage

`/scrape-api <docs-url> [skill-name]`

- With name: `/scrape-api https://api.example.com/docs my-api`
- Auto-detect name: `/scrape-api https://api.example.com/docs`

---

## Your Task

Use the `api-doc-scraper` agent to scrape API documentation and generate a skill.

### Step 1: Parse Input

Extract from command:
- `docs_url`: The documentation URL
- `skill_name`: Provided name or derive from URL

If no skill name provided, derive from URL:
```
https://rocketdotnet.readme.io/ → rocket-net-api
https://api.elevenlabs.io/docs → elevenlabs-api
https://developers.facebook.com/docs/whatsapp → whatsapp-api
```

### Step 2: Validate URL

Check the URL is accessible:
```
WebFetch(url: "[docs_url]", prompt: "Is this a valid API documentation page? What API is it for?")
```

If invalid or not API docs:
```
⚠️  This doesn't appear to be API documentation.

URL: [docs_url]
Found: [what was found instead]

Please provide a direct link to the API reference/documentation.
```

### Step 3: Launch Scraper Agent

```
Task(
  subagent_type: "api-doc-scraper",
  prompt: """
Scrape API documentation and generate a skill.

docs_url: [docs_url]
skill_name: [skill_name]
output_dir: skills/[skill_name]/

Follow the full workflow:
1. Recon - understand docs structure
2. Extract - get all endpoints, auth, examples
3. Generate - create skill files
4. Report - summarize what was created
"""
)
```

### Step 4: Verify Output

After agent completes:

```bash
# Check skill was created
ls -la skills/[skill_name]/

# Generate plugin manifest
./scripts/generate-plugin-manifests.sh [skill_name]
```

### Step 5: Report to User

```
═══════════════════════════════════════════════
   API SKILL CREATED
═══════════════════════════════════════════════

Skill: [skill_name]
Source: [docs_url]

Files:
  skills/[skill_name]/
  ├── SKILL.md
  ├── README.md
  └── references/
      ├── endpoints.md
      └── auth.md

Endpoints: [count]

Test with:
  /plugin install ./skills/[skill_name]

Review and edit:
  code skills/[skill_name]/SKILL.md

═══════════════════════════════════════════════
```

---

## Error Handling

**If scraping fails:**
```
⚠️  Scraping failed

URL: [url]
Error: [error details]

The site may:
- Require JavaScript (trying Playwright fallback...)
- Block automated requests
- Require authentication

Would you like to:
1. Try with Playwright (browser automation)
2. Provide authentication details
3. Try a different docs URL
4. Create skill manually

Your choice [1-4]:
```

---

## Examples

```
/scrape-api https://rocketdotnet.readme.io/
→ Creates skills/rocket-net-api/

/scrape-api https://developers.facebook.com/docs/whatsapp/api whatsapp-business
→ Creates skills/whatsapp-business/

/scrape-api https://api.slack.com/methods slack-api
→ Creates skills/slack-api/
```

---

**Version**: 1.0.0
**Last Updated**: 2026-02-03
