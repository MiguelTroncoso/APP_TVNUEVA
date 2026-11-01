import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, TextInput, Modal,
  useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProfile } from '../context/ProfileContext';
import { colors, shadows } from '../theme';
import { isTV, isTablet, layout } from '../utils/tv';
import BrandLogo from '../components/BrandLogo';

const AVATARS = ['👤','👦','👧','👨','👩','🧑','👴','👵','🦁','🐯','🐻','🦊','🤖','🚀','⚽','🎬','🎵','🌟'];

// ProfileFormModal DEFINIDO FUERA del componente principal.
// Esto es CRÍTICO: si se define dentro, se recrea en cada render (cada tecla)
// y React desmonta/remonta el TextInput, cerrando el teclado en cada letra.
function ProfileFormModal({
  visible, title, onClose, onSubmit, submitText,
  avatar, setAvatar, name, setName, pin, setPin, isKids, setIsKids,
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { maxWidth: isTV ? 480 : isTablet ? 440 : '100%' }]}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.label}>Avatar</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.avatarRow} keyboardShouldPersistTaps="always">
            {AVATARS.map(av => (
              <TouchableOpacity
                key={av}
                style={[styles.avatarOption, avatar === av && styles.avatarOptionActive]}
                onPress={() => setAvatar(av)}
              >
                <Text style={styles.avatarOptionText}>{av}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.label}>Nombre</Text>
          <TextInput style={styles.input} placeholder="Ej: Miguel" placeholderTextColor="#555"
            value={name} onChangeText={setName} maxLength={16}
            autoCapitalize="words" autoCorrect={false} />
          <Text style={styles.label}>PIN opcional (4 dígitos)</Text>
          <TextInput style={styles.input} placeholder="Dejar vacío para sin PIN" placeholderTextColor="#555"
            value={pin} onChangeText={setPin} keyboardType="numeric" secureTextEntry maxLength={4} />
          <TouchableOpacity style={[styles.kidsToggle, isKids && styles.kidsToggleActive]} onPress={() => setIsKids(!isKids)}>
            <Text style={styles.kidsToggleText}>{isKids ? '✅ Perfil Kids activado — filtra contenido adulto' : '👶 Activar modo Kids'}</Text>
          </TouchableOpacity>
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={onSubmit}><Text style={styles.saveText}>{submitText}</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function ProfileSelectScreen({ navigation }) {
  const { profiles, maxProfiles, createProfile, updateProfile, deleteProfile, selectProfile } = useProfile();
  const { width } = useWindowDimensions();

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedForPin, setSelectedForPin] = useState(null);
  const [editingProfile, setEditingProfile] = useState(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [isKids, setIsKids] = useState(false);
  const [avatar, setAvatar] = useState('👤');

  const avatarSize = isTV ? 110 : isTablet ? 90 : 78;
  const cardWidth = isTV ? 160 : isTablet ? 140 : 120;

  const resetForm = () => { setName(''); setPin(''); setIsKids(false); setAvatar('👤'); setEditingProfile(null); };

  const handleSelectProfile = async (profile) => {
    // El navegador cambia solo a MainTabs cuando hay perfil activo.
    await selectProfile(profile);
  };

  const handlePinConfirm = async (enteredPinValue) => {
    const pinToCheck = enteredPinValue || enteredPin;
    const result = await selectProfile(selectedForPin);
    if (result.success) {
      setShowPinModal(false);
      setEnteredPin('');
    } else {
      Alert.alert('PIN incorrecto', 'Intentá de nuevo');
      setEnteredPin('');
    }
  };

  const validateForm = () => {
    if (!name.trim()) { Alert.alert('Error', 'Ingresá un nombre para el perfil'); return false; }
    if (name.trim().length < 2) { Alert.alert('Error', 'El nombre debe tener al menos 2 caracteres'); return false; }
    if (pin && pin.length > 0 && pin.length !== 4) { Alert.alert('Error', 'El PIN debe tener exactamente 4 dígitos o dejarlo vacío'); return false; }
    return true;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    const result = await createProfile(name.trim(), isKids, pin || null, avatar);
    if (result.success) { setShowCreate(false); resetForm(); }
    else Alert.alert('Error', result.error);
  };

  const handleUpdate = async () => {
    if (!editingProfile || !validateForm()) return;
    await updateProfile(editingProfile.id, { name: name.trim(), isKids, pin: pin || null, avatar });
    setShowEdit(false);
    resetForm();
  };

  const confirmDelete = (profile) => {
    Alert.alert('Eliminar perfil', `¿Eliminar el perfil "${profile.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteProfile(profile.id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <BrandLogo variant={isTV ? 'profile' : 'lock'} style={styles.logo} centered />
      <Text style={styles.title}>¿Quién está viendo?</Text>
      <Text style={styles.subtitle}>Elige tu perfil para continuar</Text>

      <ScrollView contentContainerStyle={styles.profilesGrid} showsVerticalScrollIndicator={false}>
        {profiles.map((profile, idx) => (
          <View key={profile.id} style={[styles.profileBlock, { width: cardWidth }]}>
            <TouchableOpacity
              style={styles.profileCard}
              onPress={() => handleSelectProfile(profile)}
              activeOpacity={0.8}
              hasTVPreferredFocus={isTV && idx === 0}
            >
              <View style={[
                styles.avatarContainer,
                { width: avatarSize, height: avatarSize, borderRadius: avatarSize * 0.25 },
                profile.isKids && styles.avatarKids,
              ]}>
                <Text style={[styles.avatar, { fontSize: avatarSize * 0.45 }]}>{profile.avatar}</Text>
                
              </View>
              <Text style={styles.profileName} numberOfLines={1}>{profile.name}</Text>
              {profile.isKids && <Text style={styles.kidsLabel}>KIDS</Text>}
            </TouchableOpacity>
            <View style={styles.profileActions}>
              <TouchableOpacity style={styles.smallAction} onPress={() => {
                setEditingProfile(profile);
                setName(profile.name || ''); setPin(profile.pin || '');
                setIsKids(!!profile.isKids); setAvatar(profile.avatar || '👤');
                setShowEdit(true);
              }}>
                <Text style={styles.smallActionText}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallAction} onPress={() => confirmDelete(profile)}>
                <Text style={styles.smallActionText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {profiles.length < maxProfiles && (
          <View style={{ width: cardWidth, alignItems: 'center' }}>
            <TouchableOpacity style={[styles.addCard, { width: avatarSize, height: avatarSize, borderRadius: avatarSize * 0.25 }]} onPress={() => { resetForm(); setShowCreate(true); }}>
              <Text style={styles.addIconText}>+</Text>
            </TouchableOpacity>
            <Text style={styles.addText}>Nuevo perfil</Text>
          </View>
        )}
      </ScrollView>

      <ProfileFormModal visible={showCreate} title="Nuevo perfil"
        onClose={() => { setShowCreate(false); resetForm(); }} onSubmit={handleCreate} submitText="Crear"
        avatar={avatar} setAvatar={setAvatar} name={name} setName={setName}
        pin={pin} setPin={setPin} isKids={isKids} setIsKids={setIsKids} />
      <ProfileFormModal visible={showEdit} title="Editar perfil"
        onClose={() => { setShowEdit(false); resetForm(); }} onSubmit={handleUpdate} submitText="Guardar"
        avatar={avatar} setAvatar={setAvatar} name={name} setName={setName}
        pin={pin} setPin={setPin} isKids={isKids} setIsKids={setIsKids} />

      {/* PIN Modal */}
      <Modal visible={showPinModal} transparent animationType="fade" onRequestClose={() => setShowPinModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.pinCard, { maxWidth: isTV ? 380 : 340 }]}>
            <Text style={styles.pinTitle}>🔒 Perfil protegido</Text>
            <Text style={styles.pinSubtitle}>PIN de {selectedForPin?.name}</Text>
            <TextInput
              style={styles.pinInput}
              placeholder="• • • •"
              placeholderTextColor="#555"
              value={enteredPin}
              onChangeText={setEnteredPin}
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPinModal(false)}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={() => handlePinConfirm()}>
                <Text style={styles.saveText}>Entrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', paddingTop: isTV ? 40 : 20 },
  logo: { marginBottom: 16 },
  title: { color: colors.white, fontSize: isTV ? 28 : isTablet ? 24 : 20, fontWeight: 'bold', marginBottom: 6 },
  subtitle: { color: colors.textSecondary, fontSize: isTV ? 16 : 13, marginBottom: isTV ? 40 : 28 },
  profilesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: isTV ? 32 : isTablet ? 24 : 18, paddingHorizontal: 20, paddingBottom: 30 },
  profileBlock: { alignItems: 'center' },
  profileCard: { alignItems: 'center' },
  avatarContainer: {
    backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#2a2a3a', marginBottom: 10, ...shadows.glowPurple,
  },
  avatarKids: { borderColor: colors.accent },
  avatar: {},
  pinIcon: { position: 'absolute', right: 6, bottom: 6, fontSize: 14 },
  profileName: { color: colors.white, fontSize: isTV ? 16 : 13, fontWeight: '600', textAlign: 'center', marginTop: 2 },
  kidsLabel: { color: colors.accent, fontSize: isTV ? 12 : 10, fontWeight: 'bold', marginTop: 3, letterSpacing: 1 },
  profileActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  smallAction: { backgroundColor: '#0f0f14', borderWidth: 1, borderColor: '#2a2a3a', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  smallActionText: { fontSize: isTV ? 18 : 14 },
  addCard: { borderWidth: 2, borderColor: colors.primary, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  addIconText: { color: colors.primary, fontSize: 42, fontWeight: '300' },
  addText: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { width: '100%', backgroundColor: colors.card, borderRadius: 20, padding: 22, borderWidth: 1, borderColor: '#2a2a3a' },
  modalTitle: { color: colors.white, fontSize: isTV ? 22 : 18, fontWeight: 'bold', marginBottom: 18 },
  label: { color: colors.accent, fontSize: 11, fontWeight: '600', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' },
  avatarRow: { marginBottom: 16, maxHeight: 60 },
  avatarOption: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#0f0f14', justifyContent: 'center', alignItems: 'center', marginRight: 8, borderWidth: 1, borderColor: '#2a2a3a' },
  avatarOptionActive: { borderColor: colors.accent, backgroundColor: colors.primary },
  avatarOptionText: { fontSize: 28 },
  input: { backgroundColor: '#0f0f14', color: colors.white, borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#2a2a3a', marginBottom: 14 },
  kidsToggle: { backgroundColor: '#0f0f14', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2a2a3a', marginBottom: 18 },
  kidsToggleActive: { borderColor: colors.accent, backgroundColor: '#102430' },
  kidsToggleText: { color: colors.white, fontWeight: '600', textAlign: 'center', fontSize: 13 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, backgroundColor: '#1E1E24', padding: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, padding: 14, borderRadius: 10, alignItems: 'center' },
  cancelText: { color: colors.textSecondary, fontWeight: '600' },
  saveText: { color: colors.white, fontWeight: 'bold' },
  pinCard: { width: '100%', backgroundColor: colors.card, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#2a2a3a' },
  pinTitle: { color: colors.white, fontSize: isTV ? 22 : 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  pinSubtitle: { color: colors.textSecondary, textAlign: 'center', marginBottom: 18, fontSize: isTV ? 15 : 13 },
  pinInput: { backgroundColor: '#0f0f14', color: colors.white, borderRadius: 12, padding: 14, fontSize: 22, textAlign: 'center', letterSpacing: 6, borderWidth: 1, borderColor: '#2a2a3a', marginBottom: 18 },
});
