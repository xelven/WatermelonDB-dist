"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = is;

// inspired by rambda and ramda
function is(Constructor, value) {
  if (arguments.length === 1) {
    return function (valueHolder) {
      return is(Constructor, valueHolder);
    };
  }

  return value != null && value.constructor === Constructor || value instanceof Constructor;
}