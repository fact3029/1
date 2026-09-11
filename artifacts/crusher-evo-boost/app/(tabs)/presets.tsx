import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProfiles } from '@/context/ProfileContext';
import { useColors } from '@/hooks/useColors';

export default function PresetsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profiles, activeId, setActiveId, createProfile, deleteProfile, saveProfiles } = useProfiles();

  const apply = async (id: string) => {
    setActiveId(id);
    await saveProfiles();
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const addProfile = () => {
    createProfile();
    Alert.alert('新しいプリセット', '新しいプリセットを作成しました。ホームで値を調整して保存できます。');
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 22, paddingBottom: insets.bottom + 110 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>YOUR SOUND</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Presets</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>一度保存した音は、もう失わない。</Text>
        </View>
        <Pressable
          testID="create-profile"
          accessibilityRole="button"
          onPress={addProfile}
          style={({ pressed }) => [styles.addButton, { backgroundColor: colors.accent, opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather name="plus" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.list}>
        {profiles.map((profile) => {
          const active = profile.id === activeId;
          return (
            <View key={profile.id} style={[styles.profileCard, { backgroundColor: colors.card, borderColor: active ? colors.primary : colors.border }]}>
              <View style={[styles.profileIcon, { backgroundColor: active ? colors.accent : colors.secondary }]}>
                <Feather name={profile.isDefault ? 'zap' : 'sliders'} size={18} color={active ? colors.primary : colors.mutedForeground} />
              </View>
              <View style={styles.profileCopy}>
                <View style={styles.nameRow}>
                  <Text style={[styles.profileName, { color: colors.foreground }]}>{profile.name}</Text>
                  {active ? (
                    <View style={[styles.activePill, { backgroundColor: colors.accent }]}>
                      <Text style={[styles.activePillText, { color: colors.primary }]}>ACTIVE</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.profileMeta, { color: colors.mutedForeground }]}>
                  Bass {profile.bassEnabled !== false ? `${profile.bassBoost}%` : 'OFF'}  ·  Sub-bass {profile.subBass > 0 ? '+' : ''}{profile.subBass} dB
                </Text>
              </View>
              <View style={styles.actions}>
                {!active ? (
                  <Pressable
                    testID={`apply-${profile.id}`}
                    accessibilityRole="button"
                    onPress={() => void apply(profile.id)}
                    style={({ pressed }) => [styles.applyButton, { borderColor: colors.border, opacity: pressed ? 0.5 : 1 }]}
                  >
                    <Text style={[styles.applyLabel, { color: colors.foreground }]}>適用</Text>
                  </Pressable>
                ) : null}
                {!profile.isDefault ? (
                  <Pressable
                    testID={`delete-${profile.id}`}
                    accessibilityRole="button"
                    onPress={() => deleteProfile(profile.id)}
                    hitSlop={10}
                    style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                  >
                    <Feather name="trash-2" size={16} color={colors.mutedForeground} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      <View style={[styles.tipCard, { backgroundColor: colors.accent }]}>
        <Feather name="bookmark" size={18} color={colors.primary} />
        <View style={styles.tipCopy}>
          <Text style={[styles.tipTitle, { color: colors.foreground }]}>設定はこのiPhoneに保存</Text>
          <Text style={[styles.tipBody, { color: colors.mutedForeground }]}>
            アプリを閉じても、次に開いたとき同じプロファイルから再開します。
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.5 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 34, letterSpacing: -1.2, marginTop: 7 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, marginTop: 5 },
  addButton: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  list: { gap: 10 },
  profileCard: { minHeight: 76, borderRadius: 20, borderWidth: 1, flexDirection: 'row', alignItems: 'center', padding: 13, gap: 12 },
  profileIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  profileCopy: { flex: 1, gap: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  profileName: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  activePill: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5 },
  activePillText: { fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 0.8 },
  profileMeta: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  applyButton: { borderWidth: 1, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 9 },
  applyLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  tipCard: { borderRadius: 20, padding: 16, flexDirection: 'row', gap: 12 },
  tipCopy: { flex: 1, gap: 4 },
  tipTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  tipBody: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
});