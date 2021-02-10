import assert from 'assert';
import {toEqualOptions} from '../src/matchers.options';

describe('matchers', function() {
  describe('toEqualOptions', function() {
    const compare = toEqualOptions().compare;

    it('should ignore private properties', function() {
      const actual = {_test: true, a: 'test'};
      const expected = {a: 'test'};
      assert.strictEqual(compare(actual, expected).pass, true);
    });

    it('should produce diff to string', function() {
      const actual = {
        s0: 's0',
        s1: 'not ok',
        s2: null,
        s3: NaN,
        s4: undefined,
        s5: 0,
        s6: [],
        s7: {}
      };
      const expected = {
        s0: 's0',
        s1: 'ok',
        s2: 's2',
        s3: 's3',
        s4: 's4',
        s5: 's5',
        s6: 's6',
        s7: 's7'
      };
      assert.strictEqual(compare(actual, expected).message, [
        's1: Expected "not ok" to equal "ok"\n',
        's2: Expected null to equal "s2"\n',
        's3: Expected NaN to equal "s3"\n',
        's4: Expected undefined to equal "s4"\n',
        's5: Expected 0 to equal "s5"\n',
        's6: Expected [] to equal "s6"\n',
        's7: Expected {} to equal "s7"'
      ].join(''));
    });

    it('should produce diff to number', function() {
      const actual = {
        n0: 123,
        n1: 'not ok',
        n2: null,
        n3: NaN,
        n4: undefined,
        n5: 0,
        n6: [],
        n7: {}
      };
      const expected = {
        n0: 123,
        n1: 1,
        n2: 2,
        n3: 3.14,
        n4: 4,
        n5: 5,
        n6: -Infinity,
        n7: Infinity
      };
      assert.strictEqual(compare(actual, expected).message, [
        'n1: Expected "not ok" to equal 1\n',
        'n2: Expected null to equal 2\n',
        'n3: Expected NaN to equal 3.14\n',
        'n4: Expected undefined to equal 4\n',
        'n5: Expected 0 to equal 5\n',
        'n6: Expected [] to equal -Infinity\n',
        'n7: Expected {} to equal Infinity'
      ].join(''));
    });

    it('should produce diff to array', function() {
      const actual = {
        a0: [1, 2, 3],
        a1: ['a'],
        a2: null,
        a3: NaN,
        a4: undefined,
        a5: 0,
        a6: [],
        a7: {}
      };
      const expected = {
        a0: [1, 2, 3],
        a1: ['b', 'c'],
        a2: [2],
        a3: [[2]],
        a4: [{test: true}],
        a5: [null, NaN, undefined, 1, 'a'],
        a6: [6],
        a7: [7],
      };
      assert.strictEqual(compare(actual, expected).message, [
        'a1.length: Expected 1 to equal 2\n',
        'a1[0]: Expected "a" to equal "b"\n',
        'a1[1]: Expected undefined to equal "c"\n',

        'a2: Expected null to be an array\n',
        'a2.length: Expected undefined to equal 1\n',
        'a2[0]: Expected undefined to equal 2\n',

        'a3: Expected NaN to be an array\n',
        'a3.length: Expected undefined to equal 1\n',
        'a3[0]: Expected undefined to be an array\n',
        'a3[0].length: Expected undefined to equal 1\n',
        'a3[0][0]: Expected undefined to equal 2\n',

        'a4: Expected undefined to be an array\n',
        'a4.length: Expected undefined to equal 1\n',
        'a4[0]: Expected undefined to be an object\n',
        'a4[0].test: Expected undefined to equal true\n',

        'a5: Expected 0 to be an array\n',
        'a5.length: Expected undefined to equal 5\n',
        'a5[0]: Expected undefined to equal null\n',
        'a5[1]: Expected undefined to equal NaN\n',
        'a5[3]: Expected undefined to equal 1\n',
        'a5[4]: Expected undefined to equal "a"\n',

        'a6.length: Expected 0 to equal 1\n',
        'a6[0]: Expected undefined to equal 6\n',

        'a7: Expected {} to be an array\n',
        'a7.length: Expected undefined to equal 1\n',
        'a7[0]: Expected undefined to equal 7'
      ].join(''));
    });

    it('should produce diff to multiple levels', function() {
      const actual = {
        sub: {
          undef: false
        }
      };
      const expected = {
        root: true,
        sub: {
          sub: {
            string: 'test'
          },
          value: 1,
          undef: undefined
        },
        test: {
          test: {
            test: {}
          }
        }
      };
      assert.strictEqual(compare(actual, expected).message, [
        'root: Expected undefined to equal true\n',
        'sub.sub: Expected undefined to be an object\n',
        'sub.sub.string: Expected undefined to equal "test"\n',
        'sub.value: Expected undefined to equal 1\n',
        'sub.undef: Expected false to equal undefined\n',
        'test: Expected undefined to be an object\n',
        'test.test: Expected undefined to be an object\n',
        'test.test.test: Expected undefined to be an object',
      ].join(''));
    });

  });
});
