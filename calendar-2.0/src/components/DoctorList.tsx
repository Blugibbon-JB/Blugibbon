import type { Doctor } from '../types';

interface DoctorListProps {
  doctors: Doctor[];
  selectedDoctor: Doctor | null;
  onSelectDoctor: (doctor: Doctor) => void;
}

export default function DoctorList({
  doctors,
  selectedDoctor,
  onSelectDoctor,
}: DoctorListProps) {
  return (
    <div className="space-y-2">
      {doctors.map((doctor) => (
        <button
          key={doctor.id}
          onClick={() => onSelectDoctor(doctor)}
          className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
            selectedDoctor?.id === doctor.id
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 border-l-4 border-blue-600'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: doctor.color || '#3b82f6' }}
            />
            <div>
              <p className="font-medium text-sm">{doctor.name}</p>
              {doctor.specialty && (
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {doctor.specialty}
                </p>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
