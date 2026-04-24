/**
 * 실행: `npm test` (package.json scripts.test에 등록).
 * Node 22.6+ 의 native test runner + --experimental-strip-types 사용.
 * 외부 의존성 없음.
 */
import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { GROUP_ORDER, seriesGroupKey } from './seriesGroup.ts'

test('seriesGroupKey: main story 4종은 모두 "main"으로 묶임', () => {
  assert.equal(seriesGroupKey('PARENT'), 'main')
  assert.equal(seriesGroupKey('PREQUEL'), 'main')
  assert.equal(seriesGroupKey('SIDE_STORY'), 'main')
  assert.equal(seriesGroupKey('SEQUEL'), 'main')
})

test('seriesGroupKey: main 외 관계는 자기 타입을 그룹키로 가짐', () => {
  assert.equal(seriesGroupKey('SPIN_OFF'), 'SPIN_OFF')
  assert.equal(seriesGroupKey('ALTERNATIVE'), 'ALTERNATIVE')
  assert.equal(seriesGroupKey('SUMMARY'), 'SUMMARY')
  assert.equal(seriesGroupKey('ADAPTATION'), 'ADAPTATION')
  assert.equal(seriesGroupKey('SOURCE'), 'SOURCE')
  assert.equal(seriesGroupKey('OTHER'), 'OTHER')
})

test('GROUP_ORDER: main이 가장 먼저, OTHER가 가장 뒤', () => {
  assert.equal(GROUP_ORDER.main, 0)
  assert.ok(GROUP_ORDER.SPIN_OFF! > GROUP_ORDER.main!)
  assert.equal(GROUP_ORDER.OTHER, 6)
})
