// Jalankan dari folder repo: node --test tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanNum, parseNum } from '../hosting/js/utils.js';

const cases = [
    ['', 0], ['-', 0], [' ', 0], [null, 0], [undefined, 0], [0, 0], [1234, 1234],
    ['123', 123], ['1.234', 1234], ['1.234.567', 1234567], ['1.234,5', 1234.5], ['1.234.567,89', 1234567.89],
    ['1,234', 1234], ['1,234,567', 1234567], ['1,234.5', 1234.5],
    ['12,5', 12.5], ['0,75', 0.75], [',5', 0.5], ['12.5', 12.5], ['1234.567', 1234.567], ['1234,5', 1234.5],
    ['-1.234', -1234], ['-12,5', -12.5], ['-123', -123], ['1.234-', -1234], ['(1.234)', -1234], ['(12,5)', -12.5],
    [' 1.234 ', 1234], ['1 234', 1234], ['1e3', 1000], ['-1e-7', -1e-7], ['1.2340', 1.234],
];
for (const [input, expected] of cases) {
    test(`cleanNum(${JSON.stringify(input)}) = ${expected}`, () => assert.equal(cleanNum(input), expected));
}

test('teks bukan angka -> NaN (parseNum) / 0 (cleanNum)', () => {
    for (const v of ['abc', 'Rp', '12a', '1.2.3,4,5', '--5', 'TOTAL']) {
        assert.ok(Number.isNaN(parseNum(v)), v);
        assert.equal(cleanNum(v), 0);
    }
});
