import React, { useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

type BoostSliderProps = {
  value: number;
  onChange: (value: number) => void;
  label: string;
  helper: string;
};

export function BoostSlider({ value, onChange, label, helper }: BoostSliderProps) {
  const colors = useColors();
  const trackWidthRef = useRef(1);
  const trackLeftRef = useRef(0);
  const trackRef = useRef<View>(null);

  const setFromPageX = (pageX: number) => {
    const next = Math.round(
      Math.min(100, Math.max(0, ((pageX - trackLeftRef.current) / trackWidthRef.current) * 100)),
    );
    onChange(next);
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
          <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
          <Text style={[styles.helper, { color: colors.mutedForeground }]}>{helper}</Text>
        </View>
        <Text style={[styles.value, { color: colors.primary }]}>{value}%</Text>
      </View>
      <View
        ref={trackRef}
        onLayout={handleTrackLayout}
        style={[styles.track, { backgroundColor: colors.secondary }]}
        hitSlop={{ top: 18, bottom: 18 }}
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min: 0, max: 100, now: value }}
        {...panResponder.panHandlers}
      >
        <View style={[styles.fill, { backgroundColor: colors.primary, width: `${value}%` }]} />
        <View
          style={[
            styles.thumb,
            { backgroundColor: colors.primary, left: `${value}%`, borderColor: colors.card },
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
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  helper: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 3 },
  value: { fontFamily: 'Inter_700Bold', fontSize: 19 },
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