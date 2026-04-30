// One-shot script: scans images/<folder>/*.webp for each topic and
// inserts a gallery: [...] field into data.js after the topic's image line.
// Skips topics that already have a gallery.
const fs = require('fs');
const path = require('path');

const TOPIC_FOLDER_MAP = {
  'apprenticeships':       'apprenticeships-images',
  'craftsman-guild':       'vauxhallcraftsmenguild-images',
  'family-connections':    'familyconnections-images',
  'migration':             'migration-images',
  'scale':                 'scale-images',
  'social-responsibility': 'socialresponsibility-images',
  'press-shop':            'pressshop-images',
  'body-shop':             'bodyshop-images',
  'paint-shop':            'paintshop-images',
  'trim-shop':             'trimshop-images',
  'assembly':              'assembly-images',
  'quality':               'quality-images',
  'toddington':            'toddington-images',
  'other-jobs':            'otherjobs-images',
  'canteen':               'canteen-images',
  'millbrook':             'millbrook-images',
  'war':                   'war-images',
  'bedford-trucks':        'bedford-trucks-images',
  'unions':                'unions-images',
  'closure':               'closure-images',
};

const dataPath = path.join(__dirname, '..', 'data.js');
let src = fs.readFileSync(dataPath, 'utf8');

let added = 0, skipped = 0, missing = 0;

for (const [topicId, folder] of Object.entries(TOPIC_FOLDER_MAP)) {
  const folderPath = path.join(__dirname, '..', 'images', folder);
  if (!fs.existsSync(folderPath)) {
    console.log(`!! ${topicId}: folder ${folder} not found`);
    missing++;
    continue;
  }

  const files = fs.readdirSync(folderPath)
    .filter(f => f.toLowerCase().endsWith('.webp'))
    .sort()
    .map(f => `images/${folder}/${f}`);

  // Match this topic's full block — from `id: "<topicId>"` up to `\n  },`
  // (the closing of *this* topic). This prevents the lazy match from
  // sliding into the next topic.
  const blockRegex = new RegExp(
    `    id: "${topicId}",[\\s\\S]*?\\n  \\},`,
    'm'
  );
  const m = src.match(blockRegex);
  if (!m) {
    console.log(`!! ${topicId}: could not locate block`);
    missing++;
    continue;
  }
  const block = m[0];

  // Skip if this block already contains a gallery field.
  if (/    gallery:/.test(block)) {
    console.log(`-- ${topicId}: already has gallery, skipping`);
    skipped++;
    continue;
  }

  // Find the cover image inside the block.
  const coverMatch = block.match(/    image: "([^"]+)",/);
  if (!coverMatch) {
    console.log(`!! ${topicId}: no image: line in block`);
    missing++;
    continue;
  }
  const cover = coverMatch[1];
  const gallery = [cover, ...files];
  const galleryStr =
    '    gallery: [\n' +
    gallery.map(g => `      "${g}",`).join('\n') +
    '\n    ],';

  // Insert the gallery right after the image: line within the block,
  // then splice the modified block back into the source.
  const newBlock = block.replace(
    coverMatch[0],
    coverMatch[0] + '\n' + galleryStr
  );
  src = src.replace(block, newBlock);
  console.log(`OK ${topicId}: ${gallery.length} images`);
  added++;
}

fs.writeFileSync(dataPath, src);
console.log(`\nDone. Added: ${added}  Skipped: ${skipped}  Missing: ${missing}`);
