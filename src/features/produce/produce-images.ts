/**
 * 신선 과일·채소 사진 (assets/images/food).
 * 가격 데이터의 품목 이름(item_name)이 키입니다. 사진을 추가하면 여기에 한 줄 추가하세요.
 * 예: 당근.png 를 넣었다면 → 당근: require("../../../assets/images/food/당근.png"),
 */
const produceImages: Record<string, number> = {
  // 과일 (가격 데이터의 과일 17종 전부)
  감귤: require("../../../assets/images/food/감귤.png"),
  단감: require("../../../assets/images/food/단감.png"),
  레몬: require("../../../assets/images/food/레몬.png"),
  망고: require("../../../assets/images/food/망고.png"),
  바나나: require("../../../assets/images/food/바나나.png"),
  배: require("../../../assets/images/food/배.png"),
  복숭아: require("../../../assets/images/food/복숭아.png"),
  블루베리: require("../../../assets/images/food/블루베리.png"),
  사과: require("../../../assets/images/food/사과.png"),
  아보카도: require("../../../assets/images/food/아보카도.png"),
  오렌지: require("../../../assets/images/food/오렌지.png"),
  자몽: require("../../../assets/images/food/자몽.png"),
  참다래: require("../../../assets/images/food/참다래.png"),
  체리: require("../../../assets/images/food/체리.png"),
  키위: require("../../../assets/images/food/키위.png"),
  파인애플: require("../../../assets/images/food/파인애플.png"),
  포도: require("../../../assets/images/food/포도.png"),

  // 채소 (가격 데이터에서는 딸기도 채소류로 분류됩니다)
  감자: require("../../../assets/images/food/감자.png"),
  깻잎: require("../../../assets/images/food/깻잎.png"),
  딸기: require("../../../assets/images/food/딸기.png"),
  브로콜리: require("../../../assets/images/food/브로콜리.png"),
  상추: require("../../../assets/images/food/상추.png"),
};

/** 사진이 없는 품목이면 undefined 를 돌려줍니다. */
export function getProduceImage(itemName: string): number | undefined {
  return produceImages[itemName];
}
