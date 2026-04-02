import { AnimatePresence, motion } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import SceneHero from './SceneHero';
import SceneDomains from './SceneDomains';
import SceneModes from './SceneModes';
import SceneIntelligence from './SceneIntelligence';
import SceneClosing from './SceneClosing';

const SCENE_DURATIONS = {
  hero: 4000,
  domains: 5000,
  modes: 5000,
  intelligence: 5000,
  closing: 4000,
};

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({
    durations: SCENE_DURATIONS,
  });

  return (
    <div
      className="w-full h-screen overflow-hidden relative font-body text-white tech-grid"
      style={{ backgroundColor: 'var(--color-bg-dark)' }}
    >
      {/* Persistent Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A0E17] via-[#0A0E17] to-[#1E3A5F] opacity-80" />
      
      <motion.div 
        className="absolute w-[80vw] h-[80vw] rounded-full blur-[120px] opacity-20 bg-primary/40 pointer-events-none"
        animate={{
          x: currentScene === 0 ? '-20vw' : currentScene === 1 ? '50vw' : currentScene === 2 ? '10vw' : '40vw',
          y: currentScene === 0 ? '-20vh' : currentScene === 1 ? '20vh' : currentScene === 2 ? '-10vh' : '50vh',
          scale: currentScene === 4 ? 1.5 : 1,
        }}
        transition={{ duration: 3, ease: 'easeInOut' }}
      />
      
      <AnimatePresence mode="wait">
        {currentScene === 0 && <SceneHero key="hero" />}
        {currentScene === 1 && <SceneDomains key="domains" />}
        {currentScene === 2 && <SceneModes key="modes" />}
        {currentScene === 3 && <SceneIntelligence key="intelligence" />}
        {currentScene === 4 && <SceneClosing key="closing" />}
      </AnimatePresence>
    </div>
  );
}
