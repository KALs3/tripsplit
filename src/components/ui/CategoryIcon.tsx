import {
  BedDouble,
  Receipt,
  ShoppingBag,
  Ticket,
  TrainFront,
  Utensils,
} from 'lucide-react-native';
import React from 'react';
import { ExpenseCategory } from '../../domain/types';

interface CategoryIconProps {
  category?: ExpenseCategory;
  size?: number;
  color: string;
}

export function CategoryIcon({ category, size = 18, color }: CategoryIconProps) {
  switch (category) {
    case 'food':
      return <Utensils size={size} color={color} strokeWidth={2} />;
    case 'transport':
      return <TrainFront size={size} color={color} strokeWidth={2} />;
    case 'lodging':
      return <BedDouble size={size} color={color} strokeWidth={2} />;
    case 'activities':
      return <Ticket size={size} color={color} strokeWidth={2} />;
    case 'shopping':
      return <ShoppingBag size={size} color={color} strokeWidth={2} />;
    case 'other':
    default:
      return <Receipt size={size} color={color} strokeWidth={2} />;
  }
}
