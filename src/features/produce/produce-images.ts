/**
 * 신선 과일·채소 사진 (assets/images/food).
 * 가격 데이터의 품목 이름(item_name)이 키입니다. 사진을 추가하면 여기에 한 줄 추가하세요.
 * 예: 사과.png 를 넣었다면 → 사과: require("../../../assets/images/food/사과.png"),
 */
const produceImages: Record<string, number> = {
  감자: require("../../../assets/images/food/감자.png"),
  깻잎: require("../../../assets/images/food/깻잎.png"),
  딸기: require("../../../assets/images/food/딸기.png"),
  레몬: require("../../../assets/images/food/레몬.png"),
  바나나: require("../../../assets/images/food/바나나.png"),
  브로콜리: require("../../../assets/images/food/브로콜리.png"),
  상추: require("../../../assets/images/food/상추.png"),
  포도: require("../../../assets/images/food/포도.png"),
  // 가격 데이터에는 "단감"으로 들어옵니다.
  단감: require("../../../assets/images/food/감.png"),
  // 아래는 가격 데이터에는 없지만 홈 화면 임시 카드에서 씁니다.
  양상추: require("../../../assets/images/food/양상추.png"),
  용과: require("../../../assets/images/food/용과.png"),
};

/** 사진이 없는 품목이면 undefined 를 돌려줍니다. */
export function getProduceImage(itemName: string): number | undefined {
  return produceImages[itemName];
}
