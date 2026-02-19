-- Migration: Seed encyclopedia test data
-- Safe to re-run: only touches rows prefixed with test- IDs.

DELETE FROM encyclopedia_media
WHERE id LIKE 'test-media-%';

DELETE FROM encyclopedia_items
WHERE id LIKE 'test-%';

INSERT INTO encyclopedia_items (
  id,
  wikidata_id,
  title,
  knowledge_type,
  domain,
  secondary_domains,
  era_group,
  era_label,
  depth,
  summary,
  tags,
  metadata
)
VALUES
  (
    'test-marie-curie',
    'Q7186',
    'Marie Curie',
    'Person',
    'Natural Sciences',
    ARRAY['Medical & Health Sciences'],
    'modern',
    '19th–20th century',
    'foundation',
    'Pioneered research on radioactivity and won Nobel Prizes in physics and chemistry.',
    ARRAY['radioactivity', 'chemistry', 'physics'],
    '{"birthYear": 1867, "deathYear": 1934}'::jsonb
  ),
  (
    'test-leonardo-da-vinci',
    'Q762',
    'Leonardo da Vinci',
    'Person',
    'Arts & Creative Expression',
    ARRAY['Engineering & Technology', 'Natural Sciences'],
    'early-modern',
    '1452–1519',
    'foundation',
    'Renaissance polymath known for major works in painting, engineering, and anatomy.',
    ARRAY['renaissance', 'art', 'invention'],
    '{"birthYear": 1452, "deathYear": 1519}'::jsonb
  ),
  (
    'test-french-revolution',
    'Q6534',
    'French Revolution',
    'Event',
    'Governance & Institutions',
    ARRAY['Social Sciences', 'Philosophy & Thought'],
    'modern',
    '1789–1799',
    'foundation',
    'Political and social upheaval in France that reshaped modern governance and rights discourse.',
    ARRAY['revolution', 'democracy', 'rights'],
    '{"startYear": 1789, "endYear": 1799}'::jsonb
  ),
  (
    'test-apollo-11',
    'Q1868',
    'Apollo 11 Moon Landing',
    'Event',
    'Exploration & Discovery',
    ARRAY['Engineering & Technology'],
    'contemporary',
    '1969',
    'foundation',
    'First crewed lunar landing mission, marking a major milestone in space exploration.',
    ARRAY['space', 'nasa', 'moon'],
    '{"date": "1969-07-20"}'::jsonb
  ),
  (
    'test-machu-picchu',
    'Q243',
    'Machu Picchu',
    'Location',
    'Exploration & Discovery',
    ARRAY['Governance & Institutions'],
    'early-modern',
    '15th century',
    'foundation',
    'Incan citadel in Peru known for architecture, astronomy alignments, and mountain setting.',
    ARRAY['inca', 'peru', 'archaeology'],
    '{"country": "Peru"}'::jsonb
  ),
  (
    'test-theory-of-relativity',
    'Q2145308',
    'Theory of Relativity',
    'Concept / Theory',
    'Natural Sciences',
    ARRAY['Mathematics & Logic'],
    'modern',
    '20th century',
    'intermediate',
    'Framework describing space, time, gravity, and high-speed motion developed by Einstein.',
    ARRAY['physics', 'spacetime', 'einstein'],
    '{"field": "Physics"}'::jsonb
  ),
  (
    'test-printing-press',
    'Q11016',
    'Printing Press',
    'Invention / Technology',
    'Engineering & Technology',
    ARRAY['Language & Communication'],
    'early-modern',
    '15th century',
    'foundation',
    'Movable-type printing accelerated literacy, publishing, and spread of ideas in Europe.',
    ARRAY['invention', 'publishing', 'literacy'],
    '{"inventionYear": 1440}'::jsonb
  ),
  (
    'test-principia-mathematica',
    'Q225252',
    'Philosophiæ Naturalis Principia Mathematica',
    'Work',
    'Natural Sciences',
    ARRAY['Mathematics & Logic'],
    'early-modern',
    '1687',
    'advanced',
    'Newton''s foundational work formalizing laws of motion and universal gravitation.',
    ARRAY['newton', 'mechanics', 'gravitation'],
    '{"author": "Isaac Newton", "publicationYear": 1687}'::jsonb
  ),
  (
    'test-royal-society',
    'Q123885',
    'Royal Society',
    'Institution',
    'Natural Sciences',
    ARRAY['Governance & Institutions'],
    'early-modern',
    'Founded 1660',
    'foundation',
    'One of the oldest scientific academies, promoting peer review and scientific exchange.',
    ARRAY['science', 'academy', 'research'],
    '{"foundedYear": 1660, "headquarters": "London"}'::jsonb
  ),
  (
    'test-enlightenment',
    'Q81845',
    'The Enlightenment',
    'Movement / School',
    'Philosophy & Thought',
    ARRAY['Governance & Institutions'],
    'early-modern',
    '17th–18th century',
    'foundation',
    'Intellectual movement emphasizing reason, empiricism, and individual liberty.',
    ARRAY['reason', 'philosophy', 'rights'],
    '{"startYear": 1650, "endYear": 1800}'::jsonb
  ),
  (
    'test-classical-antiquity',
    'Q486761',
    'Classical Antiquity',
    'Era / Period',
    'Governance & Institutions',
    ARRAY['Philosophy & Thought', 'Arts & Creative Expression'],
    'ancient',
    '8th century BCE to 6th century CE',
    'foundation',
    'Historical period centered on Greek and Roman civilizations and their enduring influence.',
    ARRAY['greece', 'rome', 'antiquity'],
    '{"startYear": -800, "endYear": 600}'::jsonb
  ),
  (
    'test-democracy',
    'Q7174',
    'Democracy',
    'Concept / Theory',
    'Governance & Institutions',
    ARRAY['Social Sciences', 'Philosophy & Thought'],
    'ancient',
    'From classical period to present',
    'foundation',
    'System of governance in which political authority is grounded in citizen participation.',
    ARRAY['government', 'citizenship', 'elections'],
    '{"origin": "Ancient Greece"}'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  wikidata_id = EXCLUDED.wikidata_id,
  title = EXCLUDED.title,
  knowledge_type = EXCLUDED.knowledge_type,
  domain = EXCLUDED.domain,
  secondary_domains = EXCLUDED.secondary_domains,
  era_group = EXCLUDED.era_group,
  era_label = EXCLUDED.era_label,
  depth = EXCLUDED.depth,
  summary = EXCLUDED.summary,
  tags = EXCLUDED.tags,
  metadata = EXCLUDED.metadata;

INSERT INTO encyclopedia_media (
  id,
  item_id,
  media_type,
  title,
  description,
  url,
  metadata
)
VALUES
  (
    'test-media-marie-curie-compendium',
    'test-marie-curie',
    'Compendium',
    'Marie Curie Quick Compendium',
    'Teacher-friendly summary sheet with milestones and discussion prompts.',
    'https://example.com/encyclopedia/marie-curie/compendium',
    '{}'::jsonb
  ),
  (
    'test-media-marie-curie-timeline',
    'test-marie-curie',
    'Timeline',
    'Marie Curie Timeline',
    'Chronological highlights from education to Nobel achievements.',
    'https://example.com/encyclopedia/marie-curie/timeline',
    '{}'::jsonb
  ),
  (
    'test-media-leonardo-video',
    'test-leonardo-da-vinci',
    'Video',
    'Leonardo: Art and Engineering',
    'Short documentary excerpt connecting art to early engineering design.',
    'https://example.com/encyclopedia/leonardo/video',
    '{}'::jsonb
  ),
  (
    'test-media-french-revolution-text',
    'test-french-revolution',
    'Text',
    'French Revolution Primary Source Pack',
    'Curated declarations and classroom analysis guide.',
    'https://example.com/encyclopedia/french-revolution/text',
    '{}'::jsonb
  ),
  (
    'test-media-apollo-maps',
    'test-apollo-11',
    'Maps',
    'Apollo 11 Mission Map',
    'Interactive map of mission stages and lunar landing site.',
    'https://example.com/encyclopedia/apollo-11/maps',
    '{}'::jsonb
  ),
  (
    'test-media-machu-picchu-3d',
    'test-machu-picchu',
    '3D Model',
    'Machu Picchu 3D Site Model',
    'Overview model for architecture and topography exploration.',
    'https://example.com/encyclopedia/machu-picchu/3d',
    '{}'::jsonb
  ),
  (
    'test-media-relativity-compendium',
    'test-theory-of-relativity',
    'Compendium',
    'Relativity Foundations',
    'Visual explainer of core relativity ideas for intermediate learners.',
    'https://example.com/encyclopedia/relativity/compendium',
    '{}'::jsonb
  ),
  (
    'test-media-printing-press-audio',
    'test-printing-press',
    'Audio',
    'Printing Press in Context',
    'Narrated episode on historical diffusion of print culture.',
    'https://example.com/encyclopedia/printing-press/audio',
    '{}'::jsonb
  ),
  (
    'test-media-principia-text',
    'test-principia-mathematica',
    'Text',
    'Principia Reading Guide',
    'Annotated excerpts with modern notation references.',
    'https://example.com/encyclopedia/principia/text',
    '{}'::jsonb
  ),
  (
    'test-media-royal-society-video',
    'test-royal-society',
    'Video',
    'Royal Society and Scientific Institutions',
    'Institutional history and modern impact mini-lecture.',
    'https://example.com/encyclopedia/royal-society/video',
    '{}'::jsonb
  ),
  (
    'test-media-enlightenment-compendium',
    'test-enlightenment',
    'Compendium',
    'Enlightenment Thinkers Overview',
    'Cross-linked profiles and idea map for major thinkers.',
    'https://example.com/encyclopedia/enlightenment/compendium',
    '{}'::jsonb
  ),
  (
    'test-media-classical-antiquity-timeline',
    'test-classical-antiquity',
    'Timeline',
    'Classical Antiquity Timeline',
    'Major political and cultural milestones across Greek and Roman periods.',
    'https://example.com/encyclopedia/classical-antiquity/timeline',
    '{}'::jsonb
  ),
  (
    'test-media-democracy-compendium',
    'test-democracy',
    'Compendium',
    'Democracy Concepts Toolkit',
    'Definitions, examples, and comparative governance prompts.',
    'https://example.com/encyclopedia/democracy/compendium',
    '{}'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  item_id = EXCLUDED.item_id,
  media_type = EXCLUDED.media_type,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  url = EXCLUDED.url,
  metadata = EXCLUDED.metadata;
