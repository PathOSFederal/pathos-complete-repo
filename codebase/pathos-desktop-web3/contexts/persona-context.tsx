'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

export interface User {
  currentEmployee: boolean;
  name: string;
  gradeStep?: string;
  agency?: string;
  // Job seeker specific fields
  resumeStrength?: number;
  targetGrade?: string;
  targetLocation?: string;
}

interface PersonaContextType {
  user: User;
  setUser: (user: User) => void;
  toggleUserType: () => void;
}

const PersonaContext = createContext<PersonaContextType | undefined>(undefined);

const defaultEmployeeUser: User = {
  currentEmployee: true,
  name: 'Sarah Johnson',
  gradeStep: 'GS-13 Step 5',
  agency: 'USDA',
};

const defaultJobSeekerUser: User = {
  currentEmployee: false,
  name: 'Alex Chen',
  resumeStrength: 72,
  targetGrade: 'GS-11/12',
  targetLocation: 'Washington, DC',
};

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(defaultEmployeeUser);

  const toggleUserType = () => {
    setUser((prev) => (prev.currentEmployee ? defaultJobSeekerUser : defaultEmployeeUser));
  };

  return (
    <PersonaContext.Provider value={{ user, setUser, toggleUserType }}>
      {children}
    </PersonaContext.Provider>
  );
}

export function usePersona() {
  const context = useContext(PersonaContext);
  if (!context) {
    throw new Error('usePersona must be used within PersonaProvider');
  }
  return context;
}
