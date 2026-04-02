import { motion } from 'framer-motion';
import { Cpu, UserCog, User } from 'lucide-react';

const MODES = [
  {
    icon: Cpu,
    title: "AI Autonomous",
    desc: "Full AI control. 112 agents auto-execute tasks without human intervention.",
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/30"
  },
  {
    icon: UserCog,
    title: "Hybrid Mode",
    desc: "AI proposes, humans approve via confidence-based handoff thresholds.",
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/30",
    stats: [
      { label: ">80%", text: "Auto" },
      { label: "50-79%", text: "Review" },
      { label: "<50%", text: "Human" }
    ]
  },
  {
    icon: User,
    title: "Human Controlled",
    desc: "Full manual operation. AI blocked from execution.",
    color: "text-text-secondary",
    bg: "bg-white/5",
    border: "border-white/10"
  }
];

export default function SceneModes() {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col justify-center items-center p-16"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: -50, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="text-center mb-16"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="font-display text-5xl font-bold mb-4">Tri-Mode Operation</h2>
        <p className="text-xl text-text-secondary">Flexible governance for every scenario</p>
      </motion.div>

      <div className="flex gap-8 w-full px-8">
        {MODES.map((mode, i) => (
          <motion.div
            key={mode.title}
            className={`flex-1 glass-panel p-8 rounded-2xl border ${mode.border} relative overflow-hidden`}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + (i * 0.2), type: "spring", stiffness: 100 }}
          >
            <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full ${mode.bg} -mr-16 -mt-16`} />
            
            <div className={`${mode.bg} ${mode.color} w-16 h-16 rounded-2xl flex items-center justify-center mb-6`}>
              <mode.icon size={32} />
            </div>
            
            <h3 className="font-display text-2xl font-bold mb-4">{mode.title}</h3>
            <p className="text-text-secondary leading-relaxed mb-6">{mode.desc}</p>
            
            {mode.stats && (
              <div className="flex gap-4 mt-auto">
                {mode.stats.map(stat => (
                  <div key={stat.label} className="bg-black/30 px-3 py-2 rounded-lg flex-1 text-center border border-white/5">
                    <div className="font-mono text-sm text-white font-bold">{stat.label}</div>
                    <div className="text-xs text-text-secondary">{stat.text}</div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
