/** TJ-Cortex Tailwind design tokens. */
module.exports = {
  colors: {
    cortex: {
      violet: '#6C4CF1',
      cyan: '#22D3EE',
      deep: '#0B0B14',
      white: '#F8FAFC',
    },
    dendrite: { green: '#34D399' },
    axon: { amber: '#F59E0B' },
    soma: { rose: '#FB7185' },
    myelin: { blue: '#3B82F6' },
    glia: { gray: '#64748B' },
    trade: { teal: '#14B8A6' },
  },
  backgroundImage: {
    'gradient-cortex': 'linear-gradient(135deg, #6C4CF1 0%, #22D3EE 100%)',
    'gradient-revenue': 'linear-gradient(135deg, #F59E0B 0%, #14B8A6 100%)',
    'gradient-dusk': 'linear-gradient(180deg, #0B0B14 0%, #1E1B4B 100%)',
  },
  fontFamily: {
    sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
    display: ['Space Grotesk', 'Inter', 'ui-sans-serif'],
    mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
  },
  borderRadius: { md: '8px', lg: '12px', pill: '9999px' },
  transitionDuration: { 150: '150ms', 200: '200ms', 250: '250ms' },
  blur: { glass: '12px' },
};