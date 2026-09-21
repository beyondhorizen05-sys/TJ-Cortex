import { motion } from 'framer-motion';

export function Splash() {
  return (
    <div className="h-full w-full grid place-items-center bg-gradient-dusk">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="text-center"
      >
        <div className="text-display-xl font-display font-bold tracking-tight">
          TJ<span className="text-cortex-cyan">-</span>CORTEX
        </div>
        <div className="mt-3 text-body-s uppercase tracking-[0.35em] text-cortex-cyan">
          Think · Connect · Build · Earn
        </div>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: 220 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="mx-auto mt-8 h-[2px] rounded-full bg-gradient-cortex"
        />
      </motion.div>
    </div>
  );
}