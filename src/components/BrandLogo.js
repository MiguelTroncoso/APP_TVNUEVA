import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { isTV } from '../utils/tv';

const LOGO = require('../../assets/brand-logo.png');

const SIZES = {
  nav: { width: isTV ? 74 : 86, height: isTV ? 42 : 48 },
  header: { width: isTV ? 150 : 136, height: isTV ? 150 : 136 },
  login: { width: isTV ? 210 : 178, height: isTV ? 210 : 178 },
  profile: { width: isTV ? 178 : 144, height: isTV ? 178 : 144 },
  lock: { width: isTV ? 128 : 112, height: isTV ? 128 : 112 },
  screensaver: { width: isTV ? 300 : 220, height: isTV ? 300 : 220 },
};

export default function BrandLogo({ variant = 'header', style, centered = false }) {
  const size = SIZES[variant] || SIZES.header;

  return (
    <View style={[styles.wrap, centered && styles.centered, style]}>
      <Image source={LOGO} style={[styles.image, size]} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    alignSelf: 'center',
  },
  image: {
    flexShrink: 0,
  },
});
