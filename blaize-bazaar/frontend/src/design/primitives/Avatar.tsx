import React from 'react';
import { colors } from '../tokens';

export interface AvatarProps {
  initial: string;
  bgColor?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
};

/**
 * Avatar primitive — circular monogram with configurable background color.
 *
 * Displays a single character centered inside a circular container.
 * Font: Fraunces, italic, font-medium.
 * Default bgColor: espresso, text: cream-50.
 */
export const Avatar: React.FC<AvatarProps> = ({
  initial,
  bgColor,
  size = 'md',
}) => {
  return (
    <div
      className={[
        'inline-flex items-center justify-center rounded-full font-display italic font-medium select-none',
        sizeClasses[size],
        !bgColor ? 'bg-espresso text-cream-50' : 'text-cream-50',
      ].join(' ')}
      style={bgColor ? { backgroundColor: bgColor } : undefined}
      aria-hidden="true"
    >
      {initial.charAt(0)}
    </div>
  );
};

void colors;

export default Avatar;
