-- Seed a durable, source-backed Atlas pack for the demo course
-- "Shakespeare in Love: Literature, Film, and Elizabethan Theatre".
--
-- This deliberately enriches Atlas with passive reference material. The
-- canvas remains the active learning sequence; these rows give the Atlas panel
-- entities, source media, and passive products that explain the canvas context.

INSERT INTO public.atlas_sources (
  id,
  label,
  base_url,
  source_rank,
  default_license,
  default_license_url,
  requires_attribution,
  commercial_use_status,
  api_kind,
  notes,
  enabled
)
VALUES
  (
    'folger',
    'Folger Shakespeare Library',
    'https://www.folger.edu',
    'A',
    NULL,
    NULL,
    true,
    'mixed',
    'rest',
    'Authoritative Shakespeare texts, essays, and teaching context. Rights vary by page and asset.',
    true
  ),
  (
    'neptino_curated',
    'Neptino Curated Atlas',
    'https://neptino.local/atlas',
    'B',
    NULL,
    NULL,
    true,
    'mixed',
    'manual',
    'Internally curated products assembled from cited source records for course-context use.',
    true
  )
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  base_url = EXCLUDED.base_url,
  source_rank = EXCLUDED.source_rank,
  default_license = EXCLUDED.default_license,
  default_license_url = EXCLUDED.default_license_url,
  requires_attribution = EXCLUDED.requires_attribution,
  commercial_use_status = EXCLUDED.commercial_use_status,
  api_kind = EXCLUDED.api_kind,
  notes = EXCLUDED.notes,
  enabled = EXCLUDED.enabled,
  updated_at = now();

DELETE FROM public.encyclopedia_media
WHERE item_id IN (
  'demo-christopher-marlowe-person',
  'demo-elizabethan-theatre-concept',
  'demo-london-playhouses-place',
  'demo-romeo-and-juliet-work',
  'demo-shakespeare-in-love-film',
  'demo-shakespeare-person'
);

DELETE FROM public.encyclopedia_items
WHERE id IN (
  'demo-christopher-marlowe-person',
  'demo-elizabethan-theatre-concept',
  'demo-london-playhouses-place',
  'demo-romeo-and-juliet-work',
  'demo-shakespeare-in-love-film',
  'demo-shakespeare-person'
);

