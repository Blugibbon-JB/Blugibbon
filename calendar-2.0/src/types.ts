export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

export interface Doctor {
  id: string;
  ahpraId: string; // AHPRA Registration number (unique)
  name: string;
  specialty?: string;
  prefs?: string; // Preferences
  where?: string; // Where they want to work
  pgy?: string; // PGY level
  level?: 'Junior' | 'Senior' | 'Specialist'; // Seniority
  tags?: string[]; // Custom tags
  clickupUrl?: string; // ClickUp task URL
  color?: string;
  createdAt: number;
  updatedAt: number;
}

export type StatusType = 'Available' | 'Tentative' | 'Booked' | 'Away' | 'Holiday' | 'Sick' | 'Unavailable';

export const STATUS_COLORS: Record<StatusType, string> = {
  Available: '#2e7d32',
  Tentative: '#00796b',
  Booked: '#1565c0',
  Away: '#757575',
  Holiday: '#f9a825',
  Sick: '#c62828',
  Unavailable: '#424242',
};

export interface AvailabilitySlot {
  id: string;
  doctorId: string;
  ahpraId: string; // For CSV compatibility
  date: string; // YYYY-MM-DD (start date, inclusive)
  endDate?: string; // YYYY-MM-DD (end date, inclusive) - for multi-day blocks
  startTime?: string; // HH:MM (optional, for day-specific slots)
  endTime?: string; // HH:MM (optional)
  status: StatusType;
  title?: string; // Display title
  location?: string; // Where working
  notes?: string;
  source?: 'manual' | 'timesheets' | 'import'; // Data source
  recurrencePattern?: {
    type: 'none' | '1on1off' | '2on2off' | 'custom';
    onDays?: number;
    offDays?: number;
    cycles?: number; // How many blocks to create
  };
  createdAt: number;
  updatedAt: number;
}

export interface CalendarView {
  type: 'month' | 'week' | 'day' | 'heatmap' | 'strips' | 'finder';
  date: Date;
}

export interface FinderResult {
  doctor: Doctor;
  availableDays: number;
  bookedDays: number;
  otherDays: number;
  totalDays: number;
  percentAvailable: number;
}
