import PixelGame from '@/components/PixelGame';

export default function Home() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: 'FLIPPRX Pixel Game',
    description:
      'An addictive retro pixel platformer featuring 3 unique heroes with special abilities, 4 biomes, 10 stages, power-ups, and epic Boss Battles against Emperor Viper and Overlord Rektus.',
    url: 'https://www.flipprx.app',
    image: 'https://www.flipprx.app/icon-512.png',
    author: {
      '@type': 'Organization',
      name: 'FLIPPRX',
      url: 'https://www.flipprx.app',
    },
    publisher: {
      '@type': 'Organization',
      name: 'FLIPPRX',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.flipprx.app/icon-512.png',
      },
    },
    genre: ['Platformer', 'Retro', 'Arcade', 'Action'],
    gamePlatform: ['Web Browser', 'Mobile Web', 'Android'],
    playMode: 'SinglePlayer',
    applicationCategory: 'Game',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      ratingCount: '180',
      bestRating: '5',
      worstRating: '1',
    },
    gameItem: [
      {
        '@type': 'Thing',
        name: 'Classic Hero',
        description: 'Balanced hero with Double Jump and Invincible Shadow Dash',
      },
      {
        '@type': 'Thing',
        name: 'Speedster Hero',
        description: '35% faster movement with Coin Magnet and 2x Turbo Air-Slide',
      },
      {
        '@type': 'Thing',
        name: 'Slammer Hero',
        description: 'Meteor Slam ground-pound that smashes bricks and deals 2x Boss damage',
      },
    ],
    numberOfPlayers: {
      '@type': 'QuantitativeValue',
      value: 1,
    },
    inLanguage: 'en',
    datePublished: '2025-01-16',
    keywords:
      'retro platformer, pixel game, browser game, free game, mobile game, android game, 8-bit, boss battle',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <PixelGame />
    </>
  );
}
