import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', ...rest }) => {
  return (
    <div
      className={`bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-xl shadow-md border border-gray-200 dark:border-gray-700 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

export default GlassCard;
