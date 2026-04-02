import { motion } from 'framer-motion';

export default function SceneHero() {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center"
      initial={{ opacity: 0, scale: 1.05 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
        className="mb-8"
      >
        <div className="inline-block px-4 py-1 border border-primary/30 rounded-full bg-primary/10 text-primary font-mono text-sm tracking-widest uppercase mb-6">
          System Initialization
        </div>
      </motion.div>

      <motion.h1
        className="font-display font-bold text-8xl tracking-tight mb-6"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 1, type: "spring", stiffness: 100 }}
      >
        PMG GROUP <span className="text-primary">OS</span>
      </motion.h1>

      <motion.p
        className="text-2xl text-text-secondary font-light tracking-wide mb-12 max-w-3xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 1 }}
      >
        AI-Native Enterprise Operating System
      </motion.p>

      <motion.div
        className="flex gap-8 mt-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.8, duration: 0.8 }}
      >
        {[
          { label: "Agents", value: "112" },
          { label: "Domains", value: "11" },
          { label: "Modes", value: "3" }
        ].map((stat, i) => (
          <motion.div 
            key={stat.label}
            className="flex flex-col items-center glass-panel px-8 py-6 rounded-2xl w-32"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 2 + (i * 0.2), type: "spring", stiffness: 200 }}
          >
            <span className="font-mono text-4xl font-bold text-white mb-2">{stat.value}</span>
            <span className="text-sm text-text-secondary uppercase tracking-widest">{stat.label}</span>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
