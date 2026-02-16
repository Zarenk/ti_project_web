# Validation Rules Reference

Complete reference for all validation rules available in YAML test specs.

## String Matching

### `contains`

Check if response contains a substring.

```yaml
expect:
  contains: "expected text"
```

**Case sensitive**: Yes
**Use for**: Verifying key content is present

### `not_contains`

Check that response does NOT contain a substring.

```yaml
expect:
  not_contains: "error"
  not_contains: "failed"
```

**Use for**: Ensuring errors or unwanted content absent

### `matches`

Match against a regular expression pattern.

```yaml
expect:
  matches: "\\d{4}-\\d{2}-\\d{2}"  # Date format YYYY-MM-DD
  matches: "after:\\d{4}"          # Year in query
```

**Note**: Escape backslashes in YAML (`\\d` not `\d`)
**Use for**: Pattern validation, date formats, IDs

### `equals`

Exact value match (string or primitive).

```yaml
expect:
  equals: "success"
  equals: 42
  equals: true
```

**Use for**: Status codes, boolean flags, exact values

## Status Checking

### `status`

Check if operation succeeded or failed.

```yaml
expect:
  status: success  # Operation completed without error
  status: error    # Operation returned an error
```

**Values**: `success`, `error`
**Use for**: Basic operation validation

## JSON Structure

### `json_path`

Extract and validate a value at a JSON path.

```yaml
expect:
  json_path: "$.results[0].name"
  contains: "expected"
```

**Syntax**: JSONPath expressions
**Common patterns**:
- `$.field` - Top-level field
- `$.nested.field` - Nested field
- `$.array[0]` - First array element
- `$.array[*]` - All array elements
- `$.array[?(@.active)]` - Filtered elements

**Use for**: Validating specific fields in JSON responses

### `type`

Check the JavaScript type of a value.

```yaml
expect:
  type: array
  type: object
  type: string
  type: number
  type: boolean
```

**Values**: `array`, `object`, `string`, `number`, `boolean`, `null`
**Use for**: Response structure validation

## Array Validation

### `count_gte`

Check array has at least N elements.

```yaml
expect:
  count_gte: 1   # At least 1 result
  count_gte: 10  # At least 10 results
```

**Use for**: Ensuring results returned, minimum counts

### `count_eq`

Check array has exactly N elements.

```yaml
expect:
  count_eq: 5   # Exactly 5 results
  count_eq: 0   # Empty array
```

**Use for**: Pagination tests, exact counts

## Combining Rules

Multiple rules can be combined in a single expect block:

```yaml
expect:
  status: success
  type: array
  count_gte: 1
  not_contains: "error"
```

All rules must pass for the test to pass.

## Examples by Use Case

### API Response Validation

```yaml
- name: get_user_by_id
  params: { action: get, id: "123" }
  expect:
    status: success
    json_path: "$.user.id"
    equals: "123"
```

### Search Results

```yaml
- name: search_returns_results
  params: { action: search, query: "test" }
  expect:
    status: success
    type: array
    count_gte: 1
```

### Error Handling

```yaml
- name: invalid_id_returns_error
  params: { action: get, id: "invalid" }
  expect:
    status: error
    contains: "not found"
```

### Date Format

```yaml
- name: dates_formatted_correctly
  params: { action: list }
  expect:
    json_path: "$.items[0].created_at"
    matches: "\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}"
```

### Empty State

```yaml
- name: empty_search_returns_empty_array
  params: { action: search, query: "xyznonexistent" }
  expect:
    status: success
    type: array
    count_eq: 0
```

## Rule Evaluation Order

1. `status` - Checked first (fail fast on errors)
2. `type` - Structural validation
3. `json_path` - Extract value if specified
4. `count_gte` / `count_eq` - Array length
5. `contains` / `not_contains` / `matches` / `equals` - Content validation

## Custom Rules

For complex validation, agents can implement custom rules:

```yaml
expect:
  custom: "validate_email_format"
```

The testing agent interprets custom rules based on implementation.
