import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BASE_WIDTH = 390;

const scale = SCREEN_WIDTH / BASE_WIDTH;
const fontScale = 1;

const round = (n: number): number => Math.round(n);

export const responsive = {
  size(value: number): number {
    return round(value * scale);
  },
  sizeNoFont(value: number): number {
    return round(value * scale);
  },
  font(value: number): number {
    return round(value * fontScale);
  },
};
