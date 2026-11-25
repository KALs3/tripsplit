import React from 'react';
import { View, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '', style, ...props }: CardProps) {
  return (
    <View
      style={style}
      className={`rounded-[10px] border border-hairline dark:border-hairline-dark bg-card dark:bg-card-dark p-4 my-1.5 ${className}`}
      {...props}
    >
      {children}
    </View>
  );
}
