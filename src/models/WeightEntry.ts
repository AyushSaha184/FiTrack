export type WeightEntry = {
  id: string;
  userId: string;
  weight: number;
  bodyFatPercentage?: number;
  date: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
};
