import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_PROFILE_VALUES } from '@/audio/eqProfiles';
import { DEFAULT_OUTPUT_MODE, type OutputModeId } from '@/audio/outputModes';
import { syncProfileToOutput } from '@/audio/outputRouting';

export type EqProfile = {
  id: string;
  name: string;
  bassBoost: number;
  subBass: number;
  bands: number[];
  isDefault?: boolean;
  updatedAt: number;
};

const STORAGE_KEY = '@crusher-evo-boost/profiles';
const ACTIVE_KEY = '@crusher-evo-boost/active-profile';
const OUTPUT_MODE_KEY = '@crusher-evo-boost/output-mode';

export const DEFAULT_PROFILES: EqProfile[] = [
  {
    id: 'crusher-drive',
    name: 'Crusher Drive',
    ...DEFAULT_PROFILE_VALUES['crusher-drive'],
    isDefault: true,
    updatedAt: 0,
  },
  {
    id: 'night-bass',
    name: 'Night Bass',
    ...DEFAULT_PROFILE_VALUES['night-bass'],
    isDefault: true,
    updatedAt: 0,
  },
  {
    id: 'balanced',
    name: 'Balanced',
    ...DEFAULT_PROFILE_VALUES.balanced,
    isDefault: true,
    updatedAt: 0,
  },
];

type ProfileContextValue = {
  profiles: EqProfile[];
  activeProfile: EqProfile;
  activeId: string;
  hydrated: boolean;
  setActiveId: (id: string) => void;
  updateActive: (changes: Partial<Pick<EqProfile, 'bassBoost' | 'subBass' | 'bands'>>) => void;
  saveProfiles: () => Promise<void>;
  createProfile: () => void;
  deleteProfile: (id: string) => void;
  outputMode: OutputModeId;
  setOutputMode: (mode: OutputModeId) => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<EqProfile[]>(DEFAULT_PROFILES);
  const [activeId, setActiveId] = useState('crusher-drive');
  const [outputMode, setOutputMode] = useState<OutputModeId>(DEFAULT_OUTPUT_MODE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    async function hydrate() {
      try {
        const [storedProfiles, storedActive, storedOutputMode] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(ACTIVE_KEY),
          AsyncStorage.getItem(OUTPUT_MODE_KEY),
        ]);
        if (storedProfiles) setProfiles(JSON.parse(storedProfiles) as EqProfile[]);
        if (storedActive) setActiveId(storedActive);
        if (storedOutputMode) setOutputMode(storedOutputMode as OutputModeId);
      } catch {
        // The defaults remain usable if storage is unavailable.
      } finally {
        setHydrated(true);
      }
    }
    void hydrate();
  }, []);

  useEffect(() => {
    if (hydrated) {
      void AsyncStorage.setItem(ACTIVE_KEY, activeId);
    }
  }, [activeId, hydrated]);

  useEffect(() => {
    if (hydrated) void AsyncStorage.setItem(OUTPUT_MODE_KEY, outputMode);
  }, [outputMode, hydrated]);

  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.id === activeId) ?? profiles[0] ?? DEFAULT_PROFILES[0],
    [activeId, profiles],
  );

  useEffect(() => {
    if (hydrated) void syncProfileToOutput(activeProfile, outputMode);
  }, [activeProfile, hydrated, outputMode]);

  const updateActive = (changes: Partial<Pick<EqProfile, 'bassBoost' | 'subBass' | 'bands'>>) => {
    setProfiles((current) =>
      current.map((profile) =>
        profile.id === activeId ? { ...profile, ...changes, updatedAt: Date.now() } : profile,
      ),
    );
  };

  const saveProfiles = async () => {
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profiles)),
      AsyncStorage.setItem(ACTIVE_KEY, activeId),
    ]);
  };

  const createProfile = () => {
    const id = `custom-${Date.now().toString(36)}`;
    const profile: EqProfile = {
      id,
      name: `My preset ${profiles.filter((item) => !item.isDefault).length + 1}`,
      bassBoost: activeProfile.bassBoost,
      subBass: activeProfile.subBass,
      bands: [...activeProfile.bands],
      updatedAt: Date.now(),
    };
    setProfiles((current) => [...current, profile]);
    setActiveId(id);
  };

  const deleteProfile = (id: string) => {
    const target = profiles.find((profile) => profile.id === id);
    if (!target || target.isDefault) return;
    const next = profiles.filter((profile) => profile.id !== id);
    setProfiles(next);
    if (id === activeId) setActiveId(next[0]?.id ?? DEFAULT_PROFILES[0].id);
  };

  return (
    <ProfileContext.Provider
      value={{
        profiles,
        activeProfile,
        activeId,
        hydrated,
        setActiveId,
        updateActive,
        saveProfiles,
        createProfile,
        deleteProfile,
      outputMode,
      setOutputMode,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfiles() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfiles must be used inside ProfileProvider');
  return context;
}