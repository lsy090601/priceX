import { useState, type ComponentRef, type Ref } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';

/** TextInput 의 ref 타입 (RN 버전에 관계없이 동작) */
export type TextInputRef = ComponentRef<typeof TextInput>;

type Variant = 'login' | 'form';

type Props = Omit<TextInputProps, 'ref'> & {
  ref?: Ref<TextInputRef>;
  /** 'login': 로그인 화면(테두리 #9d9d9d, radius 10) / 'form': 회원가입(라벨 + #b5b5b5, radius 7) */
  variant?: Variant;
  label?: string;
  error?: string;
};

export function TextField({
  ref,
  variant = 'login',
  label,
  error,
  style,
  onFocus,
  onBlur,
  editable = true,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  const isForm = variant === 'form';
  const baseBorder = isForm ? Colors.borderLight : Colors.border;
  const borderColor = error ? Colors.error : focused ? Colors.primary : baseBorder;

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={isForm ? Colors.textSubtle : Colors.textMuted}
        editable={editable}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        accessibilityLabel={label ?? rest.placeholder}
        style={[
          styles.input,
          { borderColor, borderRadius: isForm ? Radius.inputSmall : Radius.input },
          !editable && styles.disabled,
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    gap: 10,
  },
  label: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.label,
    color: Colors.textSubtle,
  },
  input: {
    width: '100%',
    minHeight: 59,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 18,
    borderWidth: 1,
    backgroundColor: Colors.white,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.body,
    color: Colors.text,
  },
  disabled: {
    opacity: 0.6,
  },
  error: {
    marginTop: -4,
    fontSize: FontSize.caption,
    color: Colors.error,
  },
});
