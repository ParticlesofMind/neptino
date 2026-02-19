-- Ensure all encyclopedia media types have at least one concrete demo instance
-- with usable URLs so filtering can be validated in-app.

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
    'test-media-demo-compendium',
    'test-democracy',
    'Compendium',
    'Democracy Compendium (PDF)',
    'Downloadable classroom compendium.',
    'https://www.nasa.gov/wp-content/uploads/2015/07/Apollo11_PressKit.pdf',
    '{"source":"NASA","format":"PDF"}'::jsonb
  ),
  (
    'test-media-demo-text',
    'test-french-revolution',
    'Text',
    'Rights of Man (Primary Text)',
    'Primary source text reference.',
    'https://en.wikisource.org/wiki/Declaration_of_the_Rights_of_Man_and_of_the_Citizen',
    '{"source":"Wikisource"}'::jsonb
  ),
  (
    'test-media-demo-audio',
    'test-printing-press',
    'Audio',
    'Democracy Pronunciation Audio',
    'Short audio sample to validate audio playback.',
    'https://upload.wikimedia.org/wikipedia/commons/transcoded/4/45/En-us-democracy.ogg/En-us-democracy.ogg.mp3',
    '{"source":"Wikimedia Commons","duration":"00:02"}'::jsonb
  ),
  (
    'test-media-demo-video',
    'test-apollo-11',
    'Video',
    'Sample Video Clip',
    'Public sample video for in-app player validation.',
    'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    '{"source":"MDN"}'::jsonb
  ),
  (
    'test-media-demo-maps',
    'test-apollo-11',
    'Maps',
    'Lunar Surface Map',
    'Static map image for map preview testing.',
    'https://upload.wikimedia.org/wikipedia/commons/2/2f/Topographic_map_of_the_Moon.jpg',
    '{"source":"Wikimedia Commons"}'::jsonb
  ),
  (
    'test-media-demo-timeline',
    'test-classical-antiquity',
    'Timeline',
    'TimelineJS Example',
    'External timeline reference for timeline media type.',
    'https://timeline.knightlab.com/',
    '{"source":"KnightLab"}'::jsonb
  ),
  (
    'test-media-demo-3d-model',
    'test-machu-picchu',
    '3D Model',
    '3D Viewer Demo',
    'External 3D model showcase link.',
    'https://sketchfab.com/3d-models/iss-interior-f3f2d9f1f2b74ea8a82ec2a3f8b80b5c',
    '{"source":"Sketchfab"}'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  item_id = EXCLUDED.item_id,
  media_type = EXCLUDED.media_type,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  url = EXCLUDED.url,
  metadata = EXCLUDED.metadata;
