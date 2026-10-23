import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const sourcePath = new URL('../src/features/advice/purchase-advice.ts', import.meta.url);
let source = fs.readFileSync(sourcePath, 'utf8');
source = source.replace(
  /import \{[\s\S]*?\} from '@\/features\/shopping\/recommendation-service';/,
  '',
);
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`;
const { assessPrice, generatePurchaseAdvice } = await import(moduleUrl);

const expensive = assessPrice({ productName: '배추', inputPrice: 3200, averagePrice: 2300 });
assert.equal(expensive.difference, 900);
assert.equal(expensive.percentageDifference, 39);
assert.equal(expensive.level, 'expensive');

const advice = generatePurchaseAdvice({
  prices: [{ productName: '배추', inputPrice: 3200, averagePrice: 2300 }],
  recommendation: {
    isComplete: true,
    items: [
      {
        productName: '배추', quantity: 1, inspectedAt: '2026-09-25',
        storeName: '가장싼마트', unitPrice: 2300, subtotal: 2300,
        isDiscounted: false, isOnePlusOne: false,
      },
    ],
    multiStoreTotal: 2300,
    singleStore: { storeName: '한곳마트', total: 3200 },
    savings: 900,
    missingProducts: [],
  },
});
assert.equal(advice.title, '일부 상품은 구매를 미뤄보세요');
assert.match(advice.summary, /평균보다 900원\(39%\) 비싸/);
assert.equal(advice.dataAsOf, '2026-09-25');

console.log('Purchase advice check passed: expensive price and Korean advice');
