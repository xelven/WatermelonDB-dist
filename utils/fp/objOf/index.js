"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = objOf;

// inspired by ramda and rambda

/* eslint-disable */
function objOf(key, value) {
  if (arguments.length === 1) {
    return function (value) {
      return objOf(key, value);
    };
  }

  var obj = {};
  obj[key] = value;
  return obj;
}