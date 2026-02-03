
# Make Duplicate Lead Check Category-Specific

## The Problem
Currently, when you upload leads to a new category, the system incorrectly marks them as duplicates if the same name/company combination exists in ANY category. The duplicate validation should only check for uniqueness **within the same category**.

## Changes Required

### 1. CSV Upload Duplicate Check (`src/components/LeadUpload.tsx`)

**Query existing leads with category filter (around line 341-344):**
- Add `.eq("category", csvCategory)` to the Supabase query so it only fetches leads from the same category

**Update comparison key (around line 350-351):**
- Since the database query is now filtered by category, the comparison will automatically be category-specific

### 2. Manual Entry Duplicate Check (`src/components/LeadUpload.tsx`)

**Update the duplicate check query (around line 144-150):**
- Add `.eq("category", formData.category)` to the query to check duplicates only within the selected category

### 3. Update Error Messages
- Update the "No New Leads" message to clarify it's within the specific category
- Update the "Duplicate Lead" toast to mention the category

## Technical Details

| Location | Current Behavior | New Behavior |
|----------|------------------|--------------|
| CSV upload query (line 341-344) | Queries all leads for user | Queries leads for user + specific category |
| Manual entry query (line 144-150) | Queries all leads for user | Queries leads for user + specific category |
| Comparison logic | full_name + company | full_name + company (within category) |

## Result
- Users can upload the same leads to different categories (e.g., "Vehicles" and "Marketing")
- Duplicate check only applies within each category
- Same person at same company can exist in multiple categories as different lead records
