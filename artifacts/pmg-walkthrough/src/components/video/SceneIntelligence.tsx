import { motion } from 'framer-motion';
import { Network, Database, Wallet, Zap, RefreshCw, CheckCircle } from 'lucide-react';

const FEATURES = [
  { icon: Network, text: "Real AI via OpenAI/GPT-4o-mini" },
  { icon: Database, text: "Self-updating Knowledge Library (96+ entries)" },
  { icon: Wallet, text: "Wallet billing system ($390+ balance)" },
  { icon: Zap, text: "Smart caching (73.6% hit rate)" },
  { icon: RefreshCw, text: "GoHighLevel CRM hybrid sync" },
  { icon: CheckCircle, text: "62 automated tests across 12 suites — all passing", color: "text-success" }
];

export default function SceneIntelligence() {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col p-16"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(20px)' }}
      transition={{ duration: 0.8 }}
    >
      <div className="flex h-full gap-16 items-center">
        {/* Left side: Animated core graphic */}
        <motion.div 
          className="flex-1 relative aspect-square"
          initial={{ opacity: 0, rotate: -45, scale: 0.8 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          transition={{ delay: 0.4, duration: 1.2, type: "spring" }}
        >
          <div className="absolute inset-0 border border-primary/20 rounded-full animate-[spin_20s_linear_infinite]" />
          <div className="absolute inset-4 border border-secondary/40 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
          <div className="absolute inset-8 border border-white/10 rounded-full border-dashed animate-[spin_10s_linear_infinite]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 bg-primary/20 rounded-full blur-xl absolute" />
            <Network className="w-16 h-16 text-primary relative z-10" />
          </div>
        </motion.div>

        {/* Right side: Features */}
        <div className="flex-1">
          <motion.h2 
            className="font-display text-5xl font-bold mb-8"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            Intelligence Engine
          </motion.h2>

          <div className="space-y-6">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={i}
                className="flex items-center gap-4 glass-panel p-4 rounded-xl"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + (i * 0.15), type: "spring", stiffness: 100 }}
              >
                <div className={`p-2 rounded-lg bg-white/5 ${feature.color || 'text-primary'}`}>
                  <feature.icon size={20} />
                </div>
                <span className="text-lg font-medium">{feature.text}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
