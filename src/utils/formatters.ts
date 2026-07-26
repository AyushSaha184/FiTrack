import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';

export const formatWeight = (weight: number, unit: 'kg' | 'lbs', decimals = 1): string => {
  return `${weight.toFixed(decimals)} ${unit}`;
};

export const formatDate = (
  date: Date | string | number | null | undefined | any,
  formatType: 'short' | 'long' | 'relative' | 'dayMonth' | 'time' = 'short',
): string => {
  if (!date) return '';

  let d: Date;
  if (date instanceof Date) {
    d = date;
  } else if (typeof date === 'string') {
    d = parseISO(date);
    if (isNaN(d.getTime())) {
      d = new Date(date);
    }
  } else if (typeof date === 'number') {
    d = new Date(date);
  } else if (typeof date === 'object' && 'seconds' in date) {
    d = new Date(date.seconds * 1000);
  } else {
    d = new Date(date);
  }

  if (!d || isNaN(d.getTime())) {
    return '';
  }

  try {
    switch (formatType) {
      case 'short':
        return format(d, 'MMM d, yyyy');
      case 'long':
        return format(d, 'EEEE, MMMM d, yyyy');
      case 'relative':
        if (isToday(d)) return `Today, ${format(d, 'h:mm a')}`;
        if (isYesterday(d)) return `Yesterday, ${format(d, 'h:mm a')}`;
        return formatDistanceToNow(d, { addSuffix: true });
      case 'dayMonth':
        return format(d, 'MMM d');
      case 'time':
        return format(d, 'h:mm a');
      default:
        return format(d, 'MMM d, yyyy');
    }
  } catch {
    return '';
  }
};

export const formatStepsWithCommas = (steps: number): string => {
  return steps.toLocaleString();
};

export const formatCalories = (calories: number): string => {
  return `${Math.round(calories).toLocaleString()} kcal`;
};
