"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = encodeValue;

var _sqlEscapeString = _interopRequireDefault(require("sql-escape-string"));

var _common = require("../../../utils/common");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function encodeValue(value) {
  if (value === true) {
    return '1';
  } else if (value === false) {
    return '0';
  } else if (Number.isNaN(value)) {
    (0, _common.logError)('Passed NaN to query');
    return 'null';
  } else if (value === undefined) {
    (0, _common.logError)('Passed undefined to query');
    return 'null';
  } else if (value === null) {
    return 'null';
  } else if (typeof value === 'number') {
    return "".concat(value);
  } // TODO: We shouldn't ever encode SQL values directly — use placeholders


  return (0, _sqlEscapeString.default)(value);
}