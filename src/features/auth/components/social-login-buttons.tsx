import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';

import type { OAuthProvider } from '../auth-service';

type Props = {
  onPress: (provider: OAuthProvider) => void;
  disabled?: boolean;
};

const ICON = 31;

/** Figma 3:52 — Google(흰 원 + 회색 테두리) / Kakao(노란 원) 43×43, 두 버튼 사이 148px 폭 */
export function SocialLoginButtons({ onPress, disabled }: Props) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Google로 로그인"
        disabled={disabled}
        onPress={() => onPress('google')}
        style={({ pressed }) => [styles.circle, styles.google, (pressed || disabled) && styles.dim]}
      >
        <View style={styles.iconClip}>
          {/* 원본 이미지(1000×563)에서 가운데 G 로고 부분만 보이도록 Figma 크롭 값 그대로 적용 */}
          <Image
            source={require('@/assets/images/auth/google.png')}
            style={styles.googleImage}
            contentFit="fill"
          />
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="카카오로 로그인"
        disabled={disabled}
        onPress={() => onPress('kakao')}
        style={({ pressed }) => [styles.circle, styles.kakao, (pressed || disabled) && styles.dim]}
      >
        <View style={styles.iconClip}>
          <Image
            source={require('@/assets/images/auth/kakao.png')}
            style={styles.kakaoImage}
            contentFit="fill"
          />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: 148,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'center',
  },
  circle: {
    width: 43,
    height: 43,
    padding: 5,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  google: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  kakao: {
    backgroundColor: Colors.kakao,
  },
  dim: {
    opacity: 0.6,
  },
  iconClip: {
    width: ICON,
    height: ICON,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  googleImage: {
    position: 'absolute',
    top: 0,
    left: ICON * -0.3949,
    height: ICON,
    width: ICON * 1.7762,
  },
  kakaoImage: {
    position: 'absolute',
    top: ICON * 0.0098,
    left: ICON * 0.0124,
    width: ICON,
    height: ICON,
  },
});
