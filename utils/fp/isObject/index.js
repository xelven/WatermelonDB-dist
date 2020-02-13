"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var isObject = function isObject(maybeObject) {
  return maybeObject !== null && typeof maybeObject === 'object' && !Array.isArray(maybeObject);
};

var _default = isObject;
exports.default = _default;