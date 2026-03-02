import PixelGame from '@/components/PixelGame';

export default function Home() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: 'FLIPPRX Pixel Game',
    description: 'An addictive retro platformer featuring 3 unique characters with special abilities. 10 challenging stages with power-ups, enemies, and pixel-perfect gameplay in authentic Game Boy style.',
    url: 'https://flipprxpixel.vercel.app',
    image: 'https://flipprxpixel.vercel.app/icon.png',
    author: {
      '@type': 'Organization',
      name: 'FLIPPRX',
      url: 'https://flipprxpixel.vercel.app'
    },
    publisher: {
      '@type': 'Organization',
      name: 'FLIPPRX',
      logo: {
        '@type': 'ImageObject',
        url: 'https://flipprxpixel.vercel.app/icon.png'
      }
    },
    genre: ['Platformer', 'Retro', 'Arcade', 'Action'],
    gamePlatform: ['Web Browser', 'Mobile Web'],
    playMode: 'SinglePlayer',
    applicationCategory: 'Game',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock'
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '150',
      bestRating: '5',
      worstRating: '1'
    },
    gameItem: [
      {
        '@type': 'Thing',
        name: 'Classic Hero Character',
        description: 'Balanced character with standard abilities'
      },
      {
        '@type': 'Thing',
        name: 'Speedster Character',
        description: '35% faster movement with air slide ability'
      },
      {
        '@type': 'Thing',
        name: 'Slammer Character',
        description: 'Ground slam attack that breaks bricks and defeats enemies'
      }
    ],
    numberOfPlayers: {
      '@type': 'QuantitativeValue',
      value: 1
    },
    inLanguage: 'en',
    datePublished: '2025-01-16',
    keywords: 'retro platformer, pixel game, gameboy, browser game, free game, mobile game, 8-bit, nostalgic gaming'
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PixelGame />
    </>
  );
}
