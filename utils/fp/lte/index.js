"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = lte;

// inspired by ramda and rambda

/* eslint-disable */
function lte(x, y) {
  if (arguments.length === 1) {
    return function (y) {
      return lte(x, y);
    };
  }

  return x <= y;
}