import { useState } from 'react';
import type { Doctor, AvailabilitySlot } from '../types';
import { addAvailability, deleteAvailability } from '../services/firestoreService';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

interface CalendarViewProps {
  doctor: Doctor;
  userId: string;
  availability: AvailabilitySlot[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onAvailabilityUpdate: (availability: AvailabilitySlot[]) => void;
}

export default function CalendarView({
  doctor,
  userId,
  availability,
  currentMonth,
  onMonthChange,
  onAvailabilityUpdate,
}: CalendarViewProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doctorAvailability = availability.filter(
    (a) => a.doctorId === doctor.id
  );

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();

  const firstDay = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay();

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleAddAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedDate) {
      setError('Please select a date');
      return;
    }

    if (startTime >= endTime) {
      setError('Start time must be before end time');
      return;
    }

    try {
      setLoading(true);
      const newSlot = await addAvailability(userId, {
        doctorId: doctor.id,
        date: selectedDate,
        startTime,
        endTime,
      });

      onAvailabilityUpdate([...doctorAvailability, newSlot]);
      setShowAddForm(false);
      setSelectedDate(null);
      setStartTime('09:00');
      setEndTime('17:00');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add availability');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (slotId: string) => {
    if (window.confirm('Delete this availability slot?')) {
      try {
        await deleteAvailability(userId, slotId);
        onAvailabilityUpdate(
          doctorAvailability.filter((a) => a.id !== slotId)
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete');
      }
    }
  };

  const getDateString = (day: number) => {
    return new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      .toISOString()
      .split('T')[0];
  };

  const getSlotsForDate = (date: string) => {
    return doctorAvailability.filter((a) => a.date === date);
  };

  const prevMonth = () => {
    onMonthChange(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
    );
  };

  const nextMonth = () => {
    onMonthChange(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
    );
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            📅 {doctor.name}&apos;s Availability
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="btn-outline p-2"
              title="Previous month"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm font-medium min-w-40 text-center">
              {currentMonth.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </span>
            <button
              onClick={nextMonth}
              className="btn-outline p-2"
              title="Next month"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2 mb-6">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center font-semibold text-slate-600 dark:text-slate-400 py-2 text-sm"
            >
              {day}
            </div>
          ))}

          {/* Empty cells for days before month starts */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-slate-50 dark:bg-slate-800 rounded" />
          ))}

          {/* Days */}
          {days.map((day) => {
            const dateStr = getDateString(day);
            const slots = getSlotsForDate(dateStr);
            const isToday =
              new Date().toISOString().split('T')[0] === dateStr;
            const isSelected = selectedDate === dateStr;

            return (
              <button
                key={day}
                onClick={() => {
                  setSelectedDate(isSelected ? null : dateStr);
                  setShowAddForm(isSelected ? false : true);
                }}
                className={`aspect-square p-1 rounded-lg border-2 transition-colors text-xs flex flex-col items-center justify-center ${
                  isToday
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : isSelected
                      ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/40'
                      : slots.length > 0
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="font-semibold">{day}</div>
                {slots.length > 0 && (
                  <div className="text-green-600 dark:text-green-400 text-xs font-bold">
                    ✓ {slots.length}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Add Availability Form */}
        {showAddForm && selectedDate && (
          <form
            onSubmit={handleAddAvailability}
            className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg space-y-3"
          >
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Add Availability for {new Date(selectedDate).toLocaleDateString()}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="input text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="input text-sm"
                />
              </div>
            </div>

            {error && (
              <div className="p-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded text-xs">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1 text-sm disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setSelectedDate(null);
                }}
                className="btn-secondary flex-1 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Availability List */}
      {doctorAvailability.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-3">
            📋 Scheduled Availability
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {doctorAvailability
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white text-sm">
                      {new Date(slot.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {slot.startTime} - {slot.endTime}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(slot.id)}
                    className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} className="text-red-600 dark:text-red-400" />
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
