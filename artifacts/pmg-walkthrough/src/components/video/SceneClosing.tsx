import { motion } from 'framer-motion';

export default function SceneClosing() {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center p-16 text-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.1)_0%,transparent_70%)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 2 }}
      />

      <motion.h2 
        className="font-display text-6xl font-bold mb-8 tracking-tight z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 1 }}
      >
        PMG GROUP OS
      </motion.h2>

      <motion.div
        className="flex gap-4 items-center justify-center mb-12 z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        <span className="px-6 py-2 glass-panel rounded-full text-success font-mono uppercase tracking-wider text-sm border-success/30">
          Built
        </span>
        <div className="w-8 h-[1px] bg-white/20" />
        <span className="px-6 py-2 glass-panel rounded-full text-success font-mono uppercase tracking-wider text-sm border-success/30">
          Tested
        </span>
        <div className="w-8 h-[1px] bg-white/20" />
        <span className="px-6 py-2 glass-panel rounded-full text-success font-mono uppercase tracking-wider text-sm border-success/30 bg-success/10 text-white font-bold">
          Ready
        </span>
      </motion.div>

      <motion.div 
        className="flex gap-8 text-text-secondary font-mono text-sm tracking-widest uppercase mb-16 z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.8 }}
      >
        <span>62/62 Tests Passed</span>
        <span>•</span>
        <span>112 Agents</span>
        <span>•</span>
        <span>11 Domains</span>
        <span>•</span>
        <span>3 Modes</span>
      </motion.div>

      <motion.p
        className="text-xl text-white/60 font-light tracking-wide z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5, duration: 1 }}
      >
        Cybersecurity & IT Services — Powered by AI
      </motion.p>
    </motion.div>
  );
}
