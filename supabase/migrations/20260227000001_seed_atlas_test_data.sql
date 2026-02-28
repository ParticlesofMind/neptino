-- Migration: Seed Atlas test data with 4-layer knowledge system
-- Safe to re-run: only touches rows prefixed with atlas- IDs.

DELETE FROM encyclopedia_media
WHERE id LIKE 'atlas-%';

DELETE FROM encyclopedia_items
WHERE id LIKE 'atlas-%';

-- ═══════════════════════════════════════════════════════════════════════
-- Layer 1 — ENTITY TYPES (what knowledge is about)
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO encyclopedia_items (
  id,
  wikidata_id,
  title,
  knowledge_type,
  sub_type,
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
  -- ─── Person ────────────────────────────────────────────────────────
  (
    'atlas-marie-curie',
    'Q7186',
    'Marie Curie',
    'Person',
    NULL,
    'Natural sciences, mathematics and statistics',
    ARRAY['Health and welfare'],
    'modern',
    '19th–20th century',
    'foundation',
    'Pioneered research on radioactivity and won Nobel Prizes in physics and chemistry.',
    ARRAY['radioactivity', 'chemistry', 'physics', 'nobel-prize'],
    '{"birthYear": 1867, "deathYear": 1934, "nationality": "Polish-French", "field": "Physics, Chemistry"}'::jsonb
  ),
  (
    'atlas-leonardo-da-vinci',
    'Q762',
    'Leonardo da Vinci',
    'Person',
    NULL,
    'Arts and humanities',
    ARRAY['Engineering, manufacturing and construction', 'Natural sciences, mathematics and statistics'],
    'early-modern',
    '1452–1519',
    'foundation',
    'Renaissance polymath known for major works in painting, engineering, and anatomy.',
    ARRAY['renaissance', 'art', 'invention', 'polymath'],
    '{"birthYear": 1452, "deathYear": 1519, "nationality": "Italian", "field": "Art, Science, Engineering"}'::jsonb
  ),
  
  -- ─── Time (Event subtype) ──────────────────────────────────────────
  (
    'atlas-french-revolution',
    'Q6534',
    'French Revolution',
    'Time',
    'Event',
    'Business, administration and law',
    ARRAY['Social sciences, journalism and information', 'Arts and humanities'],
    'modern',
    '1789–1799',
    'foundation',
    'Political and social upheaval in France that reshaped modern governance and rights discourse.',
    ARRAY['revolution', 'democracy', 'rights', 'france'],
    '{"startYear": 1789, "endYear": 1799, "location": "France"}'::jsonb
  ),
  (
    'atlas-apollo-11',
    'Q1868',
    'Apollo 11 Moon Landing',
    'Time',
    'Event',
    'Natural sciences, mathematics and statistics',
    ARRAY['Engineering, manufacturing and construction'],
    'contemporary',
    '1969',
    'foundation',
    'First crewed lunar landing mission, marking a major milestone in space exploration.',
    ARRAY['space', 'nasa', 'moon', 'exploration'],
    '{"date": "1969-07-20", "location": "Moon", "mission": "Apollo 11"}'::jsonb
  ),
  
  -- ─── Environment (Place subtype) ────────────────────────────────────
  (
    'atlas-machu-picchu',
    'Q243',
    'Machu Picchu',
    'Environment',
    'Place',
    'Arts and humanities',
    ARRAY['Business, administration and law', 'Social sciences, journalism and information'],
    'early-modern',
    '15th century',
    'foundation',
    'Incan citadel in Peru known for architecture, astronomy alignments, and mountain setting.',
    ARRAY['inca', 'peru', 'archaeology', 'unesco'],
    '{"country": "Peru", "elevation": 2430, "built": "c. 1450"}'::jsonb
  ),
  (
    'atlas-amazon-rainforest',
    'Q177567',
    'Amazon Rainforest',
    'Environment',
    'Place',
    'Natural sciences, mathematics and statistics',
    ARRAY['Agriculture, forestry, fisheries and veterinary'],
    'ancient',
    'Prehistoric–present',
    'foundation',
    'Largest tropical rainforest covering much of the Amazon basin, crucial for global biodiversity and climate.',
    ARRAY['rainforest', 'biodiversity', 'climate', 'ecology'],
    '{"area_km2": 5500000, "countries": ["Brazil", "Peru", "Colombia", "Venezuela", "Ecuador", "Bolivia", "Guyana", "Suriname", "French Guiana"]}'::jsonb
  ),
  
  -- ─── Concept (Theory subtype) ──────────────────────────────────────
  (
    'atlas-theory-of-relativity',
    'Q2145308',
    'Theory of Relativity',
    'Concept',
    'Theory',
    'Natural sciences, mathematics and statistics',
    NULL,
    'contemporary',
    '1905–1915',
    'foundation',
    'Einstein''s theory of special and general relativity revolutionized understanding of space, time, and gravity.',
    ARRAY['physics', 'einstein', 'spacetime', 'gravity'],
    '{"author": "Albert Einstein", "yearPublished": 1905}'::jsonb
  ),
  (
    'atlas-evolution',
    'Q2763474',
    'Theory of Evolution',
    'Concept',
    'Theory',
    'Natural sciences, mathematics and statistics',
    NULL,
    'modern',
    '1859',
    'foundation',
    'Darwin''s theory explaining how species change over time through natural selection.',
    ARRAY['biology', 'darwin', 'natural-selection', 'species'],
    '{"author": "Charles Darwin", "yearPublished": 1859, "work": "On the Origin of Species"}'::jsonb
  ),
  
  -- ─── Process ───────────────────────────────────────────────────────
  (
    'atlas-photosynthesis',
    'Q11982',
    'Photosynthesis',
    'Process',
    NULL,
    'Natural sciences, mathematics and statistics',
    NULL,
    'ancient',
    'Prehistoric–present',
    'foundation',
    'Process by which plants and other organisms convert light energy into chemical energy.',
    ARRAY['biology', 'plants', 'energy', 'chlorophyll'],
    '{"formula": "6CO2 + 6H2O + light → C6H12O6 + 6O2"}'::jsonb
  ),
  
  -- ─── Technology ────────────────────────────────────────────────────
  (
    'atlas-printing-press',
    'Q46454',
    'Printing Press',
    'Technology',
    NULL,
    'Engineering, manufacturing and construction',
    ARRAY['Arts and humanities', 'Information and Communication Technologies'],
    'early-modern',
    '1440',
    'foundation',
    'Gutenberg''s invention that revolutionized the spread of information and literacy.',
    ARRAY['gutenberg', 'printing', 'books', 'information'],
    '{"inventor": "Johannes Gutenberg", "year": 1440, "impact": "Information Revolution"}'::jsonb
  ),
  
  -- ─── Work ──────────────────────────────────────────────────────────
  (
    'atlas-mona-lisa',
    'Q12418',
    'Mona Lisa',
    'Work',
    NULL,
    'Arts and humanities',
    NULL,
    'early-modern',
    '1503–1519',
    'foundation',
    'Leonardo da Vinci''s iconic portrait painting housed in the Louvre Museum.',
    ARRAY['painting', 'leonardo', 'renaissance', 'portrait'],
    '{"artist": "Leonardo da Vinci", "year": "1503-1519", "medium": "Oil on poplar", "location": "Louvre Museum"}'::jsonb
  ),
  
  -- ─── Institution ───────────────────────────────────────────────────
  (
    'atlas-united-nations',
    'Q1065',
    'United Nations',
    'Institution',
    NULL,
    'Business, administration and law',
    ARRAY['Social sciences, journalism and information'],
    'contemporary',
    '1945–present',
    'foundation',
    'International organization founded after World War II to promote peace, security, and cooperation.',
    ARRAY['un', 'international', 'peace', 'cooperation'],
    '{"founded": 1945, "headquarters": "New York City", "members": 193}'::jsonb
  ),
  
  -- ─── Movement ──────────────────────────────────────────────────────
  (
    'atlas-enlightenment',
    'Q128593',
    'The Enlightenment',
    'Movement',
    NULL,
    'Arts and humanities',
    ARRAY['Business, administration and law', 'Natural sciences, mathematics and statistics'],
    'early-modern',
    '18th century',
    'foundation',
    'Intellectual and philosophical movement emphasizing reason, science, and individual rights.',
    ARRAY['philosophy', 'reason', 'science', 'rights'],
    '{"period": "17th-18th century", "region": "Europe", "key_figures": ["Voltaire", "Rousseau", "Locke"]}'::jsonb
  );

-- ═══════════════════════════════════════════════════════════════════════
-- Layer 2 — MEDIA TYPES (raw material)
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO encyclopedia_media (
  id,
  item_id,
  media_type,
  layer,
  title,
  description,
  url,
  metadata
)
VALUES
  -- ─── Text ──────────────────────────────────────────────────────────
  (
    'atlas-media-curie-biography',
    'atlas-marie-curie',
    'Text',
    2,
    'Marie Curie Biography',
    'Comprehensive biography covering her life, research, and legacy.',
    'https://example.com/curie-biography.pdf',
    '{"format": "PDF", "pages": 12, "author": "Biography Institute"}'::jsonb
  ),
  (
    'atlas-media-relativity-paper',
    'atlas-theory-of-relativity',
    'Text',
    2,
    'On the Electrodynamics of Moving Bodies',
    'Einstein''s original 1905 special relativity paper.',
    'https://example.com/einstein-relativity-1905.pdf',
    '{"format": "PDF", "year": 1905, "journal": "Annalen der Physik"}'::jsonb
  ),
  
  -- ─── Image ─────────────────────────────────────────────────────────
  (
    'atlas-media-mona-lisa-image',
    'atlas-mona-lisa',
    'Image',
    2,
    'Mona Lisa High-Resolution Image',
    'High-resolution photograph of the Mona Lisa painting.',
    'https://example.com/mona-lisa-hires.jpg',
    '{"resolution": "4000x6000", "format": "JPEG", "source": "Louvre Museum"}'::jsonb
  ),
  (
    'atlas-media-machu-picchu-photo',
    'atlas-machu-picchu',
    'Image',
    2,
    'Machu Picchu Aerial View',
    'Aerial photograph showing the complete citadel layout.',
    'https://example.com/machu-picchu-aerial.jpg',
    '{"resolution": "3000x2000", "format": "JPEG", "year": 2023}'::jsonb
  ),
  
  -- ─── Audio ─────────────────────────────────────────────────────────
  (
    'atlas-media-apollo-11-audio',
    'atlas-apollo-11',
    'Audio',
    2,
    'Apollo 11 Mission Audio',
    'Original NASA mission control audio from the moon landing.',
    'https://example.com/apollo-11-audio.mp3',
    '{"duration_minutes": 180, "format": "MP3", "source": "NASA Archives"}'::jsonb
  ),
  
  -- ─── Video ─────────────────────────────────────────────────────────
  (
    'atlas-media-photosynthesis-video',
    'atlas-photosynthesis',
    'Video',
    2,
    'Photosynthesis Process Animation',
    'Animated explanation of the photosynthesis process at cellular level.',
    'https://example.com/photosynthesis-animation.mp4',
    '{"duration_minutes": 8, "format": "MP4", "resolution": "1080p"}'::jsonb
  ),
  (
    'atlas-media-printing-press-demo',
    'atlas-printing-press',
    'Video',
    2,
    'Historical Printing Press Demonstration',
    'Documentary footage showing a working replica of Gutenberg''s press.',
    'https://example.com/printing-press-demo.mp4',
    '{"duration_minutes": 15, "format": "MP4", "year": 2020}'::jsonb
  ),
  
  -- ─── Dataset ───────────────────────────────────────────────────────
  (
    'atlas-media-amazon-biodiversity',
    'atlas-amazon-rainforest',
    'Dataset',
    2,
    'Amazon Rainforest Species Dataset',
    'Comprehensive dataset of documented species in the Amazon basin.',
    'https://example.com/amazon-species-data.csv',
    '{"format": "CSV", "records": 50000, "updated": "2024"}'::jsonb
  ),
  
  -- ─── 3D Model ──────────────────────────────────────────────────────
  (
    'atlas-media-machu-picchu-3d',
    'atlas-machu-picchu',
    '3D Model',
    2,
    'Machu Picchu 3D Reconstruction',
    '3D model of the Incan citadel based on archaeological surveys.',
    'https://example.com/machu-picchu-3d.gltf',
    '{"format": "GLTF", "polygons": 500000, "textured": true}'::jsonb
  );

-- ═══════════════════════════════════════════════════════════════════════
-- Layer 3 — PRODUCTS (assembled, passive delivery)
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO encyclopedia_media (
  id,
  item_id,
  media_type,
  layer,
  title,
  description,
  url,
  metadata
)
VALUES
  -- ─── Map ───────────────────────────────────────────────────────────
  (
    'atlas-product-french-revolution-map',
    'atlas-french-revolution',
    'Map',
    3,
    'French Revolution: Territory Changes',
    'Interactive map showing territorial changes during the French Revolution.',
    'https://example.com/french-revolution-map',
    '{"derived_from": "Place entities", "interactive": true, "layers": ["1789", "1795", "1799"]}'::jsonb
  ),
  (
    'atlas-product-amazon-map',
    'atlas-amazon-rainforest',
    'Map',
    3,
    'Amazon Rainforest Coverage Map',
    'Spatial visualization of Amazon rainforest coverage and deforestation.',
    'https://example.com/amazon-coverage-map',
    '{"derived_from": "Place entities", "interactive": true, "data_year": 2024}'::jsonb
  ),
  
  -- ─── Timeline ──────────────────────────────────────────────────────
  (
    'atlas-product-apollo-timeline',
    'atlas-apollo-11',
    'Timeline',
    3,
    'Apollo 11 Mission Timeline',
    'Temporal view of key events during the Apollo 11 mission.',
    'https://example.com/apollo-11-timeline',
    '{"derived_from": "Event entities", "interactive": true, "span_hours": 195}'::jsonb
  ),
  (
    'atlas-product-enlightenment-timeline',
    'atlas-enlightenment',
    'Timeline',
    3,
    'Enlightenment Movement Timeline',
    'Chronological view of major events and publications during the Enlightenment.',
    'https://example.com/enlightenment-timeline',
    '{"derived_from": "Event · Period entities", "span_years": 150}'::jsonb
  ),
  
  -- ─── Narrative ─────────────────────────────────────────────────────
  (
    'atlas-product-curie-narrative',
    'atlas-marie-curie',
    'Narrative',
    3,
    'Marie Curie: A Life of Discovery',
    'Comprehensive narrative assembled from text, images, and biographical data.',
    'https://example.com/curie-narrative',
    '{"assembled_from": ["Text", "Image", "Audio"], "chapters": 8}'::jsonb
  ),
  (
    'atlas-product-leonardo-narrative',
    'atlas-leonardo-da-vinci',
    'Narrative',
    3,
    'Leonardo da Vinci: Renaissance Genius',
    'Detailed narrative covering his life, works, and inventions.',
    'https://example.com/leonardo-narrative',
    '{"assembled_from": ["Text", "Image", "3D Model"], "chapters": 12}'::jsonb
  ),
  
  -- ─── Documentary ───────────────────────────────────────────────────
  (
    'atlas-product-evolution-documentary',
    'atlas-evolution',
    'Documentary',
    3,
    'Evolution: Darwin''s Revolutionary Theory',
    'Documentary film assembled from historical footage, interviews, and animations.',
    'https://example.com/evolution-documentary.mp4',
    '{"assembled_from": ["Video", "Image", "Text"], "duration_minutes": 45}'::jsonb
  ),
  
  -- ─── Simulation ────────────────────────────────────────────────────
  (
    'atlas-product-photosynthesis-sim',
    'atlas-photosynthesis',
    'Simulation',
    3,
    'Photosynthesis Process Simulation',
    'Visual simulation showing the photosynthesis process in real-time (passive viewing).',
    'https://example.com/photosynthesis-simulation',
    '{"assembled_from": ["Video", "3D Model", "Dataset"], "loops": true}'::jsonb
  ),
  
  -- ─── Diagram ───────────────────────────────────────────────────────
  (
    'atlas-product-relativity-diagram',
    'atlas-theory-of-relativity',
    'Diagram',
    3,
    'Spacetime Curvature Diagram',
    'Visual diagram explaining spacetime curvature in general relativity.',
    'https://example.com/relativity-diagram.svg',
    '{"assembled_from": ["Image", "Text"], "format": "SVG", "interactive_labels": true}'::jsonb
  ),
  
  -- ─── Profile ───────────────────────────────────────────────────────
  (
    'atlas-product-un-profile',
    'atlas-united-nations',
    'Profile',
    3,
    'United Nations: Organizational Profile',
    'Comprehensive profile of the UN with structure, history, and activities.',
    'https://example.com/un-profile',
    '{"assembled_from": ["Text", "Image", "Dataset"], "sections": ["History", "Structure", "Agencies", "Initiatives"]}'::jsonb
  ),
  
  -- ─── Game (passive) ────────────────────────────────────────────────
  (
    'atlas-product-printing-game',
    'atlas-printing-press',
    'Game',
    3,
    'Printing Press Story Game',
    'Story-driven game about the invention and impact of the printing press (watch-mode).',
    'https://example.com/printing-press-game',
    '{"assembled_from": ["Video", "Image", "Text"], "type": "story", "passive": true}'::jsonb
  );

-- ═══════════════════════════════════════════════════════════════════════
-- Layer 4 — ACTIVITIES (require student response)
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO encyclopedia_media (
  id,
  item_id,
  media_type,
  layer,
  title,
  description,
  url,
  metadata
)
VALUES
  -- ─── Exercise ──────────────────────────────────────────────────────
  (
    'atlas-activity-photosynthesis-ex',
    'atlas-photosynthesis',
    'Exercise',
    4,
    'Photosynthesis Equation Practice',
    'Practice exercises for balancing and understanding the photosynthesis equation.',
    'https://example.com/photosynthesis-exercise',
    '{"problems": 10, "difficulty": "intermediate", "auto_graded": true}'::jsonb
  ),
  (
    'atlas-activity-relativity-ex',
    'atlas-theory-of-relativity',
    'Exercise',
    4,
    'Relativity Problem Set',
    'Problem-solving exercises applying special and general relativity concepts.',
    'https://example.com/relativity-problems',
    '{"problems": 8, "difficulty": "advanced", "requires_calculation": true}'::jsonb
  ),
  
  -- ─── Quiz ──────────────────────────────────────────────────────────
  (
    'atlas-activity-french-revolution-quiz',
    'atlas-french-revolution',
    'Quiz',
    4,
    'French Revolution Knowledge Quiz',
    'Formative assessment quiz covering key events and figures.',
    'https://example.com/french-revolution-quiz',
    '{"questions": 15, "type": "multiple_choice", "time_limit_minutes": 20, "auto_graded": true}'::jsonb
  ),
  (
    'atlas-activity-curie-quiz',
    'atlas-marie-curie',
    'Quiz',
    4,
    'Marie Curie: Life and Discoveries Quiz',
    'Quick quiz on Marie Curie''s life, research, and legacy.',
    'https://example.com/curie-quiz',
    '{"questions": 10, "type": "mixed", "auto_graded": true}'::jsonb
  ),
  
  -- ─── Assessment ────────────────────────────────────────────────────
  (
    'atlas-activity-enlightenment-assess',
    'atlas-enlightenment',
    'Assessment',
    4,
    'Enlightenment Movement Essay Assessment',
    'Summative essay assessment on the Enlightenment''s impact on modern thought.',
    'https://example.com/enlightenment-assessment',
    '{"type": "essay", "word_limit": 1500, "rubric_based": true, "criteria": ["thesis", "evidence", "analysis", "writing"]}'::jsonb
  ),
  (
    'atlas-activity-evolution-assess',
    'atlas-evolution',
    'Assessment',
    4,
    'Theory of Evolution: Research Assessment',
    'Research-based assessment requiring students to analyze evidence for evolution.',
    'https://example.com/evolution-assessment',
    '{"type": "research_project", "rubric_based": true, "peer_review": true}'::jsonb
  ),
  
  -- ─── Interactive Simulation ────────────────────────────────────────
  (
    'atlas-activity-photosynthesis-sim',
    'atlas-photosynthesis',
    'Interactive Simulation',
    4,
    'Interactive Photosynthesis Lab',
    'Students manipulate variables (light, CO2, water) to observe effects on photosynthesis.',
    'https://example.com/photosynthesis-interactive',
    '{"variables": ["light_intensity", "co2_level", "water_availability"], "data_collection": true, "hypothesis_testing": true}'::jsonb
  ),
  (
    'atlas-activity-printing-sim',
    'atlas-printing-press',
    'Interactive Simulation',
    4,
    'Build Your Own Printing Press',
    'Interactive simulation where students design and test a printing press.',
    'https://example.com/printing-press-builder',
    '{"interactive": true, "challenges": 5, "feedback": "real_time"}'::jsonb
  ),
  
  -- ─── Game (active) ─────────────────────────────────────────────────
  (
    'atlas-activity-apollo-game',
    'atlas-apollo-11',
    'Game',
    4,
    'Apollo 11 Mission Control Game',
    'Students take on roles in mission control, making decisions during the Apollo 11 mission.',
    'https://example.com/apollo-mission-game',
    '{"multiplayer": true, "roles": ["Flight Director", "CAPCOM", "EECOM"], "decisions": 20, "scoring": true}'::jsonb
  ),
  (
    'atlas-activity-machu-picchu-game',
    'atlas-machu-picchu',
    'Game',
    4,
    'Machu Picchu Archaeological Challenge',
    'Archaeological challenge game where students excavate and analyze artifacts.',
    'https://example.com/machu-picchu-dig-game',
    '{"type": "puzzle_adventure", "achievements": true, "scoring": true, "difficulty_adaptive": true}'::jsonb
  );
