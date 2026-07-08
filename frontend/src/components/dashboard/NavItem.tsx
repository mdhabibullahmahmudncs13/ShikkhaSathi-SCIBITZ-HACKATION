import React from 'react';
import { LucideIcon } from 'lucide-react';

interface NavItemProps {
  icon: LucideIcon | string;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  badge?: number;
  color?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

const NavItem: React.FC<NavItemProps> = ({
  icon,
  label,
  isActive = false,
  onClick,
  badge,
  color = 'default'
}) => {
  const colorClasses = {
    default: {
      base: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
      active: 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
    },
    primary: {
      base: 'text-blue-600 hover:bg-blue-50 hover:text-blue-700',
      active: 'bg-blue-100 text-blue-800 border-r-2 border-blue-600'
    },
    success: {
      base: 'text-green-600 hover:bg-green-50 hover:text-green-700',
      active: 'bg-green-100 text-green-800 border-r-2 border-green-600'
    },
    warning: {
      base: 'text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700',
      active: 'bg-yellow-100 text-yellow-800 border-r-2 border-yellow-600'
    },
    danger: {
      base: 'text-red-600 hover:bg-red-50 hover:text-red-700',
      active: 'bg-red-100 text-red-800 border-r-2 border-red-600'
    }
  };

  const classes = colorClasses[color];
  const IconComponent = typeof icon === 'string' ? null : icon;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
        isActive ? classes.active : classes.base
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {typeof icon === 'string' ? (
          <span className="text-lg flex-shrink-0">{icon}</span>
        ) : IconComponent ? (
          <IconComponent className="w-5 h-5 flex-shrink-0" />
        ) : null}
        <span className="truncate">{label}</span>
      </div>
      
      {badge !== undefined && badge > 0 && (
        <span className={`inline-flex items-center justify-center px-2 py-1 text-xs font-bold rounded-full min-w-[20px] h-5 flex-shrink-0 ml-2 ${
          isActive 
            ? 'bg-white text-blue-600' 
            : 'bg-blue-600 text-white'
        }`}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
};

export default NavItem;