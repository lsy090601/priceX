/** 판매점 이름으로 종류를 나눕니다. (참가격 데이터에는 판매점 종류가 따로 없습니다.) */
export type StoreType = "mart" | "market" | "supermarket" | "convenience";

export const STORE_TYPES: { key: StoreType; label: string }[] = [
  { key: "mart", label: "대형 마트" },
  { key: "market", label: "전통 시장" },
  { key: "supermarket", label: "슈퍼 마켓" },
  { key: "convenience", label: "편의점" },
];

const CONVENIENCE = /(CU|GS25|세븐일레븐|이마트24|미니스톱|씨유)/i;
const MARKET = /시장/;
const MART =
  /(이마트(?!24|에브리데이)|홈플러스(?!\s?익스프레스)|롯데마트|코스트코|트레이더스|하나로|농협유통|메가마트|현대백화점|롯데백화점|신세계|갤러리아)/;

export function getStoreType(storeName: string): StoreType {
  if (CONVENIENCE.test(storeName)) return "convenience";
  if (MARKET.test(storeName)) return "market";
  if (MART.test(storeName)) return "mart";
  // 롯데슈퍼, GS더프레시, 이마트에브리데이, 홈플러스 익스프레스 …
  return "supermarket";
}

/** "(주)농협유통 양재점" → "농협유통 양재점" */
export function displayStoreName(storeName: string): string {
  return storeName.replace(/\(주\)\s*/g, "").trim();
}
