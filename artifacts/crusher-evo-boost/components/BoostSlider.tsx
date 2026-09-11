import React, { useRef } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

type BoostSliderProps = {
  value: number;
  onChange: (value: number) => void;
  label: string;
  helper: string;
  enabled?: boolean;
  onToggle?: () => void;
};

export function BoostSlider({ value, onChange, label, helper, enabled = true, onToggle }: BoostSliderProps) {
  const colors = useColors();
  const trackWidthRef = useRef(1);
  const trackLeftRef = useRef(0);
  const trackRef = useRef<View>(null);

  const setFromPageX = (pageX: number) => {
    const next = Math.round(
      Math.min(100, Math.max(0, ((pageX - trackLeftRef.current) / trackWidthRef.current) * 100)),
    );
    if (enabled) onChange(next);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (_, gestureState) => setFromPageX(gestureState.moveX),
      onPanResponderMove: (_, gestureState) => setFromPageX(gestureState.moveX),
    }),
  ).current;

  const handleTrackLayout = () => {
    trackRef.current?.measureInWindow((x, _y, width) => {
      if (width > 0) {
        trackWidthRef.current = width;
        trackLeftRef.current = x;
      }
    });
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <View>
          <Text style={[styles.label, { color: enabled ? colors.foreground : colors.mutedForeground }]}>{label}</Text>
          <Text style={[styles.helper, { color: colors.mutedForeground }]}>{helper}</Text>
        </View>
        <View style={styles.rightControls}>
          <Text style={[styles.value, { color: enabled ? colors.primary : colors.mutedForeground }]}>{value}%</Text>
          {onToggle ? (
            <Pressable
              testID={`${label}-toggle`}
              accessibilityRole="switch"
              accessibilityState={{ checked: enabled }}
              onPress={onToggle}
              style={({ pressed }) => [
                styles.toggle,
                { backgroundColor: enabled ? colors.primary : colors.secondary, flexDirection: enabled ? 'row-reverse' : 'row', opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View style={[styles.toggleKnob, { backgroundColor: enabled ? colors.primaryForeground : colors.mutedForeground }]} />
              <Text style={[styles.toggleText, { color: enabled ? colors.primaryForeground : colors.mutedForeground }]}>
                {enabled ? 'ON' : 'OFF'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      <View
        ref={trackRef}
        onLayout={handleTrackLayout}
        style={[styles.track, { backgroundColor: enabled ? colors.secondary : colors.border, opacity: enabled ? 1 : 0.6 }]}
        hitSlop={{ top: 18, bottom: 18 }}
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min: 0, max: 100, now: value }}
        {...panResponder.panHandlers}
      >
        <View style={[styles.fill, { backgroundColor: colors.primary, width: `${enabled ? value : 0}%` }]} />
        <View
          style={[
            styles.thumb,
            { backgroundColor: enabled ? colors.primary : colors.mutedForeground, left: `${enabled ? value : 0}%`, borderColor: colors.card },
          ]}
        />
      </View>
      <View style={styles.scaleRow}>
        <Text style={[styles.scale, { color: colors.mutedForeground }]}>OFF</Text>
        <Text style={[styles.scale, { color: colors.mutedForeground }]}>MAX</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rightControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  helper: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 3 },
  value: { fontFamily: 'Inter_700Bold', fontSize: 19 },
  toggle: { minWidth: 66, height: 34, borderRadius: 17, paddingHorizontal: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5 },
  toggleKnob: { width: 22, height: 22, borderRadius: 11 },
  toggleText: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 0.5 },
  track: { height: 8, borderRadius: 8, justifyContent: 'center', marginVertical: 18 },
  fill: { height: 8, borderRadius: 8 },
  thumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    marginLeft: -11,
    borderWidth: 4,
  },
  scaleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  scale: { fontFamily: 'Inter_500Medium', fontSize: 10, letterSpacing: 1 },
});