INSERT INTO public.encyclopedia_items (
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
  (
    'atlas-shakespeare-william-shakespeare',
    'Q692',
    'William Shakespeare',
    'Person',
    'Author',
    'Arts and humanities',
    ARRAY['Social sciences, journalism and information'],
    'early-modern',
    '1564-1616',
    'foundation',
    'English playwright, poet, and actor whose works anchor early modern English drama and the literary frame of Shakespeare in Love.',
    ARRAY['shakespeare', 'playwright', 'poetry', 'early-modern-drama', 'elizabethan-theatre'],
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "birthYear": 1564,
      "deathYear": 1616,
      "occupation": "Playwright and poet",
      "work_profile": { "forms": ["play", "sonnet", "poem"], "language": "English" },
      "source_summary": {
        "sources": [
          { "source_id": "wikidata", "external_id": "Q692", "url": "https://www.wikidata.org/wiki/Q692", "license": "CC0 1.0" },
          { "source_id": "folger", "url": "https://www.folger.edu/explore/shakespeares-life/" }
        ]
      }
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-shakespeare-in-love',
    'Q182944',
    'Shakespeare in Love',
    'Work',
    'Film',
    'Arts and humanities',
    ARRAY['Social sciences, journalism and information'],
    'contemporary',
    '1998',
    'overview',
    'A 1998 film that imagines Shakespeare composing Romeo and Juliet through a romance, using invented biography to explore theatre, authorship, and genre.',
    ARRAY['film', 'adaptation', 'romeo-and-juliet', 'metatheatre', 'romantic-comedy'],
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "publicationYear": 1998,
      "work_profile": { "medium": "film", "genre": ["romantic comedy", "period drama"], "language": "English" },
      "source_summary": {
        "sources": [
          { "source_id": "wikidata", "external_id": "Q182944", "url": "https://www.wikidata.org/wiki/Q182944", "license": "CC0 1.0" }
        ],
        "rights_note": "Use metadata and criticism only unless separate rights-cleared film materials are added."
      }
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-romeo-and-juliet',
    'Q83186',
    'Romeo and Juliet',
    'Work',
    'Play',
    'Arts and humanities',
    ARRAY['Education'],
    'early-modern',
    '1590s',
    'foundation',
    'A tragedy by William Shakespeare about feuding families and young love; the central literary reference point for Shakespeare in Love.',
    ARRAY['tragedy', 'play', 'love', 'conflict', 'source-text'],
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "publicationYear": 1597,
      "work_profile": { "form": "play", "genre": "tragedy", "language": "English" },
      "source_summary": {
        "sources": [
          { "source_id": "wikidata", "external_id": "Q83186", "url": "https://www.wikidata.org/wiki/Q83186", "license": "CC0 1.0" },
          { "source_id": "project_gutenberg", "url": "https://www.gutenberg.org/ebooks/1513" },
          { "source_id": "folger", "url": "https://www.folger.edu/explore/shakespeares-works/romeo-and-juliet/read/" }
        ]
      }
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-twelfth-night',
    'Q221211',
    'Twelfth Night',
    'Work',
    'Play',
    'Arts and humanities',
    ARRAY['Education'],
    'early-modern',
    'c. 1601-1602',
    'overview',
    'A comedy by William Shakespeare centered on disguise, mistaken identity, performance, and desire.',
    ARRAY['comedy', 'disguise', 'gender', 'performance', 'identity'],
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "publicationYear": 1623,
      "work_profile": { "form": "play", "genre": "comedy", "language": "English" },
      "source_summary": {
        "sources": [
          { "source_id": "wikidata", "external_id": "Q221211", "url": "https://www.wikidata.org/wiki/Q221211", "license": "CC0 1.0" },
          { "source_id": "project_gutenberg", "url": "https://www.gutenberg.org/ebooks/1526" },
          { "source_id": "folger", "url": "https://www.folger.edu/explore/shakespeares-works/twelfth-night/read/" }
        ]
      }
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-elizabeth-i',
    'Q7207',
    'Elizabeth I of England',
    'Person',
    'Political leader',
    'Arts and humanities',
    ARRAY['Business, administration and law', 'Social sciences, journalism and information'],
    'early-modern',
    '1533-1603',
    'overview',
    'Queen of England and Ireland during the cultural and political context in which Shakespeare and the public theatres developed.',
    ARRAY['queen', 'elizabethan', 'monarchy', 'patronage', 'censorship'],
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "birthYear": 1533,
      "deathYear": 1603,
      "occupation": "Monarch",
      "source_summary": {
        "sources": [
          { "source_id": "wikidata", "external_id": "Q7207", "url": "https://www.wikidata.org/wiki/Q7207", "license": "CC0 1.0" },
          { "source_id": "commons", "url": "https://commons.wikimedia.org/wiki/Category:Elizabeth_I_of_England" }
        ]
      }
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-christopher-marlowe',
    'Q28975',
    'Christopher Marlowe',
    'Person',
    'Author',
    'Arts and humanities',
    ARRAY['Social sciences, journalism and information'],
    'early-modern',
    '1564-1593',
    'overview',
    'English dramatist and poet, Shakespeare contemporary, and useful point of comparison for authorship, rivalry, and public theatre culture.',
    ARRAY['marlowe', 'playwright', 'rivalry', 'early-modern-drama'],
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "birthYear": 1564,
      "deathYear": 1593,
      "occupation": "Playwright and poet",
      "source_summary": {
        "sources": [
          { "source_id": "wikidata", "external_id": "Q28975", "url": "https://www.wikidata.org/wiki/Q28975", "license": "CC0 1.0" },
          { "source_id": "project_gutenberg", "url": "https://www.gutenberg.org/ebooks/author/410" }
        ]
      }
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-rose-theatre',
    'Q1120943',
    'The Rose Theatre',
    'Environment',
    'Place',
    'Arts and humanities',
    ARRAY['Social sciences, journalism and information'],
    'early-modern',
    '1587-1606',
    'overview',
    'An Elizabethan playhouse on Bankside, associated with the commercial theatre world dramatized around Shakespeare.',
    ARRAY['playhouse', 'bankside', 'london', 'theatre-space'],
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "foundedYear": 1587,
      "spatial_profile": { "place": "Bankside, London", "map_use": "historical theatre district" },
      "source_summary": {
        "sources": [
          { "source_id": "wikidata", "external_id": "Q1120943", "url": "https://www.wikidata.org/wiki/Q1120943", "license": "CC0 1.0" }
        ]
      }
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-globe-theatre',
    'Q272434',
    'Globe Theatre',
    'Environment',
    'Place',
    'Arts and humanities',
    ARRAY['Social sciences, journalism and information'],
    'early-modern',
    '1599-1644',
    'foundation',
    'The open-air London theatre associated with Shakespeare and the Lord Chamberlain''s Men.',
    ARRAY['globe', 'playhouse', 'bankside', 'performance-space'],
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "foundedYear": 1599,
      "spatial_profile": { "place": "Bankside, London", "map_use": "historical theatre district" },
      "source_summary": {
        "sources": [
          { "source_id": "wikidata", "external_id": "Q272434", "url": "https://www.wikidata.org/wiki/Q272434", "license": "CC0 1.0" },
          { "source_id": "commons", "url": "https://commons.wikimedia.org/wiki/Category:Globe_Theatre" }
        ]
      }
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-lord-chamberlains-men',
    'Q1899451',
    'Lord Chamberlain''s Men',
    'Institution',
    'Organization',
    'Arts and humanities',
    ARRAY['Business, administration and law'],
    'early-modern',
    '1594-1603',
    'overview',
    'English playing company associated with Shakespeare before becoming the King''s Men under James I.',
    ARRAY['playing-company', 'actors', 'patronage', 'shakespeare-company'],
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "foundedYear": 1594,
      "source_summary": {
        "sources": [
          { "source_id": "wikidata", "external_id": "Q1899451", "url": "https://www.wikidata.org/wiki/Q1899451", "license": "CC0 1.0" }
        ]
      }
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-english-renaissance-theatre',
    'Q1134718',
    'English Renaissance theatre',
    'Movement',
    'Art movement',
    'Arts and humanities',
    ARRAY['Education', 'Social sciences, journalism and information'],
    'early-modern',
    '1562-1642',
    'foundation',
    'The theatre culture of England from the mid-sixteenth century to the theatre closures of 1642, including public playhouses, companies, patrons, and print circulation.',
    ARRAY['elizabethan-theatre', 'jacobean-theatre', 'public-theatre', 'performance'],
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "startYear": 1562,
      "endYear": 1642,
      "source_summary": {
        "sources": [
          { "source_id": "wikidata", "external_id": "Q1134718", "url": "https://www.wikidata.org/wiki/Q1134718", "license": "CC0 1.0" }
        ]
      }
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-patronage',
    'Q516590',
    'Patronage',
    'Concept',
    'Definition',
    'Arts and humanities',
    ARRAY['Business, administration and law', 'Social sciences, journalism and information'],
    'early-modern',
    'Early modern',
    'overview',
    'A system of support in which a powerful person or institution protects, funds, or legitimates an artist, company, or work.',
    ARRAY['patron', 'power', 'funding', 'theatre-economy'],
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "source_summary": {
        "sources": [
          { "source_id": "wikidata", "external_id": "Q516590", "url": "https://www.wikidata.org/wiki/Q516590", "license": "CC0 1.0" }
        ]
      }
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-censorship',
    'Q543',
    'Censorship',
    'Concept',
    'Definition',
    'Arts and humanities',
    ARRAY['Business, administration and law', 'Social sciences, journalism and information'],
    'early-modern',
    'Early modern-present',
    'overview',
    'The suppression, licensing, or control of speech and publication; a key context for public theatre and printed drama.',
    ARRAY['licensing', 'control', 'speech', 'publication', 'theatre-regulation'],
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "source_summary": {
        "sources": [
          { "source_id": "wikidata", "external_id": "Q543", "url": "https://www.wikidata.org/wiki/Q543", "license": "CC0 1.0" }
        ]
      }
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-iambic-pentameter',
    'Q2481042',
    'Iambic pentameter',
    'Concept',
    'Definition',
    'Arts and humanities',
    ARRAY['Education'],
    'early-modern',
    'Early modern',
    'foundation',
    'A verse line of five iambic feet, central to much English dramatic and poetic meter.',
    ARRAY['meter', 'verse', 'poetry', 'blank-verse', 'prosody'],
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "source_summary": {
        "sources": [
          { "source_id": "wikidata", "external_id": "Q2481042", "url": "https://www.wikidata.org/wiki/Q2481042", "license": "CC0 1.0" }
        ]
      }
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-sonnet',
    'Q80056',
    'Sonnet',
    'Concept',
    'Definition',
    'Arts and humanities',
    ARRAY['Education'],
    'early-modern',
    'Early modern-present',
    'foundation',
    'A fourteen-line poetic form with structured rhyme and argument, important for Shakespeare''s lyric voice and love poetry.',
    ARRAY['poetry', 'form', 'rhyme', 'argument', 'love-poetry'],
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "source_summary": {
        "sources": [
          { "source_id": "wikidata", "external_id": "Q80056", "url": "https://www.wikidata.org/wiki/Q80056", "license": "CC0 1.0" }
        ]
      }
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-romantic-comedy',
    'Q860626',
    'Romantic comedy',
    'Concept',
    'Definition',
    'Arts and humanities',
    ARRAY['Social sciences, journalism and information'],
    'modern',
    'Modern-contemporary',
    'overview',
    'A comic genre organized around romantic desire, obstacles, misunderstanding, and eventual union or resolution.',
    ARRAY['genre', 'romance', 'comedy', 'film-genre', 'dramatic-form'],
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "source_summary": {
        "sources": [
          { "source_id": "wikidata", "external_id": "Q860626", "url": "https://www.wikidata.org/wiki/Q860626", "license": "CC0 1.0" }
        ]
      }
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-metatheatre',
    'Q3527611',
    'Metatheatre',
    'Concept',
    'Definition',
    'Arts and humanities',
    ARRAY['Education'],
    'modern',
    'Modern-critical term',
    'overview',
    'Theatrical self-awareness: moments when a play or film foregrounds performance, role-playing, audience, or its own constructedness.',
    ARRAY['metatheatre', 'metadrama', 'self-reflexive', 'play-within-a-play', 'performance'],
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "source_summary": {
        "sources": [
          { "source_id": "wikidata", "external_id": "Q3527611", "url": "https://www.wikidata.org/wiki/Q3527611", "license": "CC0 1.0" },
          { "source_id": "wikidata", "external_id": "Q16854678", "url": "https://www.wikidata.org/wiki/Q16854678", "license": "CC0 1.0" }
        ]
      }
    }$$::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  wikidata_id = EXCLUDED.wikidata_id,
  title = EXCLUDED.title,
  knowledge_type = EXCLUDED.knowledge_type,
  sub_type = EXCLUDED.sub_type,
  domain = EXCLUDED.domain,
  secondary_domains = EXCLUDED.secondary_domains,
  era_group = EXCLUDED.era_group,
  era_label = EXCLUDED.era_label,
  depth = EXCLUDED.depth,
  summary = EXCLUDED.summary,
  tags = EXCLUDED.tags,
  metadata = EXCLUDED.metadata;

INSERT INTO public.atlas_source_records (
  source_id,
  external_id,
  external_url,
  record_type,
  title,
  description,
  language,
  license,
  license_url,
  raw_payload
)
SELECT
  'wikidata',
  item.wikidata_id,
  'https://www.wikidata.org/wiki/' || item.wikidata_id,
  'entity',
  item.title,
  item.summary,
  'en',
  'CC0 1.0',
  'https://creativecommons.org/publicdomain/zero/1.0/',
  jsonb_build_object(
    'seed', 'shakespeare-in-love-context',
    'atlas_item_id', item.id,
    'wikidata_id', item.wikidata_id,
    'title', item.title
  )
FROM public.encyclopedia_items item
WHERE item.id LIKE 'atlas-shakespeare-%'
  AND item.wikidata_id IS NOT NULL
ON CONFLICT (source_id, external_id) DO UPDATE SET
  external_url = EXCLUDED.external_url,
  record_type = EXCLUDED.record_type,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  language = EXCLUDED.language,
  license = EXCLUDED.license,
  license_url = EXCLUDED.license_url,
  raw_payload = EXCLUDED.raw_payload,
  retrieved_at = now();

INSERT INTO public.encyclopedia_media (
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
  (
    'atlas-shakespeare-william-shakespeare--chandos-portrait',
    'atlas-shakespeare-william-shakespeare',
    'Image',
    2,
    'Chandos portrait of William Shakespeare',
    'Reference image entry for the best-known portrait traditionally associated with Shakespeare.',
    'https://commons.wikimedia.org/wiki/File:Chandos_portrait_of_William_Shakespeare.jpg',
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "passive": true,
      "source_summary": { "sources": [{ "source_id": "commons", "url": "https://commons.wikimedia.org/wiki/File:Chandos_portrait_of_William_Shakespeare.jpg" }] },
      "teaching_role": "visual reference"
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-william-shakespeare--life-overview',
    'atlas-shakespeare-william-shakespeare',
    'Text',
    2,
    'Shakespeare life overview',
    'Teacher-facing background reading on Shakespeare''s life, authorship, and early modern context.',
    'https://www.folger.edu/explore/shakespeares-life/',
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "passive": true,
      "source_summary": { "sources": [{ "source_id": "folger", "url": "https://www.folger.edu/explore/shakespeares-life/" }] },
      "teaching_role": "further reading"
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-romeo-and-juliet--gutenberg-text',
    'atlas-shakespeare-romeo-and-juliet',
    'Text',
    2,
    'Romeo and Juliet public-domain text',
    'Public-domain edition suitable for text search, excerpt planning, and comparison with performance scenes.',
    'https://www.gutenberg.org/ebooks/1513',
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "passive": true,
      "source_summary": { "sources": [{ "source_id": "project_gutenberg", "url": "https://www.gutenberg.org/ebooks/1513" }] },
      "teaching_role": "source text"
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-romeo-and-juliet--folger-reading-text',
    'atlas-shakespeare-romeo-and-juliet',
    'Text',
    2,
    'Romeo and Juliet reading text',
    'Readable Folger edition for close-reading references and passage preparation.',
    'https://www.folger.edu/explore/shakespeares-works/romeo-and-juliet/read/',
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "passive": true,
      "source_summary": { "sources": [{ "source_id": "folger", "url": "https://www.folger.edu/explore/shakespeares-works/romeo-and-juliet/read/" }] },
      "teaching_role": "source text"
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-twelfth-night--gutenberg-text',
    'atlas-shakespeare-twelfth-night',
    'Text',
    2,
    'Twelfth Night public-domain text',
    'Public-domain edition for connecting disguise, comedy, and performance to Shakespeare in Love.',
    'https://www.gutenberg.org/ebooks/1526',
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "passive": true,
      "source_summary": { "sources": [{ "source_id": "project_gutenberg", "url": "https://www.gutenberg.org/ebooks/1526" }] },
      "teaching_role": "comparative source text"
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-elizabeth-i--commons-gallery',
    'atlas-shakespeare-elizabeth-i',
    'Image',
    2,
    'Elizabeth I image gallery',
    'Rights-varied Wikimedia Commons gallery for portraits and visual context around Elizabethan rule.',
    'https://commons.wikimedia.org/wiki/Category:Elizabeth_I_of_England',
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "passive": true,
      "source_summary": { "sources": [{ "source_id": "commons", "url": "https://commons.wikimedia.org/wiki/Category:Elizabeth_I_of_England" }] },
      "rights_note": "Check individual file licenses before reuse outside reference browsing."
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-christopher-marlowe--public-domain-works',
    'atlas-shakespeare-christopher-marlowe',
    'Text',
    2,
    'Christopher Marlowe public-domain works',
    'Public-domain texts for comparing Marlowe''s dramatic voice and public-theatre context with Shakespeare.',
    'https://www.gutenberg.org/ebooks/author/410',
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "passive": true,
      "source_summary": { "sources": [{ "source_id": "project_gutenberg", "url": "https://www.gutenberg.org/ebooks/author/410" }] },
      "teaching_role": "comparative source text"
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-theatre-sites--place-dataset',
    'atlas-shakespeare-english-renaissance-theatre',
    'Dataset',
    2,
    'London theatre context dataset',
    'Compact place dataset for Bankside theatres, playing companies, and context entities used by the course map products.',
    NULL,
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "passive": true,
      "schema": ["entity_id", "label", "kind", "date_range", "map_role"],
      "rows": [
        { "entity_id": "atlas-shakespeare-rose-theatre", "label": "The Rose Theatre", "kind": "playhouse", "date_range": "1587-1606", "map_role": "theatre site" },
        { "entity_id": "atlas-shakespeare-globe-theatre", "label": "Globe Theatre", "kind": "playhouse", "date_range": "1599-1644", "map_role": "theatre site" },
        { "entity_id": "atlas-shakespeare-lord-chamberlains-men", "label": "Lord Chamberlain's Men", "kind": "playing company", "date_range": "1594-1603", "map_role": "company" }
      ],
      "source_summary": { "sources": [{ "source_id": "wikidata", "url": "https://www.wikidata.org" }] }
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-prosody--meter-reference',
    'atlas-shakespeare-iambic-pentameter',
    'Text',
    2,
    'Iambic pentameter reference note',
    'Concise meter reference for identifying blank verse, stress pattern, and dramatic effect.',
    'https://www.wikidata.org/wiki/Q2481042',
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "passive": true,
      "source_summary": { "sources": [{ "source_id": "wikidata", "external_id": "Q2481042", "url": "https://www.wikidata.org/wiki/Q2481042" }] },
      "teaching_role": "reference note"
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-sonnet--form-reference',
    'atlas-shakespeare-sonnet',
    'Text',
    2,
    'Sonnet form reference note',
    'Concise reference for rhyme, turn, argument, and fourteen-line structure.',
    'https://www.wikidata.org/wiki/Q80056',
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "passive": true,
      "source_summary": { "sources": [{ "source_id": "wikidata", "external_id": "Q80056", "url": "https://www.wikidata.org/wiki/Q80056" }] },
      "teaching_role": "reference note"
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-english-renaissance-theatre--timeline',
    'atlas-shakespeare-english-renaissance-theatre',
    'Timeline',
    3,
    'Elizabethan theatre timeline',
    'Passive timeline connecting Elizabeth I, playhouse growth, Shakespeare''s company, Romeo and Juliet, and the Globe.',
    NULL,
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "passive": true,
      "pedagogical_role": "Instruction",
      "render_payload": {
        "events": [
          { "year": 1558, "label": "Elizabeth I begins reign", "entity_id": "atlas-shakespeare-elizabeth-i" },
          { "year": 1587, "label": "The Rose Theatre opens", "entity_id": "atlas-shakespeare-rose-theatre" },
          { "year": 1594, "label": "Lord Chamberlain's Men form", "entity_id": "atlas-shakespeare-lord-chamberlains-men" },
          { "year": 1597, "label": "Romeo and Juliet appears in print", "entity_id": "atlas-shakespeare-romeo-and-juliet" },
          { "year": 1599, "label": "Globe Theatre opens", "entity_id": "atlas-shakespeare-globe-theatre" },
          { "year": 1603, "label": "Elizabeth I dies; company becomes King's Men", "entity_id": "atlas-shakespeare-elizabeth-i" }
        ]
      },
      "source_summary": { "sources": [{ "source_id": "wikidata", "url": "https://www.wikidata.org" }] }
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-english-renaissance-theatre--bankside-map',
    'atlas-shakespeare-english-renaissance-theatre',
    'Map',
    3,
    'London playhouses and patronage map',
    'Passive map product showing the theatre district as contextual geography for the course canvases.',
    NULL,
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "passive": true,
      "pedagogical_role": "Instruction",
      "render_payload": {
        "map_style": "historical-context",
        "places": [
          { "entity_id": "atlas-shakespeare-rose-theatre", "label": "The Rose Theatre", "role": "playhouse" },
          { "entity_id": "atlas-shakespeare-globe-theatre", "label": "Globe Theatre", "role": "playhouse" }
        ],
        "layers": ["playhouses", "companies", "patrons"]
      },
      "source_summary": { "sources": [{ "source_id": "wikidata", "url": "https://www.wikidata.org" }] }
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-shakespeare-in-love--context-narrative',
    'atlas-shakespeare-shakespeare-in-love',
    'Narrative',
    3,
    'Film as invented biography',
    'Passive explainer on how Shakespeare in Love uses invented biography, romance, and theatre history rather than functioning as factual biography.',
    NULL,
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "passive": true,
      "pedagogical_role": "Instruction",
      "source_summary": { "sources": [{ "source_id": "wikidata", "external_id": "Q182944", "url": "https://www.wikidata.org/wiki/Q182944" }] },
      "sections": ["historical fiction", "romantic comedy", "metatheatre", "authorship"]
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-shakespeare-in-love--play-within-film-diagram',
    'atlas-shakespeare-shakespeare-in-love',
    'Diagram',
    3,
    'Play-within-film structure',
    'Diagram product linking the film plot, Romeo and Juliet composition, theatrical rehearsal, and performance scenes.',
    NULL,
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "passive": true,
      "pedagogical_role": "Instruction",
      "render_payload": {
        "nodes": ["film romance", "Romeo and Juliet", "rehearsal", "performance", "audience"],
        "edges": ["inspires", "reframes", "mirrors", "performs"]
      },
      "source_summary": { "sources": [{ "source_id": "wikidata", "external_id": "Q182944", "url": "https://www.wikidata.org/wiki/Q182944" }] }
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-patronage--system-diagram',
    'atlas-shakespeare-patronage',
    'Diagram',
    3,
    'Patronage, company, and theatre system',
    'Passive systems diagram showing how patrons, playing companies, venues, censorship, and audiences shaped performance.',
    NULL,
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "passive": true,
      "pedagogical_role": "Instruction",
      "render_payload": {
        "nodes": ["patron", "playing company", "playhouse", "censor/licenser", "audience", "playwright"],
        "claims": ["legitimates", "funds", "regulates", "performs", "pays"]
      },
      "source_summary": { "sources": [{ "source_id": "wikidata", "external_id": "Q516590", "url": "https://www.wikidata.org/wiki/Q516590" }] }
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-censorship--context-narrative',
    'atlas-shakespeare-censorship',
    'Narrative',
    3,
    'Censorship and theatre licensing',
    'Passive context card explaining why public theatre, printed drama, authority, and performance were connected.',
    NULL,
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "passive": true,
      "pedagogical_role": "Instruction",
      "source_summary": { "sources": [{ "source_id": "wikidata", "external_id": "Q543", "url": "https://www.wikidata.org/wiki/Q543" }] }
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-romantic-comedy--genre-map',
    'atlas-shakespeare-romantic-comedy',
    'Diagram',
    3,
    'Romantic comedy genre map',
    'Passive genre map for recognizing desire, obstacle, disguise, misunderstanding, and resolution in film and drama.',
    NULL,
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "passive": true,
      "pedagogical_role": "Instruction",
      "render_payload": {
        "features": ["desire", "obstacle", "mistaken identity", "comic delay", "public resolution"],
        "linked_entities": ["atlas-shakespeare-shakespeare-in-love", "atlas-shakespeare-twelfth-night"]
      },
      "source_summary": { "sources": [{ "source_id": "wikidata", "external_id": "Q860626", "url": "https://www.wikidata.org/wiki/Q860626" }] }
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-metatheatre--concept-map',
    'atlas-shakespeare-metatheatre',
    'Diagram',
    3,
    'Metatheatre concept map',
    'Passive concept map for tracking performance within performance, disguise, audience awareness, and self-reference.',
    NULL,
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "passive": true,
      "pedagogical_role": "Instruction",
      "render_payload": {
        "features": ["play within play", "role playing", "audience awareness", "self-reference"],
        "linked_entities": ["atlas-shakespeare-shakespeare-in-love", "atlas-shakespeare-twelfth-night"]
      },
      "source_summary": { "sources": [{ "source_id": "wikidata", "external_id": "Q3527611", "url": "https://www.wikidata.org/wiki/Q3527611" }] }
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-prosody--meter-chart',
    'atlas-shakespeare-iambic-pentameter',
    'Chart',
    3,
    'Blank verse and iambic pentameter guide',
    'Passive chart for seeing unstressed/stressed patterning and why meter matters in performance.',
    NULL,
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "passive": true,
      "pedagogical_role": "Instruction",
      "render_payload": {
        "pattern": "da-DUM da-DUM da-DUM da-DUM da-DUM",
        "terms": ["iamb", "foot", "pentameter", "blank verse"]
      },
      "source_summary": { "sources": [{ "source_id": "wikidata", "external_id": "Q2481042", "url": "https://www.wikidata.org/wiki/Q2481042" }] }
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-sonnet--argument-table',
    'atlas-shakespeare-sonnet',
    'Table',
    3,
    'Sonnet argument structure',
    'Passive table showing proposition, complication, turn, and couplet resolution as an argument pattern.',
    NULL,
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "passive": true,
      "pedagogical_role": "Instruction",
      "render_payload": {
        "columns": ["part", "function"],
        "rows": [
          ["quatrain 1", "opens claim or situation"],
          ["quatrain 2", "complicates or develops"],
          ["quatrain 3", "turns or reframes"],
          ["couplet", "resolves or sharpens"]
        ]
      },
      "source_summary": { "sources": [{ "source_id": "wikidata", "external_id": "Q80056", "url": "https://www.wikidata.org/wiki/Q80056" }] }
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-course--reference-gallery',
    'atlas-shakespeare-english-renaissance-theatre',
    'Gallery',
    3,
    'Course reference gallery',
    'Passive gallery that groups people, works, places, and concepts needed to understand the course canvases.',
    NULL,
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "passive": true,
      "pedagogical_role": "Review",
      "render_payload": {
        "groups": [
          { "label": "People", "entity_ids": ["atlas-shakespeare-william-shakespeare", "atlas-shakespeare-elizabeth-i", "atlas-shakespeare-christopher-marlowe"] },
          { "label": "Works", "entity_ids": ["atlas-shakespeare-shakespeare-in-love", "atlas-shakespeare-romeo-and-juliet", "atlas-shakespeare-twelfth-night"] },
          { "label": "Places and institutions", "entity_ids": ["atlas-shakespeare-rose-theatre", "atlas-shakespeare-globe-theatre", "atlas-shakespeare-lord-chamberlains-men"] },
          { "label": "Concepts", "entity_ids": ["atlas-shakespeare-patronage", "atlas-shakespeare-censorship", "atlas-shakespeare-metatheatre"] }
        ]
      },
      "source_summary": { "sources": [{ "source_id": "neptino_curated", "url": "https://neptino.local/atlas/shakespeare-in-love-context" }] }
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-william-shakespeare--profile',
    'atlas-shakespeare-william-shakespeare',
    'Profile',
    3,
    'William Shakespeare profile',
    'Passive profile card linking biography, authorship, major forms, and the course works.',
    NULL,
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "passive": true,
      "pedagogical_role": "Instruction",
      "render_payload": {
        "sections": ["life", "forms", "companies", "course links"],
        "linked_entities": ["atlas-shakespeare-romeo-and-juliet", "atlas-shakespeare-twelfth-night", "atlas-shakespeare-lord-chamberlains-men"]
      },
      "source_summary": { "sources": [{ "source_id": "wikidata", "external_id": "Q692", "url": "https://www.wikidata.org/wiki/Q692" }] }
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-elizabeth-i--theatre-profile',
    'atlas-shakespeare-elizabeth-i',
    'Profile',
    3,
    'Elizabeth I and theatre context profile',
    'Passive profile card connecting Elizabethan rule, court culture, patronage, and public performance.',
    NULL,
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "passive": true,
      "pedagogical_role": "Instruction",
      "render_payload": {
        "sections": ["reign", "patronage", "censorship", "public culture"],
        "linked_entities": ["atlas-shakespeare-patronage", "atlas-shakespeare-censorship", "atlas-shakespeare-english-renaissance-theatre"]
      },
      "source_summary": { "sources": [{ "source_id": "wikidata", "external_id": "Q7207", "url": "https://www.wikidata.org/wiki/Q7207" }] }
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-christopher-marlowe--profile',
    'atlas-shakespeare-christopher-marlowe',
    'Profile',
    3,
    'Christopher Marlowe comparison profile',
    'Passive profile card for comparing Marlowe with Shakespeare as playwright, poet, rival, and early modern theatre figure.',
    NULL,
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "passive": true,
      "pedagogical_role": "Instruction",
      "render_payload": {
        "sections": ["life", "dramatic style", "comparison with Shakespeare"],
        "linked_entities": ["atlas-shakespeare-william-shakespeare", "atlas-shakespeare-english-renaissance-theatre"]
      },
      "source_summary": { "sources": [{ "source_id": "wikidata", "external_id": "Q28975", "url": "https://www.wikidata.org/wiki/Q28975" }] }
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-rose-theatre--place-profile',
    'atlas-shakespeare-rose-theatre',
    'Profile',
    3,
    'The Rose Theatre place profile',
    'Passive place profile for locating the Rose within Bankside theatre geography and commercial performance.',
    NULL,
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "passive": true,
      "pedagogical_role": "Instruction",
      "render_payload": {
        "sections": ["site", "date range", "performance context"],
        "linked_entities": ["atlas-shakespeare-english-renaissance-theatre", "atlas-shakespeare-globe-theatre"]
      },
      "source_summary": { "sources": [{ "source_id": "wikidata", "external_id": "Q1120943", "url": "https://www.wikidata.org/wiki/Q1120943" }] }
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-globe-theatre--place-profile',
    'atlas-shakespeare-globe-theatre',
    'Profile',
    3,
    'Globe Theatre place profile',
    'Passive place profile for the theatre most closely associated with Shakespeare''s company.',
    NULL,
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "passive": true,
      "pedagogical_role": "Instruction",
      "render_payload": {
        "sections": ["site", "company", "performance context"],
        "linked_entities": ["atlas-shakespeare-william-shakespeare", "atlas-shakespeare-lord-chamberlains-men", "atlas-shakespeare-english-renaissance-theatre"]
      },
      "source_summary": { "sources": [{ "source_id": "wikidata", "external_id": "Q272434", "url": "https://www.wikidata.org/wiki/Q272434" }] }
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-lord-chamberlains-men--company-profile',
    'atlas-shakespeare-lord-chamberlains-men',
    'Profile',
    3,
    'Lord Chamberlain''s Men company profile',
    'Passive company profile explaining why acting companies, patrons, repertory, and venues matter to the course.',
    NULL,
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "passive": true,
      "pedagogical_role": "Instruction",
      "render_payload": {
        "sections": ["company", "patronage", "venues", "Shakespeare link"],
        "linked_entities": ["atlas-shakespeare-william-shakespeare", "atlas-shakespeare-globe-theatre", "atlas-shakespeare-patronage"]
      },
      "source_summary": { "sources": [{ "source_id": "wikidata", "external_id": "Q1899451", "url": "https://www.wikidata.org/wiki/Q1899451" }] }
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-romeo-and-juliet--close-reading-pattern',
    'atlas-shakespeare-romeo-and-juliet',
    'Interpret',
    4,
    'Close-reading evidence pattern',
    'Reusable task pattern for interpreting a short Romeo and Juliet passage through claim, evidence, and performance choice.',
    NULL,
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "passive": true,
      "pedagogical_role": "Practice",
      "student_action": "Interpret",
      "task_payload": { "prompt_family": "claim-evidence-performance", "source_entity": "atlas-shakespeare-romeo-and-juliet" }
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-shakespeare-in-love--film-history-compare-pattern',
    'atlas-shakespeare-shakespeare-in-love',
    'Compare',
    4,
    'Film and historical context comparison pattern',
    'Reusable task pattern for separating film invention, historical context, and interpretive value.',
    NULL,
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "passive": true,
      "pedagogical_role": "Practice",
      "student_action": "Compare",
      "task_payload": { "columns": ["film scene", "historical context", "interpretive purpose"] }
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-english-renaissance-theatre--classification-pattern',
    'atlas-shakespeare-english-renaissance-theatre',
    'Classify',
    4,
    'Theatre-world classification pattern',
    'Reusable task pattern for sorting people, places, institutions, works, concepts, and student evidence.',
    NULL,
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "passive": true,
      "pedagogical_role": "Practice",
      "student_action": "Classify",
      "task_payload": { "categories": ["person", "work", "place", "institution", "concept"] }
    }$$::jsonb
  ),
  (
    'atlas-shakespeare-patronage--argument-pattern',
    'atlas-shakespeare-patronage',
    'Argue',
    4,
    'Patronage argument pattern',
    'Reusable task pattern for arguing how power, money, and regulation shape artistic production.',
    NULL,
    $${
      "atlas_pack": "shakespeare-in-love-context",
      "passive": true,
      "pedagogical_role": "Assessment",
      "student_action": "Argue",
      "task_payload": { "claim_frame": "Patronage changes art by...", "evidence_targets": ["company", "theatre", "censorship", "audience"] }
    }$$::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  item_id = EXCLUDED.item_id,
  media_type = EXCLUDED.media_type,
  layer = EXCLUDED.layer,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  url = EXCLUDED.url,
  metadata = EXCLUDED.metadata;

INSERT INTO public.atlas_packs (
  id,
  title,
  description,
  pack_type,
  anchor_item_id,
  domain,
  secondary_domains,
  era_group,
  difficulty_band,
  entity_ids,
  asset_ids,
  product_ids,
  task_ids,
  source_summary,
  quality_score,
  review_status
)
VALUES (
  'pack-shakespeare-in-love-context',
  'Shakespeare in Love context pack',
  'A passive Atlas pack for teaching Shakespeare in Love through Shakespeare, Romeo and Juliet, Elizabethan theatre, patronage, censorship, genre, and metatheatre.',
  'CourseSeed',
  'atlas-shakespeare-shakespeare-in-love',
  'Arts and humanities',
  ARRAY['Education', 'Social sciences, journalism and information'],
  'early-modern',
  'secondary-upper',
  ARRAY[
    'atlas-shakespeare-william-shakespeare',
    'atlas-shakespeare-shakespeare-in-love',
    'atlas-shakespeare-romeo-and-juliet',
    'atlas-shakespeare-twelfth-night',
    'atlas-shakespeare-elizabeth-i',
    'atlas-shakespeare-christopher-marlowe',
    'atlas-shakespeare-rose-theatre',
    'atlas-shakespeare-globe-theatre',
    'atlas-shakespeare-lord-chamberlains-men',
    'atlas-shakespeare-english-renaissance-theatre',
    'atlas-shakespeare-patronage',
    'atlas-shakespeare-censorship',
    'atlas-shakespeare-iambic-pentameter',
    'atlas-shakespeare-sonnet',
    'atlas-shakespeare-romantic-comedy',
    'atlas-shakespeare-metatheatre'
  ],
  '{}'::uuid[],
  '{}'::uuid[],
  '{}'::uuid[],
  $${
    "sources": [
      { "source_id": "wikidata", "license": "CC0 1.0", "url": "https://www.wikidata.org" },
      { "source_id": "project_gutenberg", "url": "https://www.gutenberg.org" },
      { "source_id": "folger", "url": "https://www.folger.edu" },
      { "source_id": "commons", "url": "https://commons.wikimedia.org" },
      { "source_id": "neptino_curated", "url": "https://neptino.local/atlas/shakespeare-in-love-context" }
    ],
    "rights_note": "External pages and media require their own rights checks before redistribution; the Atlas rows store references and classroom planning metadata."
  }$$::jsonb,
  0.92,
  'approved'
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  pack_type = EXCLUDED.pack_type,
  anchor_item_id = EXCLUDED.anchor_item_id,
  domain = EXCLUDED.domain,
  secondary_domains = EXCLUDED.secondary_domains,
  era_group = EXCLUDED.era_group,
  difficulty_band = EXCLUDED.difficulty_band,
  entity_ids = EXCLUDED.entity_ids,
  asset_ids = EXCLUDED.asset_ids,
  product_ids = EXCLUDED.product_ids,
  task_ids = EXCLUDED.task_ids,
  source_summary = EXCLUDED.source_summary,
  quality_score = EXCLUDED.quality_score,
  review_status = EXCLUDED.review_status,
  updated_at = now();
