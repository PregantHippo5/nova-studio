'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

/** Transition d'entrée à chaque changement de page (le menu et le pied de page restent en place). */
export default function Template({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
