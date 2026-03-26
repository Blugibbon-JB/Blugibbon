import { useState, useEffect } from 'react';
import type { User, Doctor, AvailabilitySlot } from '../types';
import DoctorList from '../components/DoctorList';
import CalendarView from '../components/CalendarView';
import DoctorForm from '../components/DoctorForm';
import DataSync from '../components/DataSync';
import { loadDoctors, loadAvailability } from '../services/firestoreService';

interface CalendarPageProps {
  user: User;
}

export default function CalendarPage({ user }: CalendarPageProps) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [showDoctorForm, setShowDoctorForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const loadedDoctors = await loadDoctors(user.uid);
        setDoctors(loadedDoctors);

        if (loadedDoctors.length > 0) {
          setSelectedDoctor(loadedDoctors[0]);
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
    <div className="max-w-7xl mx-auto p-4">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Doctor List Card */}
          <div className="card sticky top-24">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3">
              👨‍⚕️ Your Doctors
            </h3>
            {doctors.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                No doctors yet. Add one to get started!
              </p>
            ) : (
              <DoctorList
                doctors={doctors}
                selectedDoctor={selectedDoctor}
                onSelectDoctor={setSelectedDoctor}
              />
            )}

            <button
              onClick={() => setShowDoctorForm(!showDoctorForm)}
              className="btn-primary w-full mt-3"
            >
              {showDoctorForm ? '✕ Cancel' : '+ Add Doctor'}
            </button>

            {showDoctorForm && (
              <DoctorForm
                userId={user.uid}
                onSuccess={(newDoctor) => {
                  setDoctors([...doctors, newDoctor]);
                  setSelectedDoctor(newDoctor);
                  setShowDoctorForm(false);
                }}
                onCancel={() => setShowDoctorForm(false)}
              />
            )}
          </div>

          {/* Data Sync Card */}
          <DataSync
            userId={user.uid}
            doctors={doctors}
            availability={availability}
            onDoctorsUpdate={setDoctors}
            onAvailabilityUpdate={setAvailability}
          />
        </div>

        {/* Main Calendar */}
        <div className="lg:col-span-4">
          {selectedDoctor ? (
            <CalendarView
              doctor={selectedDoctor}
              userId={user.uid}
              availability={availability}
              onAvailabilityUpdate={(updated) => {
                setAvailability(updated);
              }}
            />
          ) : (
            <div className="card text-center py-12">
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                👈 Select or create a doctor to manage their availability
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
