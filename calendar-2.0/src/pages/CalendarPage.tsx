import { useState, useEffect } from 'react';
import type { User, Doctor, AvailabilitySlot } from '../types';
import DoctorForm from '../components/DoctorForm';
import DataSync from '../components/DataSync';
import CalendarViewNew from '../components/CalendarViewNew';
import { loadDoctors, loadAvailability, addAvailability, deleteAvailability } from '../services/firestoreService';

interface CalendarPageProps {
  user: User;
}

export default function CalendarPage({ user }: CalendarPageProps) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [showDoctorForm, setShowDoctorForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const loadedDoctors = await loadDoctors(user.uid);
        setDoctors(loadedDoctors);

        if (loadedDoctors.length > 0) {
          setSelectedDoctorId(loadedDoctors[0].id);
        }

        const loadedAvailability = await loadAvailability(user.uid);
        setAvailability(loadedAvailability);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user.uid]);

  const handleAddEvent = async (event: Partial<AvailabilitySlot>) => {
    try {
      const newEvent = await addAvailability(user.uid, {
        doctorId: event.doctorId || selectedDoctorId || '',
        date: event.date || '',
        endDate: event.endDate,
        status: event.status || 'Available',
        title: event.title,
        location: event.location,
        notes: event.notes,
      } as any);
      setAvailability([...availability, newEvent]);
    } catch (err) {
      console.error('Error adding event:', err);
      throw err;
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await deleteAvailability(user.uid, id);
      setAvailability(availability.filter((a) => a.id !== id));
    } catch (err) {
      console.error('Error deleting event:', err);
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">📅 Blugibbon Availability Calendar</h1>
          <button
            onClick={() => setShowDoctorForm(!showDoctorForm)}
            className="btn-primary text-sm"
          >
            {showDoctorForm ? '✕ Cancel' : '+ Add Doctor'}
          </button>
        </div>

        {showDoctorForm && (
          <div className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-4">
            <DoctorForm
              userId={user.uid}
              onSuccess={(newDoctor) => {
                setDoctors([...doctors, newDoctor]);
                setSelectedDoctorId(newDoctor.id);
                setShowDoctorForm(false);
              }}
              onCancel={() => setShowDoctorForm(false)}
            />
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-5 gap-4 p-4">
        {/* Sidebar - Doctor List */}
        <div className="lg:col-span-1 border border-slate-200 dark:border-slate-700 rounded-lg overflow-y-auto">
          <div className="p-4 space-y-3 sticky top-0 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">DOCTORS</h3>
          </div>
          <div className="p-4 space-y-2">
            {doctors.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-400 text-center py-8">No doctors yet</p>
            ) : (
              doctors.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDoctorId(selectedDoctorId === doc.id ? null : doc.id)}
                  className={`w-full text-left p-3 rounded transition ${
                    selectedDoctorId === doc.id
                      ? 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-600'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="font-medium text-sm">{doc.name}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">{doc.ahpraId}</div>
                  {doc.specialty && (
                    <div className="text-xs text-slate-500 dark:text-slate-500">{doc.specialty}</div>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Data Sync */}
          <div className="border-t border-slate-200 dark:border-slate-700 p-4">
            <DataSync
              userId={user.uid}
              doctors={doctors}
              availability={availability}
              onDoctorsUpdate={setDoctors}
              onAvailabilityUpdate={setAvailability}
            />
          </div>
        </div>

        {/* Calendar Area */}
        <div className="lg:col-span-4 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <CalendarViewNew
            doctors={doctors}
            availability={availability}
            selectedDoctorId={selectedDoctorId}
            onSelectDoctor={setSelectedDoctorId}
            onAddEvent={handleAddEvent}
            onDeleteEvent={handleDeleteEvent}
            onUpdateEvent={async () => {}} // Will be implemented
          />
        </div>
      </div>
    </div>
  );
}
