import React, { useCallback, useRef, useState } from 'react';
import { findNodeHandle, TouchableOpacity, StyleSheet } from 'react-native';
import { isTV } from '../utils/tv';

/**
 * FocusableButton
 *
 * En Android TV / Fire TV dejamos que react-native-tvos maneje el D-pad de forma
 * nativa. El componente pinta un foco local estilo premium: escala suave y glow,
 * sin cursor global flotante.
 */
export default function FocusableButton({
  children,
  style,
  focusedStyle,
  onPress,
  activeOpacity = 0.85,
  hasTVPreferredFocus = false,
  // Props legacy aceptadas para no romper llamadas existentes:
  showFocusLabel, // eslint-disable-line no-unused-vars
  focusLabel,     // eslint-disable-line no-unused-vars
  focusId,        // eslint-disable-line no-unused-vars
  disableDefaultFocusStyle = false,
  trapFocusLeft = false,
  trapFocusRight = false,
  trapFocusUp = false,
  trapFocusDown = false,
  disabled = false,
  ...props
}) {
  const [focused, setFocused] = useState(false);
  const [nativeHandle, setNativeHandle] = useState(null);
  const ref = useRef(null);
  const pressRef = useRef(null);
  const usesInternalFocusState = !disableDefaultFocusStyle || Boolean(focusedStyle);
  const visuallyFocused = usesInternalFocusState && focused;

  pressRef.current = (...args) => {
    if (disabled) return;
    onPress?.(...args);
  };

  const handlePress = useCallback((...args) => {
    pressRef.current?.(...args);
  }, []);

  return (
    <TouchableOpacity
      {...props}
      ref={ref}
      focusable={props.focusable !== undefined ? props.focusable : !disabled}
      isTVSelectable={props.isTVSelectable !== undefined ? props.isTVSelectable : !disabled}
      tvParallaxProperties={{ enabled: false }}
      hasTVPreferredFocus={hasTVPreferredFocus}
      nextFocusLeft={trapFocusLeft && isTV ? nativeHandle : props.nextFocusLeft}
      nextFocusRight={trapFocusRight && isTV ? nativeHandle : props.nextFocusRight}
      nextFocusUp={trapFocusUp && isTV ? nativeHandle : props.nextFocusUp}
      nextFocusDown={trapFocusDown && isTV ? nativeHandle : props.nextFocusDown}
      activeOpacity={activeOpacity}
      collapsable={false}
      disabled={disabled}
      onLayout={(event) => {
        if (isTV && (trapFocusLeft || trapFocusRight || trapFocusUp || trapFocusDown)) {
          const handle = findNodeHandle(ref.current);
          if (handle && handle !== nativeHandle) setNativeHandle(handle);
        }
        props.onLayout?.(event);
      }}
      onFocus={(event) => {
        if (usesInternalFocusState) setFocused(true);
        props.onFocus?.(event);
      }}
      onBlur={(event) => {
        if (usesInternalFocusState) setFocused(false);
        props.onBlur?.(event);
      }}
      onPress={handlePress}
      style={[
        styles.base,
        style,
        visuallyFocused && !disableDefaultFocusStyle && !isTV && styles.focusedBase,
        visuallyFocused && focusedStyle,
        visuallyFocused && !disableDefaultFocusStyle && isTV && styles.tvFocused,
      ]}
    >
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    position: 'relative',
    overflow: 'visible',
  },
  focusedBase: {
    borderColor: '#32C5FF',
    backgroundColor: 'rgba(50, 197, 255, 0.08)',
  },
  tvFocused: {
    borderColor: '#9B5CFF',
    backgroundColor: 'rgba(155, 92, 255, 0.14)',
  },
});
