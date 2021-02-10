
function isObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function isArray(value) {
  return Object.prototype.toString.call(value) === '[object Array]';
}

function fmt(val) {
  if (typeof val === 'string') {
    return `"${val}"`;
  }
  if (isArray(val) || isObject(val)) {
    return JSON.stringify(val);
  }
  return `${val}`;
}

function compareArray(actual, expected, path) {
  let ret = true;
  const diff = [];

  if (!isArray(actual)) {
    diff.push(`${path}: Expected ${fmt(actual)} to be an array`);
    ret = false;
    actual = {};
  }

  if (actual.length !== expected.length) {
    diff.push(`${path}.length: Expected ${actual.length} to equal ${expected.length}`);
    ret = false;
  }
  for (let i = 0; i < expected.length; i++) {
    const act = actual[i];
    const exp = expected[i];
    const cmp = compareOption(act, exp, `${path}[${i}]`);
    if (isObject(cmp)) {
      if (!cmp.pass) {
        diff.push(cmp.message);
        ret = false;
      }
    } else if (!cmp) {
      diff.push(`${path}[${i}]: Expected ${fmt(act)} to equal ${fmt(exp)}`);
      ret = false;
    }
  }
  return {
    pass: ret,
    message: diff.join('\n')
  };
}

function compareObject(actual, expected, path = '') {
  let ret = true;
  const diff = [];

  if (!isObject(actual)) {
    diff.push(`${path}: Expected ${fmt(actual)} to be an object`);
    ret = false;
    actual = {};
  }

  if (path !== '') {
    path = path + '.';
  }

  for (const key in expected) {
    if (typeof key === 'string' && key.startsWith('_')) {
      continue;
    }
    if (!Object.prototype.hasOwnProperty.call(expected, key)) {
      continue;
    }
    const act = actual[key];
    const exp = expected[key];
    const cmp = compareOption(act, exp, `${path}${key}`);
    if (isObject(cmp)) {
      if (!cmp.pass) {
        diff.push(cmp.message);
        ret = false;
      }
    } else if (!cmp) {
      diff.push(`${path}${key}: Expected ${fmt(act)} to equal ${fmt(exp)}`);
      ret = false;
    }
  }
  return {
    pass: ret,
    message: diff.join('\n')
  };
}

function compareOption(actual, expected, path) {
  let ret = true;

  if (isObject(expected)) {
    ret = compareObject(actual, expected, path);
  } else if (isArray(expected)) {
    ret = compareArray(actual, expected, path);
  } else {
    ret = actual === expected;
  }
  return ret;
}

export function toEqualOptions() {
  return {
    compare(actual, expected) {
      return compareObject(actual, expected);
    }
  };
}
