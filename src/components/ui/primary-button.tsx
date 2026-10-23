import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { Colors, FontFamily, FontSize, Radius } from '@/constants/theme';

type Props = Omit<PressableProps, 'children'> & {
  title: string;
  loading?: boolean;
};

/** Figma: 초록 버튼 (329 × 59, radius 10) */
export function PrimaryButton({ title, loading = false, disabled, style, ...rest }: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={(state) => [
        styles.button,
        state.pressed && styles.pressed,
        isDisabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={Colors.white} />
      ) : (
        <Text style={styles.title}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 59,
    borderRadius: Radius.button,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: Colors.primaryPressed,
  },
  disabled: {
    opacity: 0.6,
  },
  title: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.body,
    fontWeight: '500',
    color: Colors.white,
  },
});
