export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty?: string;
  color?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AvailabilitySlot {
  id: string;
  doctorId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CalendarView {
  type: 'month' | 'week' | 'day';
  date: Date;
}
