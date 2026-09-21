import { Html } from '@react-three/drei';

export function Nametag({ name, color, sub }: { name: string; color: string; sub?: string }) {
  return (
    <Html position={[0, 2.35, 0]} center distanceFactor={20} occlude={false}>
      <div
        style={{
          fontFamily: "'Space Grotesk', Inter, sans-serif",
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: '#F8FAFC',
          padding: '3px 8px',
          borderRadius: 6,
          background: 'rgba(11,11,20,0.65)',
          border: `1px solid ${color}55`,
          boxShadow: `0 0 14px ${color}66`,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {name}
        {sub && (
          <div
            style={{
              fontSize: 9,
              letterSpacing: '0.28em',
              color,
              textAlign: 'center',
              marginTop: 1,
            }}
          >
            {sub}
          </div>
        )}
      </div>
    </Html>
  );
}