import type { Bot } from '@lanista/types';
import { motion } from 'framer-motion';

interface Props {
  bot: Bot;
  isRight?: boolean;
}

export function GladiatorCard({ bot, isRight = false }: Props) {
  const current_hp = bot.current_hp ?? bot.hp;
  const hpPercentage = Math.max(0, Math.min(100, (current_hp / bot.hp) * 100));
  const isDanger = hpPercentage < 25;

  return (
    <div className={`flex flex-col gap-4 w-72 ${isRight ? 'items-end' : 'items-start'}`}>
      <div className="relative group perspective-1000">
        <motion.div
           initial={{ rotateY: isRight ? -10 : 10, opacity: 0 }}
           animate={{ rotateY: 0, opacity: 1 }}
           transition={{ duration: 0.8, ease: "easeOut" }}
           className="glass p-6 rounded-[2rem] shadow-2xl overflow-hidden relative group/card transition-all duration-500 hover:-translate-y-2 hover:border-primary/30"
        >
          <div className="absolute inset-0 noise pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-500" />
          
          <img 
            src={bot.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${bot.name}`} 
            alt={bot.name}
            className={`w-48 h-48 object-cover rounded-lg mb-4 bg-neutral-900`}
          />
          
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white/90 mb-1" data-text={bot.name}>
            {bot.name}
          </h2>
          
          <div className="flex gap-4 text-xs font-mono text-neutral-400">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-primary rounded-full" /> ATK: {bot.attack}
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full" /> DEF: {bot.defense}
            </span>
          </div>
        </motion.div>
      </div>

      <div className={`w-full flex flex-col gap-1 ${isRight ? 'items-end' : 'items-start'}`}>
        <div className="flex justify-between w-full text-xs font-bold font-mono uppercase tracking-widest text-neutral-500">
          <span>HP</span>
          <span className={isDanger ? 'text-primary' : 'text-white'}>
            {Math.floor(current_hp)} / {bot.hp}
          </span>
        </div>
        
        <div className="w-full h-3 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
          <motion.div 
            className={`h-full ${isDanger ? 'bg-primary' : 'bg-white'}`}
            initial={{ width: '100%' }}
            animate={{ width: `${hpPercentage}%` }}
            transition={{ type: "spring", bounce: 0, duration: 0.8 }}
          />
        </div>
      </div>
    </div>
  );
}
