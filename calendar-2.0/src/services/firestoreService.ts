import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Doctor, AvailabilitySlot } from '../types';

// Doctors
export async function addDoctor(
  userId: string,
  data: Omit<Doctor, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Doctor> {
  const docRef = await addDoc(collection(db, `users/${userId}/doctors`), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  return {
    id: docRef.id,
    ...data,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export async function loadDoctors(userId: string): Promise<Doctor[]> {
  const q = query(collection(db, `users/${userId}/doctors`));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toMillis?.() || Date.now(),
    updatedAt: doc.data().updatedAt?.toMillis?.() || Date.now(),
  })) as Doctor[];
}

export async function deleteDoctor(userId: string, doctorId: string): Promise<void> {
  await deleteDoc(doc(db, `users/${userId}/doctors`, doctorId));
}

// Availability
export async function addAvailability(
  userId: string,
  data: Omit<AvailabilitySlot, 'id' | 'createdAt' | 'updatedAt'>
): Promise<AvailabilitySlot> {
  const docRef = await addDoc(
    collection(db, `users/${userId}/availability`),
    {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }
  );

  return {
    id: docRef.id,
    ...data,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export async function loadAvailability(userId: string): Promise<AvailabilitySlot[]> {
  const q = query(collection(db, `users/${userId}/availability`));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toMillis?.() || Date.now(),
    updatedAt: doc.data().updatedAt?.toMillis?.() || Date.now(),
  })) as AvailabilitySlot[];
}

export async function deleteAvailability(
  userId: string,
  availabilityId: string
): Promise<void> {
  await deleteDoc(doc(db, `users/${userId}/availability`, availabilityId));
}

// Import/Export
export function exportToJSON(doctors: Doctor[], availability: AvailabilitySlot[]) {
  const data = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    doctors,
    availability,
  };

  const dataStr = JSON.stringify(data, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `availability-backup-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function importFromJSON(file: File): Promise<{
  doctors: Doctor[];
  availability: AvailabilitySlot[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        // Support both 1.0 and 2.0 formats
        if (parsed.version === '2.0') {
          resolve({
            doctors: parsed.doctors || [],
            availability: parsed.availability || [],
          });
        } else if (parsed.doctors) {
          // Auto-detect 1.0 format
          resolve({
            doctors: parsed.doctors || [],
            availability: parsed.availability || [],
          });
        } else {
          reject(new Error('Invalid backup file format'));
        }
      } catch (error) {
        reject(new Error('Failed to parse backup file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
