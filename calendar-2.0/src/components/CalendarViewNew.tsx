import { useState, useMemo } from 'react';
import type { Doctor, AvailabilitySlot, StatusType, FinderResult } from '../types';
import { STATUS_COLORS } from '../types';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import {
  getMonthRange,
  getAvailabilityStatus,
  dateToIso,
  addDays,
  diffDays,
} from '../utils/calendarUtils';
import { Search, X } from 'lucide-react';

interface CalendarViewNewProps {
  doctors: Doctor[];
  availability: AvailabilitySlot[];
  selectedDoctorId: string | null;
  onSelectDoctor: (id: string | null) => void;
  onAddEvent: (event: Partial<AvailabilitySlot>) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  onUpdateEvent: (id: string, event: Partial<AvailabilitySlot>) => Promise<void>;
}

type ViewMode = 'calendar' | 'heatmap' | 'strips' | 'finder';

const STATUSES: StatusType[] = ['Available', 'Tentative', 'Booked', 'Away', 'Holiday', 'Sick', 'Unavailable'];

export default function CalendarViewNew({
  doctors,
  availability,
  selectedDoctorId,
  onSelectDoctor,
  onAddEvent,
  onDeleteEvent,
}: CalendarViewNewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<AvailabilitySlot> | null>(null);
  const [eventForm, setEventForm] = useState({
    date: '',
    endDate: '',
    status: 'Available' as StatusType,
    title: '',
    location: '',
    notes: '',
  });

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);

  // Filter doctors by search
  const filteredDoctors = useMemo(() => {
    if (!searchQuery) return doctors;
    const q = searchQuery.toLowerCase();
    return doctors.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.ahpraId.toLowerCase().includes(q) ||
        (d.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  }, [doctors, searchQuery]);

  // Get doctor availability
  const doctorAvailability = useMemo(
    () => availability.filter((a) => a.doctorId === selectedDoctorId),
    [availability, selectedDoctorId]
  );

  // Calendar events conversion
  const calendarEvents = useMemo(
    () =>
      doctorAvailability.map((slot) => ({
        id: slot.id,
        title: slot.title || `${slot.status} ${slot.location ? `- ${slot.location}` : ''}`.trim(),
        start: slot.date,
        end: addDays(slot.endDate || slot.date, 1),
        backgroundColor: STATUS_COLORS[slot.status],
        borderColor: STATUS_COLORS[slot.status],
        extendedProps: slot,
      })),
    [doctorAvailability]
  );

  const openEventModal = (event?: Partial<AvailabilitySlot>, date?: string) => {
    if (event) {
      setEditingEvent(event);
      setEventForm({
        date: event.date || '',
        endDate: event.endDate || event.date || '',
        status: event.status || 'Available',
        title: event.title || '',
        location: event.location || '',
        notes: event.notes || '',
      });
    } else {
      setEditingEvent(null);
      setEventForm({
        date: date || dateToIso(new Date()),
        endDate: date || dateToIso(new Date()),
        status: 'Available',
        title: '',
        location: '',
        notes: '',
      });
    }
    setEventModalOpen(true);
  };

  const saveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || !eventForm.date) return;

    try {
      if (editingEvent?.id) {
        await onDeleteEvent(editingEvent.id);
      }

      await onAddEvent({
        doctorId: selectedDoctorId,
        ahpraId: selectedDoctor?.ahpraId || '',
        date: eventForm.date,
        endDate: eventForm.endDate,
        status: eventForm.status,
        title: eventForm.title || eventForm.status,
        location: eventForm.location,
        notes: eventForm.notes,
      });

      setEventModalOpen(false);
    } catch (err) {
      console.error('Error saving event:', err);
    }
  };

  const handleHeatmapNavigation = (direction: 'prev' | 'next' | 'today') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') newDate.setUTCMonth(newDate.getUTCMonth() - 1);
    else if (direction === 'next') newDate.setUTCMonth(newDate.getUTCMonth() + 1);
    else newDate.setUTCMonth(new Date().getUTCMonth());
    setCurrentDate(newDate);
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-950">
      {/* Top Controls */}
      <div className="border-b border-slate-200 dark:border-slate-700 p-4 space-y-3">
        {/* View Mode Buttons */}
        <div className="flex gap-2 flex-wrap">
          {(['calendar', 'heatmap', 'strips', 'finder'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 rounded text-sm font-medium transition ${
                viewMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {mode === 'calendar' && '📅 Calendar'}
              {mode === 'heatmap' && '🔥 Heatmap'}
              {mode === 'strips' && '📊 Strips'}
              {mode === 'finder' && '🔍 Finder'}
            </button>
          ))}
        </div>

        {/* Search & Doctor Selection */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search doctors by name, AHPRA, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'calendar' && (
          <div className="p-4 h-full">
            {selectedDoctor ? (
              <div className="space-y-4">
                {/* Doctor Info */}
                <div className="card">
                  <h3 className="font-bold text-lg">{selectedDoctor.name}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {selectedDoctor.specialty} • AHPRA {selectedDoctor.ahpraId}
                  </p>
                </div>

                {/* FullCalendar */}
                <div className="card min-h-96">
                  <FullCalendar
                    plugins={[dayGridPlugin]}
                    initialView="dayGridMonth"
                    events={calendarEvents}
                    height="auto"
                    headerToolbar={{
                      left: 'prev,next today',
                      center: 'title',
                      right: 'dayGridMonth',
                    }}
                    select={(info: any) => openEventModal(undefined, dateToIso(info.start))}
                    eventClick={(info: any) => openEventModal(info.event.extendedProps)}
                    selectable={true}
                  />
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-slate-500">Select a doctor from the list</p>
              </div>
            )}
          </div>
        )}

        {viewMode === 'heatmap' && (
          <div className="p-4">
            <HeatmapView
              doctors={filteredDoctors}
              availability={availability}
              currentDate={currentDate}
              onNavigate={handleHeatmapNavigation}
            />
          </div>
        )}

        {viewMode === 'strips' && (
          <div className="p-4">
            <StripsView
              doctors={filteredDoctors}
              availability={availability}
              currentDate={currentDate}
              onNavigate={handleHeatmapNavigation}
            />
          </div>
        )}

        {viewMode === 'finder' && (
          <div className="p-4">
            <FinderView doctors={filteredDoctors} availability={availability} />
          </div>
        )}
      </div>

      {/* Doctor List Sidebar - overlaid */}
      <div className="hidden lg:block absolute left-0 top-0 bottom-0 w-80 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 overflow-auto max-h-screen">
        <div className="p-4 space-y-3">
          <h3 className="font-bold text-sm text-slate-600 dark:text-slate-400">DOCTORS</h3>
          {filteredDoctors.map((doctor) => (
            <button
              key={doctor.id}
              onClick={() => onSelectDoctor(selectedDoctorId === doctor.id ? null : doctor.id)}
              className={`w-full text-left p-3 rounded transition ${
                selectedDoctorId === doctor.id
                  ? 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-600'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="font-medium text-sm">{doctor.name}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">{doctor.ahpraId}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Event Modal */}
      {eventModalOpen && (
        <EventModal
          event={eventForm}
          isEditing={!!editingEvent}
          doctors={doctors}
          onSave={saveEvent}
          onClose={() => setEventModalOpen(false)}
          onChange={(field, value) => setEventForm({ ...eventForm, [field]: value })}
          onDelete={editingEvent ? () => onDeleteEvent(editingEvent.id!).then(() => setEventModalOpen(false)) : undefined}
        />
      )}
    </div>
  );
}

// Heatmap View Component
function HeatmapView({
  doctors,
  availability,
  currentDate,
  onNavigate,
}: {
  doctors: Doctor[];
  availability: AvailabilitySlot[];
  currentDate: Date;
  onNavigate: (direction: 'prev' | 'next' | 'today') => void;
}) {
  const { start, endEx, name } = getMonthRange(currentDate);

  const getCountsForDoctor = (ahpraId: string) => {
    let available = 0;
    let booked = 0;
    let other = 0;
    let day = start;
    while (day < endEx) {
      const status = getAvailabilityStatus(availability, ahpraId, day);
      if (status === 'available' || status === 'tentative') available++;
      else if (status === 'booked') booked++;
      else if (status !== 'blank') other++;
      day = addDays(day, 1);
    }
    return { available, booked, other };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">{name} Heatmap</h3>
        <div className="flex gap-2">
          <button onClick={() => onNavigate('prev')} className="btn-secondary px-3 py-1 text-sm">
            ← Prev
          </button>
          <button onClick={() => onNavigate('today')} className="btn-secondary px-3 py-1 text-sm">
            Today
          </button>
          <button onClick={() => onNavigate('next')} className="btn-secondary px-3 py-1 text-sm">
            Next →
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {doctors.map((doc) => {
          const { available, booked } = getCountsForDoctor(doc.ahpraId);
          const total = available + booked;
          const percent = total > 0 ? Math.round((available / total) * 100) : 0;
          return (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded"
            >
              <div className="flex-1">
                <div className="font-medium text-sm">{doc.name}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">{doc.ahpraId}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-sm">{percent}%</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  {available}a/{booked}b
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Strips View Component
function StripsView({
  doctors,
  availability,
  currentDate,
  onNavigate,
}: {
  doctors: Doctor[];
  availability: AvailabilitySlot[];
  currentDate: Date;
  onNavigate: (direction: 'prev' | 'next' | 'today') => void;
}) {
  const { start, endEx, name } = getMonthRange(currentDate);
  const days = diffDays(endEx, start);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">{name} Strips</h3>
        <div className="flex gap-2">
          <button onClick={() => onNavigate('prev')} className="btn-secondary px-3 py-1 text-sm">
            ← Prev
          </button>
          <button onClick={() => onNavigate('today')} className="btn-secondary px-3 py-1 text-sm">
            Today
          </button>
          <button onClick={() => onNavigate('next')} className="btn-secondary px-3 py-1 text-sm">
            Next →
          </button>
        </div>
      </div>

      <div className="space-y-1 overflow-x-auto">
        {doctors.map((doc) => (
          <div key={doc.id} className="flex gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded">
            <div className="w-32 flex-shrink-0 font-medium text-sm truncate">{doc.name}</div>
            <div className="flex gap-0.5 flex-1">
              {Array.from({ length: days }).map((_, i) => {
                const day = addDays(start, i);
                const status = getAvailabilityStatus(availability, doc.ahpraId, day);
                const color =
                  status === 'available'
                    ? 'bg-green-500'
                    : status === 'booked'
                      ? 'bg-blue-500'
                      : status === 'tentative'
                        ? 'bg-teal-500'
                        : 'bg-gray-200 dark:bg-gray-700';
                return <div key={day} className={`w-1.5 h-6 rounded ${color}`} title={day} />;
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Finder View Component
function FinderView({
  doctors: allDoctors,
  availability,
}: {
  doctors: Doctor[];
  availability: AvailabilitySlot[];
}) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [results, setResults] = useState<FinderResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const search = () => {
    if (!startDate || !endDate) return;

    const results: FinderResult[] = allDoctors.map((doc) => {
      let available = 0;
      let booked = 0;
      let other = 0;
      let day = startDate;
      while (day <= endDate) {
        const status = getAvailabilityStatus(availability, doc.ahpraId, day);
        if (status === 'available' || status === 'tentative') available++;
        else if (status === 'booked') booked++;
        else if (status !== 'blank') other++;
        day = addDays(day, 1);
      }
      const total = available + booked + other;
      return {
        doctor: doc,
        availableDays: available,
        bookedDays: booked,
        otherDays: other,
        totalDays: total,
        percentAvailable: total > 0 ? Math.round((available / total) * 100) : 0,
      };
    });

    setResults(results.sort((a, b) => b.percentAvailable - a.percentAvailable));
    setShowResults(true);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold">Who's Available?</h3>

      <div className="flex gap-2">
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="input flex-1"
        />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input flex-1" />
        <button onClick={search} className="btn-primary px-6">
          Search
        </button>
      </div>

      {showResults && (
        <div className="space-y-2">
          {results.map((r) => (
            <div
              key={r.doctor.id}
              className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded"
            >
              <div>
                <div className="font-medium">{r.doctor.name}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  {r.availableDays} available · {r.bookedDays} booked
                </div>
              </div>
              <div className="font-bold text-lg">{r.percentAvailable}%</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Event Modal Component
function EventModal({
  event,
  isEditing,
  onSave,
  onClose,
  onChange,
  onDelete,
}: {
  event: any;
  isEditing: boolean;
  doctors?: Doctor[];
  onSave: (e: React.FormEvent) => void;
  onClose: () => void;
  onChange: (field: string, value: any) => void;
  onDelete?: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="card max-w-lg w-full mx-4 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">{isEditing ? 'Edit' : 'Add'} Availability</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSave} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">Status</label>
            <select
              value={event.status}
              onChange={(e) => onChange('status', e.target.value)}
              className="input w-full"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium mb-1">Start Date</label>
              <input
                type="date"
                value={event.date}
                onChange={(e) => onChange('date', e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">End Date</label>
              <input
                type="date"
                value={event.endDate}
                onChange={(e) => onChange('endDate', e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Title (optional)</label>
            <input
              type="text"
              value={event.title}
              onChange={(e) => onChange('title', e.target.value)}
              placeholder="e.g., Locum at Port Hedland"
              className="input"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Location (optional)</label>
            <input
              type="text"
              value={event.location}
              onChange={(e) => onChange('location', e.target.value)}
              placeholder="e.g., Port Hedland Hospital"
              className="input"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Notes (optional)</label>
            <textarea
              value={event.notes}
              onChange={(e) => onChange('notes', e.target.value)}
              placeholder="Additional notes..."
              className="input resize-none"
              rows={2}
            />
          </div>

          <div className="flex gap-2 justify-between pt-4">
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="btn-secondary px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Delete
              </button>
            )}
            <div className="flex gap-2 flex-1 justify-end">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
