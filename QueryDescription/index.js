"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.eq = eq;
exports.notEq = notEq;
exports.gt = gt;
exports.gte = gte;
exports.weakGt = weakGt;
exports.lt = lt;
exports.lte = lte;
exports.oneOf = oneOf;
exports.notIn = notIn;
exports.between = between;
exports.like = like;
exports.notLike = notLike;
exports.sanitizeLikeString = sanitizeLikeString;
exports.textMatches = textMatches;
exports.column = column;
exports.where = where;
exports.and = and;
exports.or = or;
exports.sortBy = sortBy;
exports.take = take;
exports.skip = skip;
exports.buildQueryDescription = buildQueryDescription;
exports.queryWithoutDeleted = queryWithoutDeleted;
exports.hasColumnComparisons = hasColumnComparisons;
exports.on = void 0;

var _rambdax = require("rambdax");

var _invariant = _interopRequireDefault(require("../utils/common/invariant"));

var _Schema = require("../Schema");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

// Note: These operators are designed to match SQLite semantics
// to ensure that iOS, Android, web, and Query observation yield exactly the same results
//
// - `true` and `false` are equal to `1` and `0`
//   (JS uses true/false, but SQLite uses 1/0)
// - `null`, `undefined`, and missing fields are equal
//   (SQLite queries return null, but newly created records might lack fields)
// - You can only compare columns to values/other columns of the same type
//   (e.g. string to int comparisons are not allowed)
// - numeric comparisons (<, <=, >, >=, between) with null on either side always return false
//   e.g. `null < 2 == false`
// - `null` on the right-hand-side of IN/NOT IN is not allowed
//   e.g. `Q.in([null, 'foo', 'bar'])`
// - `null` on the left-hand-side of IN/NOT IN will always return false
//   e.g. `null NOT IN (1, 2, 3) == false`
function _valueOrColumn(arg) {
  if (arg !== null && typeof arg === 'object') {
    return arg;
  }

  return {
    value: arg
  };
} // Equals (weakly)
// Note:
// - (null == undefined) == true
// - (1 == true) == true
// - (0 == false) == true


function eq(valueOrColumn) {
  return {
    operator: 'eq',
    right: _valueOrColumn(valueOrColumn)
  };
} // Not equal (weakly)
// Note:
// - (null != undefined) == false
// - (1 != true) == false
// - (0 != false) == false


function notEq(valueOrColumn) {
  return {
    operator: 'notEq',
    right: _valueOrColumn(valueOrColumn)
  };
} // Greater than (SQLite semantics)
// Note:
// - (5 > null) == false


function gt(valueOrColumn) {
  return {
    operator: 'gt',
    right: _valueOrColumn(valueOrColumn)
  };
} // Greater than or equal (SQLite semantics)
// Note:
// - (5 >= null) == false


function gte(valueOrColumn) {
  return {
    operator: 'gte',
    right: _valueOrColumn(valueOrColumn)
  };
} // Greater than (JavaScript semantics)
// Note:
// - (5 > null) == true


function weakGt(valueOrColumn) {
  return {
    operator: 'weakGt',
    right: _valueOrColumn(valueOrColumn)
  };
} // Less than (SQLite semantics)
// Note:
// - (null < 5) == false


function lt(valueOrColumn) {
  return {
    operator: 'lt',
    right: _valueOrColumn(valueOrColumn)
  };
} // Less than or equal (SQLite semantics)
// Note:
// - (null <= 5) == false


function lte(valueOrColumn) {
  return {
    operator: 'lte',
    right: _valueOrColumn(valueOrColumn)
  };
} // Value in a set (SQLite IN semantics)
// Note:
// - `null` in `values` is not allowed!


function oneOf(values) {
  if (process.env.NODE_ENV !== 'production') {
    (0, _invariant.default)(Array.isArray(values), "argument passed to oneOf() is not an array");
  }

  return {
    operator: 'oneOf',
    right: {
      values: values
    }
  };
} // Value not in a set (SQLite NOT IN semantics)
// Note:
// - `null` in `values` is not allowed!
// - (null NOT IN (1, 2, 3)) == false


function notIn(values) {
  if (process.env.NODE_ENV !== 'production') {
    (0, _invariant.default)(Array.isArray(values), "argument passed to notIn() is not an array");
  }

  return {
    operator: 'notIn',
    right: {
      values: values
    }
  };
} // Number is between two numbers (greater than or equal left, and less than or equal right)


function between(left, right) {
  var values = [left, right];
  return {
    operator: 'between',
    right: {
      values: values
    }
  };
}

function like(value) {
  return {
    operator: 'like',
    right: {
      value: value
    }
  };
}

function notLike(value) {
  return {
    operator: 'notLike',
    right: {
      value: value
    }
  };
}

var nonLikeSafeRegexp = /[^a-zA-Z0-9]/g;

