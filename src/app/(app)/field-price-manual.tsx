import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/screen-header";
import { Colors, FontFamily } from "@/constants/theme";
import { saveFieldPrice } from "@/features/field-price/field-price-service";
import { FIELD_UNITS } from "@/features/field-price/units";

const chevron = require("../../../assets/images/field-price/chevron.svg");

const PLACEHOLDER = "#b5b5b5";

/** 숫자만 남깁니다. (소수점은 한 번만) */
function onlyNumber(text: string, allowDecimal: boolean) {
  const cleaned = text.replace(allowDecimal ? /[^0-9.]/g : /[^0-9]/g, "");
  if (!allowDecimal) return cleaned;
  const [head, ...rest] = cleaned.split(".");
  return rest.length > 0 ? `${head}.${rest.join("")}` : head;
}

/** Figma 201:2266 — 현장 가격 입력하기 (직접 등록) */
export default function FieldPriceManualScreen() {
  const insets = useSafeAreaInsets();
  // 사진으로 등록하기에서 읽은 값이 있으면 미리 채워 둡니다.
  const prefill = useLocalSearchParams<{
    from?: string;
    name?: string;
    price?: string;
    amount?: string;
    unit?: string;
  }>();
  const fromPhoto = prefill.from === "photo";
  const [name, setName] = useState(
    typeof prefill.name === "string" ? prefill.name : "",
  );
  const [price, setPrice] = useState(
    typeof prefill.price === "string" ? onlyNumber(prefill.price, false) : "",
  );
  const [amount, setAmount] = useState(
    typeof prefill.amount === "string" ? onlyNumber(prefill.amount, true) : "",
  );
  const [unit, setUnit] = useState<string | null>(
    typeof prefill.unit === "string" &&
      (FIELD_UNITS as readonly string[]).includes(prefill.unit)
      ? prefill.unit
      : null,
  );
  const [unitOpen, setUnitOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const priceNumber = Number(price);
  const amountNumber = Number(amount);
  const problem = !name.trim()
    ? "식재료 이름을 입력해주세요."
    : !(priceNumber > 0)
      ? "가격을 입력해주세요."
      : !(amountNumber > 0)
        ? "중량 또는 수량을 입력해주세요."
        : !unit
          ? "단위를 선택해주세요."
          : null;

  const submit = async () => {
    if (saving) return;
    if (problem || !unit) {
      Alert.alert("현장 가격 입력하기", problem ?? "입력을 확인해주세요.");
      return;
    }
    setSaving(true);
    try {
      await saveFieldPrice({
        productName: name,
        price: priceNumber,
        amount: amountNumber,
        unit,
      });
      router.replace({
        pathname: "/field-price-result",
        params: {
          name: name.trim(),
          price: String(priceNumber),
          amount: String(amountNumber),
          unit,
        },
      });
    } catch {
      Alert.alert(
        "현장 가격 입력하기",
        "저장하지 못했어요. 잠시 후 다시 시도해주세요.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ScreenHeader title="현장 가격 입력하기" />

        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {fromPhoto && (
            <Text style={styles.photoNote}>
              사진에서 읽은 내용이에요. 맞는지 확인하고 고쳐주세요.
            </Text>
          )}

          <Field label="식재료 이름">
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="식재료 이름을 입력해주세요"
              placeholderTextColor={PLACEHOLDER}
              returnKeyType="next"
            />
          </Field>

          <Field label="식재료 가격">
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={(t) => setPrice(onlyNumber(t, false))}
              placeholder="가격을 입력해주세요"
              placeholderTextColor={PLACEHOLDER}
              keyboardType="number-pad"
            />
          </Field>

          <View style={styles.field}>
            <Text style={styles.label}>중량 또는 수량</Text>
            <View style={styles.amountRow}>
              <TextInput
                style={[styles.input, styles.amountInput]}
                value={amount}
                onChangeText={(t) => setAmount(onlyNumber(t, true))}
                placeholder="예: 500"
                placeholderTextColor={PLACEHOLDER}
                keyboardType="decimal-pad"
              />
              <Pressable
                style={styles.unitButton}
                onPress={() => setUnitOpen((open) => !open)}
                accessibilityRole="button"
                accessibilityLabel="단위 선택"
              >
                <Text style={[styles.unitText, unit && styles.unitTextSelected]}>
                  {unit ?? "단위 선택"}
                </Text>
                <Image
                  source={chevron}
                  style={[styles.chevron, unitOpen && styles.chevronOpen]}
                  contentFit="contain"
                />
              </Pressable>
            </View>

            {unitOpen && (
              <View style={styles.unitList}>
                {FIELD_UNITS.map((u) => (
                  <Pressable
                    key={u}
                    style={[styles.unitChip, unit === u && styles.unitChipOn]}
                    onPress={() => {
                      setUnit(u);
                      setUnitOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.unitChipText,
                        unit === u && styles.unitChipTextOn,
                      ]}
                    >
                      {u}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
          <Pressable
            style={[styles.submit, (saving || !!problem) && styles.submitOff]}
            onPress={submit}
            accessibilityRole="button"
          >
            {saving ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.submitText}>분석 하기</Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: Colors.white },
  body: { paddingTop: 50, paddingHorizontal: 20, paddingBottom: 30, gap: 30 },

  photoNote: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    fontWeight: "500",
    color: Colors.primary,
  },
  field: { gap: 10 },
  label: { fontFamily: FontFamily.regular, fontSize: 14, color: "#b5b5b5" },
  input: {
    padding: 20,
    borderWidth: 1,
    borderColor: "#b5b5b5",
    borderRadius: 7,
    fontFamily: FontFamily.regular,
    fontSize: 16,
    color: Colors.black,
  },

  amountRow: { flexDirection: "row", gap: 20 },
  amountInput: { flex: 1 },
  unitButton: {
    width: 126,
    height: 59,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 16,
    paddingRight: 13,
    borderWidth: 1,
    borderColor: "#b5b5b5",
    borderRadius: 10,
    backgroundColor: Colors.white,
  },
  unitText: { fontFamily: FontFamily.regular, fontSize: 16, color: "#b5b5b5" },
  unitTextSelected: { color: Colors.black },
  chevron: { width: 30, height: 30, transform: [{ rotate: "90deg" }] },
  chevronOpen: { transform: [{ rotate: "-90deg" }] },

  unitList: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  unitChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 1000,
    backgroundColor: "#f5f5f5",
  },
  unitChipOn: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  unitChipText: { fontFamily: FontFamily.regular, fontSize: 14, color: Colors.black },
  unitChipTextOn: { color: Colors.white },

  footer: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: Colors.white },
  submit: {
    height: 59,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  submitOff: { opacity: 0.5 },
  submitText: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    fontWeight: "500",
    color: Colors.white,
  },
});
