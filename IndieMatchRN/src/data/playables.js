// src/data/playables.js
// RN equivalent of the web app's src/config.js
// Thumbnails are bundled with require() for use with <Image> components.
// Playable HTML files are served from the document directory after first-launch copy.

export const playables = [
  {
    id: 'p1',
    localPath: 'p1/index.html',  // relative path inside assets/playables/
    gameName: 'Block Blast',
    publisher: 'Hungry Studio',
    storeUrl: 'https://apps.apple.com/us/app/block-blast/id1617391485',
    thumbnail: require('../../assets/thumbnails/block-blast.png'),
  },
  {
    id: 'p2',
    localPath: 'p2/index.html',
    gameName: 'Royal Match',
    publisher: 'Dream Games',
    storeUrl: 'https://apps.apple.com/us/app/royal-match/id1482155847',
    thumbnail: require('../../assets/thumbnails/royal-match.png'),
  },
  {
    id: 'p4',
    localPath: 'p4/index.html',
    gameName: 'Neon Dodger',
    publisher: 'Indie Dev',
    storeUrl: 'https://apps.apple.com/us/app/neon-dodger-fake-link',
    thumbnail: require('../../assets/thumbnails/neon-dodger.png'),
  },
];
