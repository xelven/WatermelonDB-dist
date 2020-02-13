"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.notLike = exports.like = exports.rawFieldEquals = void 0;

var _fp = require("../../utils/fp");

var _likeToRegexp = _interopRequireDefault(require("../../utils/fp/likeToRegexp"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint-disable eqeqeq */
var between = function between(left, [lower, upper]) {
  return left >= lower && left <= upper;
};

var rawFieldEquals = function rawFieldEquals(left, right) {
  return left == right;
};

exports.rawFieldEquals = rawFieldEquals;

var rawFieldNotEquals = function rawFieldNotEquals(left, right) {
  return !(left == right);
};

var noNullComparisons = function noNullComparisons(operator) {
  return function (left, right) {
    // return false if any operand is null/undefined
    if (left == null || right == null) {
      return false;
    }

    return operator(left, right);
  };
}; // Same as `a > b`, but `5 > undefined` is also true


var weakGt = function weakGt(left, right) {
  return left > right || left != null && right == null;
};

var handleLikeValue = function handleLikeValue(v, defaultV) {
  return typeof v === 'string' ? v : defaultV;
};

var like = function like(left, right) {
  var leftV = handleLikeValue(left, '');
  return (0, _likeToRegexp.default)(right).test(leftV);
};

exports.like = like;

var notLike = function notLike(left, right) {
  // Mimic SQLite behaviour
  if (left === null) {
    return false;
  }

  var leftV = handleLikeValue(left, '');
  return !(0, _likeToRegexp.default)(right).test(leftV);
};

exports.notLike = notLike;

var oneOf = function oneOf(value, values) {
  return values.includes(value);
};

var notOneOf = function notOneOf(value, values) {
  return !values.includes(value);
};

var operators = {
  eq: rawFieldEquals,
  notEq: rawFieldNotEquals,
  gt: noNullComparisons(_fp.gt),
  gte: noNullComparisons(_fp.gte),
  weakGt: weakGt,
  lt: noNullComparisons(_fp.lt),
  lte: noNullComparisons(_fp.lte),
  oneOf: oneOf,
  notIn: noNullComparisons(notOneOf),
  between: between,
  like: like,
  notLike: notLike
};
var _default = operators;
exports.default = _default;