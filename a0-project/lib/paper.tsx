import React from 'react';
import {
  Modal as RNModal,
  Pressable,
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  View,
} from 'react-native';
import { colors, spacing } from './theme';

export function PaperProvider({ children }: any) {
  return <>{children}</>;
}

export function Text({ children, style, ...props }: any) {
  return (
    <RNText {...props} style={[styles.text, style]}>
      {children}
    </RNText>
  );
}

export function Button({ children, onPress, style, labelStyle, mode, disabled }: any) {
  const contained = mode === 'contained';
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }: { pressed: boolean }) => [
        styles.button,
        contained ? styles.containedButton : styles.outlinedButton,
        disabled && styles.disabledButton,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <RNText style={[contained ? styles.containedButtonText : styles.outlinedButtonText, labelStyle]}>
        {children}
      </RNText>
    </Pressable>
  );
}

function CardRoot({ children, style }: any) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function CardContent({ children, style }: any) {
  return <View style={[styles.cardContent, style]}>{children}</View>;
}

export const Card: any = Object.assign(CardRoot, { Content: CardContent });

export function TextInput({ style, label, left, ...props }: any) {
  return (
    <RNTextInput
      {...props}
      placeholder={props.placeholder ?? label}
      placeholderTextColor={colors.muted}
      style={[styles.input, style]}
    />
  );
}

TextInput.Icon = function Icon() {
  return null;
};

export function Divider({ style }: any) {
  return <View style={[styles.divider, style]} />;
}

export function Chip({ children, label, style }: any) {
  return (
    <View style={[styles.chip, style]}>
      <RNText style={styles.chipText}>{label ?? children}</RNText>
    </View>
  );
}

export function Portal({ children }: any) {
  return <>{children}</>;
}

export function Modal({ visible, onDismiss, children, contentContainerStyle }: any) {
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.modalBackdrop} onPress={onDismiss}>
        <Pressable style={[styles.modalContent, contentContainerStyle]}>{children}</Pressable>
      </Pressable>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  text: {
    color: colors.text,
  },
  button: {
    minHeight: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  containedButton: {
    backgroundColor: colors.primary,
  },
  outlinedButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabledButton: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
  },
  containedButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
  outlinedButtonText: {
    color: colors.text,
    fontWeight: '700',
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardContent: {
    padding: spacing.md,
  },
  input: {
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    color: colors.text,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  chip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#EAF2FF',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  chipText: {
    color: colors.primary,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(16, 32, 51, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: spacing.lg,
  },
});
