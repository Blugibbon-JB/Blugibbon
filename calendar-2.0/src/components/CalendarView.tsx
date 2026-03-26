import { useState, useRef } from 'react';
import type { Doctor, AvailabilitySlot } from '../types';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { addAvailability, deleteAvailability } from '../services/firestoreService';
import { Trash2, Copy, Clipboard } from 'lucide-react';

interface CalendarViewProps {
  doctor: Doctor;
  userId: string;
  availability: AvailabilitySlot[];
  onAvailabilityUpdate: (availability: AvailabilitySlot[]) => void;
}

interface EventModal {
  isOpen: boolean;
  event?: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
  };
}

export default function CalendarView({
  doctor,
  userId,
  availability,
  onAvailabilityUpdate,
}: CalendarViewProps) {
  const [modal, setModal] = useState<EventModal>({ isOpen: false });
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<AvailabilitySlot | null>(null);
  const calendarRef = useRef(null);

  const doctorAvailability = availability.filter(a => a.doctorId === doctor.id);

  // Convert availability to FullCalendar events
  const events = doctorAvailability.map(slot => ({
    id: slot.id,
    title: `${slot.startTime} - ${slot.endTime}`,
    start: `${slot.date}T${slot.startTime}`,
    end: `${slot.date}T${slot.endTime}`,
    backgroundColor: doctor.color || '#3b82f6',
    borderColor: doctor.color || '#3b82f6',
    extendedProps: {
      slotId: slot.id,
      doctorId: doctor.id,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
    },
  }));

  const handleDateSelect = async (selectInfo: any) => {
    const dateStr = selectInfo.startStr.split('T')[0];
    setModal({
      isOpen: true,
      event: {
        id: '',
        date: dateStr,
        startTime: '09:00',
        endTime: '17:00',
      },
    });
    setStartTime('09:00');
    setEndTime('17:00');
  };

  const handleEventClick = (clickInfo: any) => {
    const ext = clickInfo.event.extendedProps;
    setModal({
      isOpen: true,
      event: {
        id: ext.slotId,
        date: ext.date,
        startTime: ext.startTime,
        endTime: ext.endTime,
      },
    });
    setStartTime(ext.startTime);
    setEndTime(ext.endTime);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!modal.event?.date) {
      setError('Date is required');
      return;
    }

    if (startTime >= endTime) {
      setError('Start time must be before end time');
      return;
    }

    try {
      setLoading(true);

      if (modal.event.id) {
        // Delete old and create new
        await deleteAvailability(userId, modal.event.id);
      }

      const newSlot = await addAvailability(userId, {
        doctorId: doctor.id,
        date: modal.event.date,
        startTime,
        endTime,
      });

      const updated = modal.event.id
        ? doctorAvailability.filter(a => a.id !== modal.event!.id)
        : doctorAvailability;

      onAvailabilityUpdate([...updated, newSlot]);
      setModal({ isOpen: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!modal.event?.id) return;

    if (!window.confirm('Delete this availability slot?')) return;

    try {
      setLoading(true);
      await deleteAvailability(userId, modal.event.id);
      onAvailabilityUpdate(
        doctorAvailability.filter(a => a.id !== modal.event!.id)
      );
      setModal({ isOpen: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAvailability = () => {
    if (!modal.event) return;
    const slot = doctorAvailability.find(a => a.id === modal.event!.id);
    if (slot) {
      setClipboard(slot);
    }
  };

  const handlePasteAvailability = async () => {
    if (!clipboard || !modal.event?.date) return;

    try {
      setLoading(true);
      const newSlot = await addAvailability(userId, {
        doctorId: doctor.id,
        date: modal.event.date,
        startTime: clipboard.startTime,
        endTime: clipboard.endTime,
      });

      onAvailabilityUpdate([...doctorAvailability, newSlot]);
      setModal({ isOpen: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to paste');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Info Card */}
      <div className="card">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
          📅 {doctor.name}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {doctor.specialty ? `${doctor.specialty} • ` : ''}
          {doctorAvailability.length} slot{doctorAvailability.length !== 1 ? 's' : ''} scheduled
        </p>
        {clipboard && (
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
            📋 Clipboard: {clipboard.startTime} - {clipboard.endTime}
          </p>
        )}
      </div>

      {/* Calendar */}
      <div className="card h-96 overflow-auto">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek',
          }}
          events={events}
          select={handleDateSelect}
          eventClick={handleEventClick}
          selectable={true}
          height="auto"
          eventBackgroundColor={doctor.color || '#3b82f6'}
          eventBorderColor={doctor.color || '#3b82f6'}
        />
      </div>

      {/* Event Modal */}
      {modal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                {modal.event?.id ? 'Edit' : 'Add'} Availability
              </h3>
              <button
                onClick={() => setModal({ isOpen: false })}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={modal.event?.date || ''}
                  onChange={(e) => {
                    if (modal.event) {
                      setModal({
                        ...modal,
                        event: { ...modal.event, date: e.target.value },
                      });
                    }
                  }}
                  className="input text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Start
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
                    End
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

              <div className="flex gap-2 justify-between">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={handleCopyAvailability}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                    title="Copy"
                  >
                    <Copy size={16} className="text-slate-600 dark:text-slate-400" />
                  </button>
                  {clipboard && (
                    <button
                      type="button"
                      onClick={handlePasteAvailability}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                      title="Paste"
                    >
                      <Clipboard size={16} className="text-blue-600 dark:text-blue-400" />
                    </button>
                  )}
                </div>

                <div className="flex gap-2 flex-1">
                  {modal.event?.id && (
                    <button
                      type="button"
                      onClick={handleDeleteEvent}
                      disabled={loading}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                      <Trash2 size={16} className="text-red-600 dark:text-red-400" />
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary flex-1 text-sm disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal({ isOpen: false })}
                    className="btn-secondary flex-1 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
