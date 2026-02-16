import sys
import re
import os

os.chdir('backend/src/help')
sys.stdout.reconfigure(encoding='utf-8')

# Read intermediate file
with open('help-embedding.service.ts.tmp', 'r', encoding='utf-8') as f:
    content = f.read()

# Read the properly formatted server methods from the backup directory
# We'll construct them inline with proper escaping