function sanitizeLikeString(value) {
  return value.replace(nonLikeSafeRegexp, '_');
}

function textMatches(value) {
  return {
    operator: 'match',
    right: {
      value: value
    }
  };
}

function column(name) {
  return {
    column: name
  };
}

function _valueOrComparison(arg) {
  if (arg !== null && typeof arg === 'object') {
    return arg;
  }

  return eq(arg);
}

function where(left, valueOrComparison) {
  return {
    type: 'where',
    left: left,
    comparison: _valueOrComparison(valueOrComparison)
  };
}

function and(...conditions) {
  return {
    type: 'and',
    conditions: conditions
  };
}

function or(...conditions) {
  return {
    type: 'or',
    conditions: conditions
  };
}

function sortBy(sortColumn, sortOrder = 'asc') {
  return {
    type: 'sortBy',
    sortColumn: sortColumn,
    sortOrder: sortOrder
  };
}

function take(count) {
  return {
    type: 'take',
    count: count
  };
}

function skip(count) {
  return {
    type: 'skip',
    count: count
  };
} // Note: we have to write out three separate meanings of OnFunction because of a Babel bug
// (it will remove the parentheses, changing the meaning of the flow type)


// Use: on('tableName', 'left_column', 'right_value')
// or: on('tableName', 'left_column', gte(10))
// or: on('tableName', where('left_column', 'value')))
var on = function on(table, leftOrWhereDescription, valueOrComparison) {
  if (typeof leftOrWhereDescription === 'string') {
    (0, _invariant.default)(valueOrComparison !== undefined, 'illegal `undefined` passed to Q.on');
    return {
      type: 'on',
      table: table,
      left: leftOrWhereDescription,
      comparison: _valueOrComparison(valueOrComparison)
    };
  }

  var whereDescription = leftOrWhereDescription;
  return {
    type: 'on',
    table: table,
    left: whereDescription.left,
    comparison: whereDescription.comparison
  };
};

exports.on = on;
var syncStatusColumn = (0, _Schema.columnName)('_status');

var extractClauses = function extractClauses(conditions) {
  var clauses = {
    join: [],
    sortBy: [],
    where: [],
    take: null,
    skip: null
  };
  conditions.forEach(function (cond) {
    var {
      type: type
    } = cond;

    switch (type) {
      case 'on':
        type = 'join';
      // fallthrough

      case 'sortBy':
        // $FlowFixMe: Flow is too dumb to realize that it is valid
        clauses[type].push(cond);
        break;

      case 'take':
      case 'skip':
        // $FlowFixMe: Flow is too dumb to realize that it is valid
        clauses[type] = cond;
        break;

      default:
      case 'where':
        clauses.where.push(cond);
        break;
    }
  }); // $FlowFixMe: Flow is too dumb to realize that it is valid

  return clauses;
};

var whereNotDeleted = where(syncStatusColumn, notEq('deleted'));
var joinsWithoutDeleted = (0, _rambdax.pipe)((0, _rambdax.map)((0, _rambdax.prop)('table')), _rambdax.uniq, (0, _rambdax.map)(function (table) {
  return on(table, syncStatusColumn, notEq('deleted'));
}));

function buildQueryDescription(conditions) {
  var clauses = extractClauses(conditions);
  (0, _invariant.default)(!(clauses.skip && !clauses.take), 'cannot skip without take');
  var query = clauses;

  if (process.env.NODE_ENV !== 'production') {
    Object.freeze(query);
  }

  return query;
}

function queryWithoutDeleted(query) {
  var {
    join: join,
    where: whereConditions
  } = query;

  var newQuery = _objectSpread({}, query, {
    join: [].concat(_toConsumableArray(join), _toConsumableArray(joinsWithoutDeleted(join))),
    where: [].concat(_toConsumableArray(whereConditions), [whereNotDeleted])
  });

  if (process.env.NODE_ENV !== 'production') {
    Object.freeze(newQuery);
  }

  return newQuery;
}

var searchForColumnComparisons = function searchForColumnComparisons(value) {
  // Performance critical (100ms on login in previous rambdax-based implementation)
  if (Array.isArray(value)) {
    // dig deeper into the array
    for (var i = 0; i < value.length; i += 1) {
      if (searchForColumnComparisons(value[i])) {
        return true;
      }
    }

    return false;
  } else if (value && typeof value === 'object') {
    if (value.column) {
      return true; // bingo!
    } // drill deeper into the object
    // eslint-disable-next-line no-restricted-syntax


    for (var key in value) {
      // NOTE: To be safe against JS edge cases, there should be hasOwnProperty check
      // but this is performance critical so we trust that this is only called with
      // QueryDescription which doesn't need that
      if (searchForColumnComparisons(value[key])) {
        return true;
      }
    }

    return false;
  } // primitive value


  return false;
};

function hasColumnComparisons(conditions) {
  return searchForColumnComparisons(conditions);
}