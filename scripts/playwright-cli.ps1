param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Args
)

$ErrorActionPreference = 'Stop'

# Run Playwright CLI via npx (no global install needed)
& npx --yes --package @playwright/cli playwright-cli @Args
