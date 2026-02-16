SELECT 
  id, 
  "date", 
  description, 
  status, 
  "organizationId", 
  source,
  correlativo
FROM "JournalEntry" 
WHERE "organizationId" = 5 
ORDER BY id DESC 
LIMIT 5;
