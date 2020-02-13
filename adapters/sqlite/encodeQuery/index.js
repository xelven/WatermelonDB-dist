"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var Q = _interopRequireWildcard(require("../../../QueryDescription"));

var _encodeValue = _interopRequireDefault(require("../encodeValue"));

var _encodeName = _interopRequireDefault(require("../encodeName"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; if (obj != null) { var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

/* eslint-disable no-use-before-define */
function mapJoin(array, mapper, joiner) {
  // NOTE: DO NOT try to optimize this by concatenating strings together. In non-JIT JSC,
  // concatenating strings is extremely slow (5000ms vs 120ms on 65K sample)
  return array.map(mapper).join(joiner);
}

var encodeValues = function encodeValues(values) {
  return "(".concat(mapJoin(values, _encodeValue.default, ', '), ")");
};

var getComparisonRight = function getComparisonRight(table, comparisonRight) {
  if (comparisonRight.values) {
    return encodeValues(comparisonRight.values);
  } else if (comparisonRight.column) {
    return "".concat((0, _encodeName.default)(table), ".").concat((0, _encodeName.default)(comparisonRight.column));
  }

  return typeof comparisonRight.value !== 'undefined' ? (0, _encodeValue.default)(comparisonRight.value) : 'null';
}; // Note: it's necessary to use `is` / `is not` for NULL comparisons to work correctly
// See: https://sqlite.org/lang_expr.html


var operators = {
  eq: 'is',
  notEq: 'is not',
  gt: '>',
  gte: '>=',
  weakGt: '>',
  // For non-column comparison case
  lt: '<',
  lte: '<=',
  oneOf: 'in',
  notIn: 'not in',
  between: 'between',
  like: 'like',
  notLike: 'not like',
  match: 'match'
};

var encodeComparison = function encodeComparison(table, comparison) {
  if (comparison.operator === 'between') {
    var {
      right: right
    } = comparison;
    return right.values ? "between ".concat((0, _encodeValue.default)(right.values[0]), " and ").concat((0, _encodeValue.default)(right.values[1])) : '';
  }

  return "".concat(operators[comparison.operator], " ").concat(getComparisonRight(table, comparison.right));
};

var encodeWhere = function encodeWhere(table) {
  return function (where) {
    if (where.type === 'and') {
      return "(".concat(encodeAndOr('and', table, where), ")");
    } else if (where.type === 'or') {
      return "(".concat(encodeAndOr('or', table, where), ")");
    }

    return encodeWhereCondition(table, where.left, where.comparison);
  };
};

var encodeWhereCondition = function encodeWhereCondition(table, left, comparison) {
  // if right operand is a value, we can use simple comparison
  // if a column, we must check for `not null > null`
  if (comparison.operator === 'weakGt' && comparison.right.column) {
    return encodeWhere(table)(Q.or(Q.where(left, Q.gt(comparison.right)), Q.and(Q.where(left, Q.notEq(null)), Q.where(comparison.right.column, null))));
  }

  if (comparison.operator === 'match') {
    var srcTable = (0, _encodeName.default)(table);
    var ftsTable = (0, _encodeName.default)("".concat(table, "_fts"));
    var rowid = (0, _encodeName.default)('rowid');
    var ftsColumn = (0, _encodeName.default)(left);
    var matchValue = getComparisonRight(table, comparison.right);
    return "".concat(srcTable, ".").concat(rowid, " in (") + "select ".concat(ftsTable, ".").concat(rowid, " from ").concat(ftsTable, " ") + "where ".concat(ftsTable, ".").concat(ftsColumn, " match ").concat(matchValue) + ")";
  }

  return "".concat((0, _encodeName.default)(table), ".").concat((0, _encodeName.default)(left), " ").concat(encodeComparison(table, comparison));
};

var encodeAndOr = function encodeAndOr(op, table, andOr) {
  if (andOr.conditions.length) {
    return mapJoin(andOr.conditions, encodeWhere(table), " ".concat(op, " "));
  }

  return '';
};

var encodeOn = function encodeOn({
  table: table,
  left: left,
  comparison: comparison
}) {
  return encodeWhereCondition(table, left, comparison);
};

var andJoiner = ' and ';

var encodeConditions = function encodeConditions(table, description) {
  var wheres = mapJoin(description.where, encodeWhere(table), andJoiner);
  var joins = mapJoin(description.join, encodeOn, andJoiner);

  if (joins.length || wheres.length) {
    var joiner = wheres.length && joins.length ? andJoiner : '';
    return " where ".concat(joins).concat(joiner).concat(wheres);
  }

  return '';
}; // If query contains `on()` conditions on tables with which the primary table has a has-many
// relation, then we need to add `distinct` on the query to ensure there are no duplicates


var encodeMethod = function encodeMethod(table, countMode, needsDistinct) {
  if (countMode) {
    return needsDistinct ? "select count(distinct ".concat((0, _encodeName.default)(table), ".\"id\") as \"count\" from ").concat((0, _encodeName.default)(table)) : "select count(*) as \"count\" from ".concat((0, _encodeName.default)(table));
  }

  return needsDistinct ? "select distinct ".concat((0, _encodeName.default)(table), ".* from ").concat((0, _encodeName.default)(table)) : "select ".concat((0, _encodeName.default)(table), ".* from ").concat((0, _encodeName.default)(table));
};

var encodeAssociation = function encodeAssociation(mainTable) {
  return function ([joinedTable, association]) {
    return association.type === 'belongs_to' ? " join ".concat((0, _encodeName.default)(joinedTable), " on ").concat((0, _encodeName.default)(joinedTable), ".\"id\" = ").concat((0, _encodeName.default)(mainTable), ".").concat((0, _encodeName.default)(association.key)) : " join ".concat((0, _encodeName.default)(joinedTable), " on ").concat((0, _encodeName.default)(joinedTable), ".").concat((0, _encodeName.default)(association.foreignKey), " = ").concat((0, _encodeName.default)(mainTable), ".\"id\"");
  };
};

var encodeJoin = function encodeJoin(table, associations) {
  return associations.length ? associations.map(encodeAssociation(table)).join('') : '';
};

var encodeOrderBy = function encodeOrderBy(table, sortBys) {
  if (sortBys.length === 0) return '';
  return ' order by ' + sortBys.map(function (sortBy) {
    return "".concat((0, _encodeName.default)(table), ".").concat((0, _encodeName.default)(sortBy.columnName), " ").concat(sortBy.sortOrder);
  }).join(', ');
};

var encodeLimitOffset = function encodeLimitOffset(take, skip) {
  var limit = take === null || take === void 0 ? void 0 : take.count;
  var offset = skip === null || skip === void 0 ? void 0 : skip.count;
  if (!limit) return '';
  var optionalOffsetStmt = offset ? " offset ".concat(offset) : '';
  return " limit ".concat(limit).concat(optionalOffsetStmt);
};

var encodeQuery = function encodeQuery(query, countMode = false) {
  var {
    table: table,
    description: description
  } = query;
  var hasJoins = !!query.description.join.length;
  var associations = hasJoins ? query.associations : [];
  var hasToManyJoins = associations.some(function ([, association]) {
    return association.type === 'has_many';
  });
  var sql = encodeMethod(table, countMode, hasToManyJoins) + encodeJoin(table, associations) + encodeConditions(table, description) + encodeOrderBy(table, description.sortBy) + encodeLimitOffset(description.take, description.skip);
  return sql;
};

var _default = encodeQuery;
exports.default = _default;