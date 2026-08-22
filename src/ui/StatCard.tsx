import React from 'react';
import { IconType } from 'react-icons';
import GlassCard from './GlassCard';

interface StatCardProps {
  title: string;
  value: number | string;
  Icon: IconType;
  /** Tailwind gradient class for the icon background */
  bgColor?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, Icon, bgColor = 'bg-gradient-to-br from-indigo-500 to-purple-600' }) => {
  const formattedValue =
    typeof value === 'number'
      ? value.toLocaleString(undefined, { minimumFractionDigits: 2 })
      : value;
  return (
    <GlassCard className="flex items-center justify-between p-5">
      <div className="flex flex-col">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{title}</span>
        <span className="text-lg font-bold text-gray-900 dark:text-white">{formattedValue}</span>
      </div>
      <div className={`flex items-center justify-center w-10 h-10 rounded-full text-white ${bgColor}`}>
        <Icon size={20} />
      </div>
    </GlassCard>
  );
};

export default StatCard;
