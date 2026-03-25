import { useState } from 'react';
import type { Doctor, AvailabilitySlot } from '../types';
import { exportToJSON, importFromJSON, addDoctor, addAvailability } from '../services/firestoreService';
import { Download, Upload } from 'lucide-react';

interface DataSyncProps {
  userId: string;
  doctors: Doctor[];
  availability: AvailabilitySlot[];
  onDoctorsUpdate: (doctors: Doctor[]) => void;
  onAvailabilityUpdate: (availability: AvailabilitySlot[]) => void;
}

export default function DataSync({
  userId,
  doctors,
  availability,
  onDoctorsUpdate,
  onAvailabilityUpdate,
}: DataSyncProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleExport = () => {
    try {
      exportToJSON(doctors, availability);
      setSuccess('Backup downloaded successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const { doctors: importedDoctors, availability: importedAvailability } =
        await importFromJSON(file);

      if (importedDoctors.length === 0 && importedAvailability.length === 0) {
        throw new Error('No data found in backup file');
      }

      // Check if user wants to merge or replace
      const shouldMerge = window.confirm(
        `Found ${importedDoctors.length} doctors and ${importedAvailability.length} availability slots.\n\nClick OK to merge with existing data, or Cancel to replace.`
      );

      let allDoctors = shouldMerge ? [...doctors] : [];
      let allAvailability = shouldMerge ? [...availability] : [];

      // Import doctors
      for (const doctor of importedDoctors) {
        const { id, createdAt, updatedAt, ...doctorData } = doctor;
        const newDoctor = await addDoctor(userId, doctorData);
        allDoctors.push(newDoctor);
      }

      // Create a mapping of old doctor IDs to new IDs (for availability import)
      const doctorIdMap: Record<string, string> = {};
      importedDoctors.forEach((oldDoc, idx) => {
        if (allDoctors[shouldMerge ? doctors.length + idx : idx]) {
          doctorIdMap[oldDoc.id] = allDoctors[shouldMerge ? doctors.length + idx : idx].id;
        }
      });

      // Import availability with mapped doctor IDs
      for (const slot of importedAvailability) {
        const { id, createdAt, updatedAt, ...slotData } = slot;
        const mappedDoctorId = doctorIdMap[slotData.doctorId] || slotData.doctorId;

        const newSlot = await addAvailability(userId, {
          ...slotData,
          doctorId: mappedDoctorId,
        });
        allAvailability.push(newSlot);
      }

      onDoctorsUpdate(allDoctors);
      onAvailabilityUpdate(allAvailability);
      setSuccess(
        `Imported ${importedDoctors.length} doctors and ${importedAvailability.length} availability slots!`
      );
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  return (
    <div className="card space-y-3 border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/10">
      <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
        💾 Data Management
      </h3>

      <div className="space-y-2">
        <button
          onClick={handleExport}
          className="btn-secondary w-full flex items-center justify-center gap-2"
        >
          <Download size={18} />
          Export Backup
        </button>

        <label className="btn-secondary w-full flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-600">
          <Upload size={18} />
          {loading ? 'Importing...' : 'Import Backup (1.0 compatible)'}
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            disabled={loading}
            className="hidden"
          />
        </label>
      </div>

      {error && (
        <div className="p-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded text-xs">
          ❌ {error}
        </div>
      )}

      {success && (
        <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded text-xs">
          ✅ {success}
        </div>
      )}

      <p className="text-xs text-slate-600 dark:text-slate-400">
        💡 Backups are compatible with version 1.0. Import old backups anytime!
      </p>
    </div>
  );
}
