import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen" style={{ background: '#0a0a0a' }}>
      <img src="/flip.png" alt="FLIPPRX" style={{ width: '64px', height: '64px', imageRendering: 'pixelated', marginBottom: '20px' }} />
      <div style={{ color: '#FF0000', fontSize: '20px', letterSpacing: '4px', marginBottom: '12px' }}>404</div>
      <div style={{ color: '#fff', fontSize: '8px', letterSpacing: '1px', marginBottom: '24px' }}>PAGE NOT FOUND</div>
      <Link
        href="/"
        style={{ color: '#4ade80', fontSize: '8px', letterSpacing: '2px', border: '2px solid #4ade80', padding: '10px 20px', textDecoration: 'none' }}
      >
        GO TO GAME
      </Link>
    </div>
  );
}
