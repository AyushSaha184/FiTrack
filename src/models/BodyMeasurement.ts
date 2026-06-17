export type BodyMeasurement = {
  id: string;
  userId: string;
  date: Date;
  chest?: number;
  arms?: number;
  waist?: number;
  hips?: number;
  thighs?: number;
  calves?: number;
  neck?: number;
  createdAt: Date;
};
