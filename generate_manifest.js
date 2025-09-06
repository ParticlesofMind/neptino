const fs = require('fs');
const path = require('path');

// Read the current manifest
const manifestPath = './src/assets/stock_media/manifest.json';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Function to generate entries for a media type
function generateEntries(folderPath, type, fileExtensions) {
  const entries = [];
  if (!fs.existsSync(folderPath)) return entries;
  
  const files = fs.readdirSync(folderPath).filter(file => 
    fileExtensions.some(ext => file.toLowerCase().endsWith(ext))
  );
  
  files.forEach((file, index) => {
    const fileName = file.replace(/\.(mp3|mp4|png|txt)$/i, '');
    const baseName = fileName.replace(/^\d+_sample-/, '');
    
    let title = baseName.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    const entry = {
      id: `stock-${type.slice(0, 3)}-${String(index + 1).padStart(3, '0')}`,
      type: type,
      title: title,
      author: 'Stock'
    };
    
    if (type === 'images') {
      entry.thumbnailUrl = `/src/assets/stock_media/images/${file}`;
      entry.previewUrl = `/src/assets/stock_media/images/${file}`;
      entry.contentUrl = `/src/assets/stock_media/images/${file}`;
    } else if (type === 'videos') {
      entry.thumbnailUrl = '/src/assets/logo/octopus-logo.png';
      entry.previewUrl = `/src/assets/stock_media/videos/${file}`;
      entry.contentUrl = `/src/assets/stock_media/videos/${file}`;
      const match = file.match(/(\d+)s\.mp4$/);
      if (match) entry.durationSec = parseInt(match[1]);
    } else if (type === 'audio') {
      entry.thumbnailUrl = '';
      entry.previewUrl = `/src/assets/stock_media/audios/${file}`;
      entry.contentUrl = `/src/assets/stock_media/audios/${file}`;
      const match = file.match(/(\d+)s\.mp3$/);
      if (match) entry.durationSec = parseInt(match[1]);
    } else if (type === 'text') {
      // Read actual text content
      try {
        const content = fs.readFileSync(`${folderPath}/${file}`, 'utf8').trim();
        entry.title = content.length > 80 ? content.substring(0, 80) + '...' : content;
      } catch (e) {
        entry.title = title;
      }
    }
    
    entries.push(entry);
  });
  
  return entries;
}

// Generate entries for each media type
const imageEntries = generateEntries('./src/assets/stock_media/images', 'images', ['.png', '.jpg', '.jpeg']);
const videoEntries = generateEntries('./src/assets/stock_media/videos', 'videos', ['.mp4', '.mov', '.avi']);
const audioEntries = generateEntries('./src/assets/stock_media/audios', 'audio', ['.mp3', '.wav', '.ogg']);
const textEntries = generateEntries('./src/assets/stock_media/texts', 'text', ['.txt']);

// Filter existing non-stock entries (keep logo, plugins, links)
const existingEntries = manifest.items.filter(item => 
  !item.id.startsWith('stock-') || 
  item.type === 'plugins' || 
  item.type === 'links' ||
  item.author === 'Neptino'
);

// Combine all entries
const newManifest = {
  items: [
    ...existingEntries,
    ...imageEntries,
    ...videoEntries,
    ...audioEntries,
    ...textEntries
  ]
};

// Write the updated manifest
fs.writeFileSync(manifestPath, JSON.stringify(newManifest, null, 2));
console.log(`Updated manifest with ${imageEntries.length} images, ${videoEntries.length} videos, ${audioEntries.length} audio files, and ${textEntries.length} text files`);
