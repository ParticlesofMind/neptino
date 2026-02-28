-- Migration: Update Atlas domains to ISCED-F 2013 classification
-- This converts all custom domains to official UNESCO ISCED domains.

-- Update domains to match ISCED-F 2013 broad fields
UPDATE encyclopedia_items
SET domain = CASE domain
  -- Natural sciences mapping
  WHEN 'Natural Sciences' THEN 'Natural sciences, mathematics and statistics'
  WHEN 'Environmental Sciences' THEN 'Natural sciences, mathematics and statistics'
  
  -- Arts and humanities mapping
  WHEN 'Arts & Creative Expression' THEN 'Arts and humanities'
  WHEN 'Philosophy & Thought' THEN 'Arts and humanities'
  
  -- Engineering mapping
  WHEN 'Engineering & Technology' THEN 'Engineering, manufacturing and construction'
  
  -- ICT mapping
  WHEN 'Communication' THEN 'Information and Communication Technologies'
  
  -- Social sciences mapping
  WHEN 'Social Sciences' THEN 'Social sciences, journalism and information'
  WHEN 'Peace & Security' THEN 'Social sciences, journalism and information'
  
  -- Business and law mapping
  WHEN 'Governance & Institutions' THEN 'Business, administration and law'
  WHEN 'Economics & Business' THEN 'Business, administration and law'
  
  -- Health mapping
  WHEN 'Medical & Health Sciences' THEN 'Health and welfare'
  
  -- Exploration generally maps to natural sciences or social sciences depending on context
  -- Since we have no specific context, map to natural sciences
  WHEN 'Exploration & Discovery' THEN 'Natural sciences, mathematics and statistics'
  
  -- Keep any already-correct ISCED domains
  WHEN 'Education' THEN 'Education'
  WHEN 'Information and Communication Technologies' THEN 'Information and Communication Technologies'
  WHEN 'Agriculture, forestry, fisheries and veterinary' THEN 'Agriculture, forestry, fisheries and veterinary'
  WHEN 'Services' THEN 'Services'
  
  ELSE domain
END
WHERE domain IS NOT NULL;

-- Update secondary_domains array to ISCED classification
UPDATE encyclopedia_items
SET secondary_domains = (
  SELECT array_agg(DISTINCT mapped_domain)
  FROM unnest(secondary_domains) AS original_domain
  CROSS JOIN LATERAL (
    SELECT CASE original_domain
      -- Natural sciences mapping
      WHEN 'Natural Sciences' THEN 'Natural sciences, mathematics and statistics'
      WHEN 'Environmental Sciences' THEN 'Natural sciences, mathematics and statistics'
      
      -- Arts and humanities mapping
      WHEN 'Arts & Creative Expression' THEN 'Arts and humanities'
      WHEN 'Philosophy & Thought' THEN 'Arts and humanities'
      
      -- Engineering mapping
      WHEN 'Engineering & Technology' THEN 'Engineering, manufacturing and construction'
      
      -- ICT mapping
      WHEN 'Communication' THEN 'Information and Communication Technologies'
      
      -- Social sciences mapping
      WHEN 'Social Sciences' THEN 'Social sciences, journalism and information'
      WHEN 'Peace & Security' THEN 'Social sciences, journalism and information'
      
      -- Business and law mapping
      WHEN 'Governance & Institutions' THEN 'Business, administration and law'
      WHEN 'Economics & Business' THEN 'Business, administration and law'
      
      -- Health mapping
      WHEN 'Medical & Health Sciences' THEN 'Health and welfare'
      
      -- Exploration mapping
      WHEN 'Exploration & Discovery' THEN 'Natural sciences, mathematics and statistics'
      
      -- Keep already-correct ISCED domains
      WHEN 'Education' THEN 'Education'
      WHEN 'Information and Communication Technologies' THEN 'Information and Communication Technologies'
      WHEN 'Agriculture, forestry, fisheries and veterinary' THEN 'Agriculture, forestry, fisheries and veterinary'
      WHEN 'Services' THEN 'Services'
      
      ELSE original_domain
    END AS mapped_domain
  ) AS mapping
)
WHERE secondary_domains IS NOT NULL AND array_length(secondary_domains, 1) > 0;

-- Verify the update with a summary
DO $$
DECLARE
  domain_summary TEXT;
BEGIN
  SELECT string_agg(domain || ' (' || count || ')', ', ')
  INTO domain_summary
  FROM (
    SELECT domain, COUNT(*)::text as count
    FROM encyclopedia_items
    WHERE domain IS NOT NULL
    GROUP BY domain
    ORDER BY domain
  ) domain_counts;
  
  RAISE NOTICE 'ISCED Domain migration complete. Current domains: %', domain_summary;
END $$;
