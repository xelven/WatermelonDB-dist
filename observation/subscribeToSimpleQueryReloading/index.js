"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.processChangeSet = processChangeSet;
exports.default = subscribeToSimpleQueryReloading;

var _common = require("../../utils/common");

var _common2 = require("../../Collection/common");

var _encodeMatcher = _interopRequireDefault(require("../encodeMatcher"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function processChangeSet(changeSet, matcher, mutableMatchingRecords) {
  var shouldEmit = false;
  changeSet.forEach(function (change) {
    var {
      record: record,
      type: type
    } = change;
    var index = mutableMatchingRecords.indexOf(record);
    var currentlyMatching = index > -1;

    if (type === _common2.CollectionChangeTypes.destroyed) {
      if (currentlyMatching) {
        // Remove if record was deleted
        mutableMatchingRecords.splice(index, 1);
        shouldEmit = true;
      }

      return;
    }

    var matches = matcher(record._raw);

    if (currentlyMatching && !matches) {
      // Remove if doesn't match anymore
      mutableMatchingRecords.splice(index, 1);
      shouldEmit = true;
    } else if (matches && !currentlyMatching) {
      // Add if should be included but isn't
      mutableMatchingRecords.push(record);
      shouldEmit = true;
    }
  });
  return shouldEmit;
}

function subscribeToSimpleQueryReloading(query, subscriber) {
  (0, _common.invariant)(!query.hasJoins, 'subscribeToSimpleQueryReloading only supports simple queries!');
  var matcher = (0, _encodeMatcher.default)(query.description);
  var unsubscribed = false;
  var unsubscribe = null;

  function reloadingObserverFetch() {
    query.collection._fetchQuery(query, function observeQueryInitialEmission(result) {
      if (unsubscribed) {
        return;
      }

      if (result.error) {
        (0, _common.logError)(result.error.toString());
        return;
      }

      var initialRecords = result.value; // Send initial matching records

      var matchingRecords = initialRecords;

      var emitCopy = function emitCopy() {
        return !unsubscribed && subscriber(matchingRecords.slice(0));
      };

      emitCopy(); // Check if emitCopy haven't completed source observable to avoid memory leaks

      if (unsubscribed) {
        return;
      }
    });
  } // Observe changes to the collection


  unsubscribe = query.collection.experimentalSubscribe(function observeQueryCollectionChanged(changeSet) {
    var {
      record: record,
      type: type
    } = change;
    var index = mutableMatchingRecords.indexOf(record);
    var currentlyMatching = index > -1;
    var matches = matcher(record._raw);
    var shouldEmit = shouldEmitStatus || !previousRecords || !identicalArrays(records, previousRecords);

    if (shouldEmit) {
      emitCopy();
    }
  });
  return function () {
    unsubscribed = true;
    unsubscribe && unsubscribe();
  };
}