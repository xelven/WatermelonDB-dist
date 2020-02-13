"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = lt;

// inspired by ramda and rambda

/* eslint-disable */
function lt(x, y) {
  if (arguments.length === 1) {
    return function (y) {
      return lt(x, y);
    };
  }

  return x < y;
}