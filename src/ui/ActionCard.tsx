import React from 'react';
import { IconType } from 'react-icons';
import GlassCard from './GlassCard';

interface ActionCardProps {
  title: string;
  subtitle: string;
  Icon: IconType;
  bgGradient?: string; // Tailwind gradient class for background
  onClick: () => void;
}

const ActionCard: React.FC<ActionCardProps> = ({ title, subtitle, Icon, bgGradient = 'bg-gradient-to-br from-indigo-500 to-purple-600', onClick }) => {
  return (
    <GlassCard
      className={`p-5 cursor-pointer transform transition hover:scale-105 ${bgGradient} text-white flex items-center justify-between`}
      onClick={onClick}
    >
      <div className="flex flex-col">
        <span className="text-sm font-bold uppercase tracking-wider">{title}</span>
        <span className="text-xs opacity-80">{subtitle}</span>
      </div>
      <Icon size={28} />
    </GlassCard>
  );
};

export default ActionCard;
