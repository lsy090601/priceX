import { CameraView, useCameraPermissions } from "expo-camera";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/screen-header";
import { Colors, FontFamily } from "@/constants/theme";
import {
  hasAnyValue,
  readPriceTag,
} from "@/features/field-price/price-tag-service";

const cameraIcon = require("../../../assets/images/field-price/camera-white.svg");

type Photo = { uri: string; base64: string };

/**
 * Figma 186:2184, 195:2234 — 사진으로 등록하기
 * 가격표를 찍으면 서버에서 읽어서, 직접 등록 화면에 채워 넣습니다. (확인 후 저장)
 */
export default function FieldPriceCameraScreen() {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const bottom = Math.max(insets.bottom, 12) + 12;

  const capture = async () => {
    if (!ready || capturing) return;
    setCapturing(true);
    try {
      const picture = await cameraRef.current?.takePictureAsync({
        base64: true,
        quality: 0.5,
      });
      if (picture?.base64) {
        setPhoto({ uri: picture.uri, base64: picture.base64 });
      } else {
        Alert.alert("사진으로 등록하기", "사진을 찍지 못했어요. 다시 시도해주세요.");
      }
    } catch {
      Alert.alert("사진으로 등록하기", "사진을 찍지 못했어요. 다시 시도해주세요.");
    } finally {
      setCapturing(false);
    }
  };

  const failed = (message: string) =>
    Alert.alert("사진으로 등록하기", message, [
      { text: "다시 찍기", onPress: () => setPhoto(null) },
      {
        text: "직접 등록하기",
        onPress: () => router.replace("/field-price-manual"),
      },
    ]);

  const analyze = async () => {
    if (!photo || analyzing) return;
    setAnalyzing(true);
    try {
      const reading = await readPriceTag(photo.base64);
      if (!hasAnyValue(reading)) {
        failed("가격표에서 정보를 읽지 못했어요. 가격표가 잘 보이게 다시 찍어주세요.");
        return;
      }
      router.replace({
        pathname: "/field-price-manual",
        params: {
          from: "photo",
          ...(reading.name ? { name: reading.name } : {}),
          ...(reading.price !== null ? { price: String(reading.price) } : {}),
          ...(reading.amount !== null ? { amount: String(reading.amount) } : {}),
          ...(reading.unit ? { unit: reading.unit } : {}),
        },
      });
    } catch {
      failed("사진을 읽는 중 문제가 생겼어요. 잠시 후 다시 시도하거나 직접 등록해주세요.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="현장 가격 입력하기" />

      <View style={styles.stage}>
        {!permission && <ActivityIndicator color={Colors.white} />}

        {permission && !permission.granted && (
          <View style={styles.permission}>
            <Text style={styles.permissionText}>
              가격표를 찍으려면 카메라 접근을 허용해주세요.
            </Text>
            <Pressable style={styles.permissionButton} onPress={requestPermission}>
              <Text style={styles.permissionButtonText}>카메라 허용하기</Text>
            </Pressable>
            <Pressable onPress={() => router.replace("/field-price-manual")}>
              <Text style={styles.link}>직접 등록하기</Text>
            </Pressable>
          </View>
        )}

        {permission?.granted && !photo && (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
            onCameraReady={() => setReady(true)}
          />
        )}

        {photo && (
          <Image
            source={{ uri: photo.uri }}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
          />
        )}

        {analyzing && (
          <View style={styles.overlay}>
            <ActivityIndicator color={Colors.white} size="large" />
            <Text style={styles.overlayText}>가격표를 읽고 있어요…</Text>
          </View>
        )}
      </View>

      {permission?.granted && !photo && (
        <View style={[styles.shutterWrap, { bottom }]} pointerEvents="box-none">
          <Pressable
            style={[styles.shutter, (!ready || capturing) && styles.shutterOff]}
            onPress={capture}
            accessibilityRole="button"
            accessibilityLabel="사진 찍기"
          >
            <Image source={cameraIcon} style={styles.shutterIcon} contentFit="contain" />
          </Pressable>
        </View>
      )}

      {photo && (
        <View style={[styles.actions, { paddingBottom: bottom }]}>
          <Pressable
            style={[styles.button, styles.buttonGray]}
            onPress={() => setPhoto(null)}
            disabled={analyzing}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>다시 찍기</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.buttonGreen, analyzing && styles.off]}
            onPress={analyze}
            disabled={analyzing}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>분석 하기</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.white },
  stage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#808080",
    overflow: "hidden",
  },

  permission: { alignItems: "center", gap: 16, paddingHorizontal: 40 },
  permissionText: {
    textAlign: "center",
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.white,
  },
  permissionButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  permissionButtonText: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
    fontWeight: "500",
    color: Colors.white,
  },
  link: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.white,
    textDecorationLine: "underline",
  },

  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  overlayText: { fontFamily: FontFamily.medium, fontSize: 15, color: Colors.white },

  shutterWrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  shutter: {
    width: 66,
    height: 66,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 33,
    backgroundColor: Colors.primary,
  },
  shutterOff: { opacity: 0.5 },
  shutterIcon: { width: 32, height: 32 },

  actions: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: 21,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  button: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    borderRadius: 10,
  },
  buttonGray: { backgroundColor: "#b0b0b0" },
  buttonGreen: { backgroundColor: Colors.primary },
  off: { opacity: 0.5 },
  buttonText: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    fontWeight: "500",
    color: Colors.white,
  },
});
