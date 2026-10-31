import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import logger from '../utils/logger';

const ProfileContext = createContext();
const MAX_PROFILES = 5;
const PROFILES_KEY = 'tvnueva_profiles_v2';

export const ProfileProvider = ({ children }) => {
  const [profiles, setProfiles] = useState([]);
  const [activeProfile, setActiveProfile] = useState(null);
  const [adultUnlocked, setAdultUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadProfiles(); }, []);

  const loadProfiles = async () => {
    try {
      // Leer desde AsyncStorage (más confiable que SecureStore para datos no sensibles)
      const stored = await AsyncStorage.getItem(PROFILES_KEY);
      if (stored) {
        setProfiles(JSON.parse(stored));
        return;
      }
      // Migrar desde SecureStore si existe (primera vez después de actualización)
      try {
        const oldStored = await SecureStore.getItemAsync('tvnueva_profiles');
        if (oldStored) {
          const parsed = JSON.parse(oldStored);
          await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(parsed));
          await SecureStore.deleteItemAsync('tvnueva_profiles').catch(() => {});
          setProfiles(parsed);
        }
      } catch (_) {}
    } catch (e) {
      logger.log('Error cargando perfiles:', e);
    } finally {
      setLoading(false);
    }
  };

  const saveProfiles = async (newProfiles) => {
    await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(newProfiles));
    setProfiles(newProfiles);
  };

  const createProfile = async (name, isKids = false, pin = null, avatar = '👤') => {
    if (profiles.length >= MAX_PROFILES) {
      return { success: false, error: `Máximo ${MAX_PROFILES} perfiles permitidos` };
    }
    const newProfile = {
      id: Date.now().toString(),
      name: name.trim(),
      isKids,
      pin: pin || null,
      avatar,
      createdAt: new Date().toISOString(),
    };
    await saveProfiles([...profiles, newProfile]);
    return { success: true, profile: newProfile };
  };

  const updateProfile = async (profileId, changes = {}) => {
    const updated = profiles.map(p =>
      p.id !== profileId ? p : { ...p, ...changes, updatedAt: new Date().toISOString() }
    );
    await saveProfiles(updated);
    if (activeProfile?.id === profileId) {
      setActiveProfile(updated.find(p => p.id === profileId) || null);
      setAdultUnlocked(false);
    }
    return { success: true };
  };

  const deleteProfile = async (profileId) => {
    await saveProfiles(profiles.filter(p => p.id !== profileId));
    if (activeProfile?.id === profileId) {
      setActiveProfile(null);
      setAdultUnlocked(false);
    }
  };

  const selectProfile = async (profile, enteredPin = null) => {
    if (profile.pin && profile.pin !== enteredPin) {
      return { success: false, error: 'PIN incorrecto' };
    }
    setActiveProfile(profile);
    // Si el perfil no es kids y tiene PIN que ya fue validado,
    // considerarlo como adulto desbloqueado — evita pedir el PIN dos veces
    if (!profile.isKids && profile.pin && profile.pin === enteredPin) {
      setAdultUnlocked(true);
    } else {
      setAdultUnlocked(false);
    }
    return { success: true };
  };

  const changeProfile = () => {
    setActiveProfile(null);
    setAdultUnlocked(false);
  };

  const verifyAdultPin = async (enteredPin) => {
    // Busca cualquier perfil adulto con PIN; si ninguno tiene PIN, desbloquea directo
    const adultWithPin = profiles.find(p => !p.isKids && p.pin);
    if (!adultWithPin) { setAdultUnlocked(true); return true; }
    if (adultWithPin.pin === enteredPin) { setAdultUnlocked(true); return true; }
    return false;
  };

  const value = useMemo(() => ({
    profiles,
    activeProfile,
    adultUnlocked,
    loading,
    maxProfiles: MAX_PROFILES,
    createProfile,
    updateProfile,
    deleteProfile,
    selectProfile,
    changeProfile,
    setActiveProfile,
    verifyAdultPin,
  }), [profiles, activeProfile, adultUnlocked, loading]);

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => useContext(ProfileContext);
