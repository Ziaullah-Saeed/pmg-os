import { motion } from 'framer-motion';
import { 
  Monitor, Brain, Target, Megaphone, Video, 
  Settings, Users, Phone, FileText, Database, Shield 
} from 'lucide-react';

const DOMAINS = [
  { icon: Monitor, label: "Command Center", sub: "Executive Control" },
  { icon: Brain, label: "Intelligence", sub: "Strategic Insight" },
  { icon: Target, label: "Outreach", sub: "Pipeline Discovery" },
  { icon: Megaphone, label: "Marketing", sub: "Discoverability" },
  { icon: Video, label: "Production Studio", sub: "Asset Generation" },
  { icon: Settings, label: "Execution", sub: "Workflow Control" },
  { icon: Users, label: "CRM", sub: "Revenue Pipeline" },
  { icon: Phone, label: "Communications", sub: "Meeting Intelligence" },
  { icon: FileText, label: "Finance & Legal", sub: "Compliance" },
  { icon: Database, label: "Reporting", sub: "Knowledge Memory" },
  { icon: Shield, label: "System Core", sub: "Governance" }
];

export default function SceneDomains() {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col p-16"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="mb-12">
        <motion.h2 
          className="font-display text-5xl font-bold text-white mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          11 Operational Domains
        </motion.h2>
        <motion.div 
          className="w-24 h-1 bg-primary"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          style={{ originX: 0 }}
        />
      </div>

      <div className="grid grid-cols-4 gap-6 h-full content-center">
        {DOMAINS.map((domain, i) => (
          <motion.div
            key={domain.label}
            className="glass-panel p-6 rounded-xl flex items-start space-x-4 border-l-4 border-l-transparent hover:border-l-primary"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ 
              delay: 0.6 + (i * 0.1), 
              duration: 0.5,
              type: "spring",
              stiffness: 100
            }}
          >
            <div className="bg-secondary/50 p-3 rounded-lg text-primary">
              <domain.icon size={24} />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg text-white">{domain.label}</h3>
              <p className="text-sm text-text-secondary">{domain.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
