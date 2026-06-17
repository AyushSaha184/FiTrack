import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';

export const formatWeight = (weight: number, unit: 'kg' | 'lbs', decimals = 1): string => {
  return `${weight.toFixed(decimals)} ${unit}`;
};

export const formatDuration = (seconds: number): string => {
  if (seconds < 0) return '0s';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs}s`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
};

export const formatDurationCompact = (seconds: number): string => {
  if (seconds < 0) return '0m';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
};

export const formatDate = (
  date: Date | string,
  formatType: 'short' | 'long' | 'relative' | 'dayMonth' | 'time' = 'short',
): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
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
};

export const formatDayOfWeek = (date: Date | string, short = false): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, short ? 'EEE' : 'EEEE');
};

export const formatSteps = (steps: number): string => {
  if (steps >= 1_000_000) return `${(steps / 1_000_000).toFixed(1)}M`;
  if (steps >= 1000) return `${(steps / 1000).toFixed(1)}k`;
  return steps.toString();
};

export const formatStepsWithCommas = (steps: number): string => {
  return steps.toLocaleString();
};

export const formatCalories = (calories: number): string => {
  return `${Math.round(calories).toLocaleString()} kcal`;
};

export const formatDistance = (km: number, unit: 'km' | 'mi' = 'km'): string => {
  if (unit === 'mi') {
    return `${(km * 0.621371).toFixed(1)} mi`;
  }
  return `${km.toFixed(1)} km`;
};

export const formatVolume = (volume: number, unit: 'kg' | 'lbs' = 'kg'): string => {
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}t ${unit}`;
  }
  return `${Math.round(volume)} ${unit}`;
};

export const formatPercent = (value: number, decimals = 0): string => {
  return `${value.toFixed(decimals)}%`;
};

export const formatChange = (value: number, unit: string, decimals = 1): string => {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)} ${unit}`;
};

export const formatChangeWithSign = (value: number, decimals = 1): string => {
  if (value > 0) return `+${value.toFixed(decimals)}`;
  if (value < 0) return value.toFixed(decimals);
  return '0';
};
