/**
 * Stremio & Nuvio Addon Manifest Definition.
 */

export const manifest = {
  id: 'org.nuvio.lk21',
  version: '1.0.0',
  name: 'LK21 & Nontondrama (Indo)',
  description: 'Nonton Film LK21 dan Drakor/Series Nontondrama dengan Subtitle Indonesia di Nuvio & Stremio Android TV.',
  logo: 'https://poster.assetsy.de/wp-content/uploads/2026/11/film-avengers-endgame-2019-lk21.jpg',
  background: 'https://tv13.lk21official.cc/images/logo-layarkaca21.jpg',
  resources: ['stream', 'catalog'],
  types: ['movie', 'series'],
  idPrefixes: ['tt', 'tmdb:', 'lk21:'],
  catalogs: [
    {
      type: 'movie',
      id: 'lk21-latest',
      name: 'LK21 Film Terbaru',
      extra: [
        { name: 'search', isRequired: false },
        { name: 'skip', isRequired: false },
      ],
    },
    {
      type: 'movie',
      id: 'lk21-popular',
      name: 'LK21 Film Populer',
      extra: [
        { name: 'skip', isRequired: false },
      ],
    },
    {
      type: 'series',
      id: 'lk21-series',
      name: 'Series & Drakor Terbaru',
      extra: [
        { name: 'search', isRequired: false },
        { name: 'skip', isRequired: false },
      ],
    },
  ],
  behaviorHints: {
    configurable: false,
    configurationRequired: false,
  },
};
