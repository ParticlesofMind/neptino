-- Fix incorrect Wikidata mapping for Apollo 11 test entry.
-- Previous value Q1868 points to Paul Otlet.

UPDATE encyclopedia_items
SET wikidata_id = 'Q43653'
WHERE id = 'test-apollo-11';
