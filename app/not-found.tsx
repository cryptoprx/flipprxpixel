import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <img src="/flip.png" alt="FLIPPRX Logo" className="pixelated mx-auto drop-shadow-2xl" style={{ imageRendering: 'pixelated', height: '120px' }} />
        </div>
        
        <div className="bg-gradient-to-b from-green-900 to-green-950 border-8 border-green-600 rounded-3xl shadow-2xl p-8">
          <div className="mb-6">
            <div className="inline-block bg-red-500 text-white font-bold px-8 py-3 rounded-lg border-4 border-red-700 shadow-lg mb-6" style={{ fontFamily: 'monospace', fontSize: '2rem', letterSpacing: '3px' }}>
              404
            </div>
          </div>

          <div className="bg-black bg-opacity-50 rounded-xl p-6 mb-6 border-4 border-green-700">
            <p className="text-white font-mono text-xl leading-relaxed mb-4">
              <span className="inline-flex items-center justify-center gap-2">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 9h4v6H6zm8 0h4v6h-4zM4 2h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/>
                </svg>
                <span className="text-red-400 font-bold">Page Not Found!</span>
              </span>
            </p>
            <p className="text-gray-300 font-mono text-base leading-relaxed mb-6">
              Oops! This page doesn&apos;t exist. Let&apos;s get you back to the game!
            </p>
          </div>

          <div className="space-y-4">
            <Link 
              href="/"
              className="block bg-gradient-to-r from-green-500 to-green-700 text-white font-bold px-8 py-4 rounded-lg border-4 border-green-800 shadow-lg hover:from-green-400 hover:to-green-600 transition-all transform hover:scale-105"
              style={{ fontFamily: 'monospace', fontSize: '1.2rem' }}
            >
              <span className="inline-flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                </svg>
                GO TO GAME
              </span>
            </Link>
            
            <a 
              href="https://FLIPPRX.ONE" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold px-8 py-4 rounded-lg border-4 border-cyan-700 shadow-lg hover:from-cyan-400 hover:to-blue-500 transition-all transform hover:scale-105"
              style={{ fontFamily: 'monospace', fontSize: '1.2rem' }}
            >
              <span className="inline-flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
                </svg>
                VISIT FLIPPRX.ONE
              </span>
            </a>
          </div>
        </div>

        <p className="text-gray-500 font-mono text-sm mt-8">
          Error 404 - Page Not Found
        </p>
      </div>
    </div>
  );
}
