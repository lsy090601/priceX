import { StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, Radius } from '@/constants/theme';

type Props = {
  tone: 'error' | 'success' | 'info';
  message?: string | null;
};

/** 폼 상단/하단에 보여주는 성공·실패 안내 */
export function FormMessage({ tone, message }: Props) {
  if (!message) return null;
  const palette =
    tone === 'error'
      ? { bg: Colors.errorBackground, fg: Colors.error }
      : tone === 'success'
        ? { bg: Colors.successBackground, fg: Colors.success }
        : { bg: '#f2f2f2', fg: Colors.text };

  return (
    <View
      style={[styles.box, { backgroundColor: palette.bg }]}
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      accessibilityLiveRegion="polite"
    >
      <Text style={[styles.text, { color: palette.fg }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: '100%',
    borderRadius: Radius.inputSmall,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  text: {
    fontSize: FontSize.label,
    lineHeight: 20,
  },
});
