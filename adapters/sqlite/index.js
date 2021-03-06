"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _reactNative = require("react-native");

var _rambdax = require("rambdax");

var _common = require("../../utils/common");

var _Result = require("../../utils/fp/Result");

var _common2 = require("../common");

var _encodeQuery = _interopRequireDefault(require("./encodeQuery"));

var _encodeUpdate = _interopRequireDefault(require("./encodeUpdate"));

var _encodeInsert = _interopRequireDefault(require("./encodeInsert"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

function syncReturnToResult(syncReturn) {
  if (syncReturn.status === 'success') {
    return {
      value: syncReturn.result
    };
  } else if (syncReturn.status === 'error') {
    var error = new Error(syncReturn.message); // $FlowFixMem

    error.code = syncReturn.code;
    return {
      error: error
    };
  }

  return {
    error: new Error('Unknown native bridge response')
  };
}

var dispatcherMethods = ['initialize', 'setUpWithSchema', 'setUpWithMigrations', 'find', 'query', 'count', 'batch', 'batchJSON', 'getDeletedRecords', 'destroyDeletedRecords', 'unsafeResetDatabase', 'getLocal', 'setLocal', 'removeLocal'];
var NativeDatabaseBridge = _reactNative.NativeModules.DatabaseBridge;

var makeDispatcher = function makeDispatcher(isSynchronous) {
  // Hacky-ish way to create a NativeModule-like object which looks like the old DatabaseBridge
  // but dispatches to synchronous methods, while maintaining Flow typecheck at callsite
  var methods = dispatcherMethods.map(function (methodName) {
    // batchJSON is missing on Android
    if (!NativeDatabaseBridge[methodName]) {
      return [methodName, undefined];
    }

    var name = isSynchronous ? "".concat(methodName, "Synchronous") : methodName;
    return [methodName, function (...args) {
      var callback = args[args.length - 1];
      var otherArgs = args.slice(0, -1); // $FlowFixMe

      var returnValue = NativeDatabaseBridge[name].apply(NativeDatabaseBridge, _toConsumableArray(otherArgs));

      if (isSynchronous) {
        callback(syncReturnToResult(returnValue));
      } else {
        (0, _Result.fromPromise)(returnValue, callback);
      }
    }];
  });
  var dispatcher = (0, _rambdax.fromPairs)(methods);
  return dispatcher;
};

var SQLiteAdapter =
/*#__PURE__*/
function () {
  function SQLiteAdapter(options) {
    this._tag = (0, _common.connectionTag)();
    var {
      dbName: dbName,
      schema: schema,
      migrations: migrations
    } = options;
    this.schema = schema;
    this.migrations = migrations;
    this._dbName = this._getName(dbName);
    this._synchronous = this._isSynchonous(options.synchronous);
    this._dispatcher = makeDispatcher(this._synchronous);

    if (process.env.NODE_ENV !== 'production') {
      (0, _common.invariant)(!('migrationsExperimental' in options), 'SQLiteAdapter `migrationsExperimental` option has been renamed to `migrations`');
      (0, _common.invariant)(NativeDatabaseBridge, "NativeModules.DatabaseBridge is not defined! This means that you haven't properly linked WatermelonDB native module. Refer to docs for more details");
      (0, _common2.validateAdapter)(this);
    }

    (0, _Result.fromPromise)(this._init(), _common2.devSetupCallback);
  }

  var _proto = SQLiteAdapter.prototype;

  _proto._isSynchonous = function _isSynchonous(synchronous) {
    if (synchronous && !NativeDatabaseBridge.initializeSynchronous) {
      _common.logger.warn("Synchronous SQLiteAdapter not available\u2026 falling back to asynchronous operation. This will happen if you're using remote debugger, and may happen if you forgot to recompile native app after WatermelonDB update");

      return false;
    }

    return synchronous || false;
  };

  _proto.testClone = function testClone(options = {}) {
    return new SQLiteAdapter(_objectSpread({
      dbName: this._dbName,
      schema: this.schema,
      synchronous: this._synchronous
    }, this.migrations ? {
      migrations: this.migrations
    } : {}, {}, options));
  };

  _proto._getName = function _getName(name) {
    if (process.env.NODE_ENV === 'test') {
      return name || "file:testdb".concat(this._tag, "?mode=memory&cache=shared");
    }

    return name || 'watermelon';
  };

  _proto._init = function _init() {
    return new Promise(function ($return, $error) {
      var _this, status;

      _this = this;
      return Promise.resolve((0, _Result.toPromise)(function (callback) {
        return _this._dispatcher.initialize(_this._tag, _this._dbName, _this.schema.version, callback);
      })).then(function ($await_5) {
        try {
          status = $await_5;

          // NOTE: Race condition - logic here is asynchronous, but synchronous-mode adapter does not allow
          // for queueing operations. will fail if you start making actions immediately
          if (status.code === 'schema_needed') {
            return Promise.resolve(this._setUpWithSchema()).then(function ($await_6) {
              try {
                return $If_2.call(this);
              } catch ($boundEx) {
                return $error($boundEx);
              }
            }.bind(this), $error);
          } else {
            if (status.code === 'migrations_needed') {
              return Promise.resolve(this._setUpWithMigrations(status.databaseVersion)).then(function ($await_7) {
                try {
                  return $If_3.call(this);
                } catch ($boundEx) {
                  return $error($boundEx);
                }
              }.bind(this), $error);
            } else {
              (0, _common.invariant)(status.code === 'ok', 'Invalid database initialization status');
              return $If_3.call(this);
            }

            function $If_3() {
              return $If_2.call(this);
            }
          }

          function $If_2() {
            return $return();
          }
        } catch ($boundEx) {
          return $error($boundEx);
        }
      }.bind(this), $error);
    }.bind(this));
  };

  _proto._setUpWithMigrations = function _setUpWithMigrations(databaseVersion) {
    return new Promise(function ($return, $error) {
      var _this2, migrationSteps;

      _this2 = this;

      _common.logger.log('[WatermelonDB][SQLite] Database needs migrations');

      (0, _common.invariant)(databaseVersion > 0, 'Invalid database schema version');
      migrationSteps = this._migrationSteps(databaseVersion);

      if (migrationSteps) {
        _common.logger.log("[WatermelonDB][SQLite] Migrating from version ".concat(databaseVersion, " to ").concat(this.schema.version, "..."));

        var $Try_1_Post = function () {
          try {
            return $If_4.call(this);
          } catch ($boundEx) {
            return $error($boundEx);
          }
        }.bind(this);

        var $Try_1_Catch = function (error) {
          try {
            _common.logger.error('[WatermelonDB][SQLite] Migration failed', error);

            throw error;
          } catch ($boundEx) {
            return $error($boundEx);
          }
        };

        try {
          return Promise.resolve((0, _Result.toPromise)(function (callback) {
            return _this2._dispatcher.setUpWithMigrations(_this2._tag, _this2._dbName, _this2._encodeMigrations(migrationSteps), databaseVersion, _this2.schema.version, callback);
          })).then(function ($await_8) {
            try {
              _common.logger.log('[WatermelonDB][SQLite] Migration successful');

              return $Try_1_Post();
            } catch ($boundEx) {
              return $Try_1_Catch($boundEx);
            }
          }, $Try_1_Catch);
        } catch (error) {
          $Try_1_Catch(error)
        }
      } else {
        _common.logger.warn('[WatermelonDB][SQLite] Migrations not available for this version range, resetting database instead');

        return Promise.resolve(this._setUpWithSchema()).then(function ($await_9) {
          try {
            return $If_4.call(this);
          } catch ($boundEx) {
            return $error($boundEx);
          }
        }.bind(this), $error);
      }

      function $If_4() {
        return $return();
      }
    }.bind(this));
  };

  _proto._setUpWithSchema = function _setUpWithSchema() {
    return new Promise(function ($return, $error) {
      var _this3;

      _this3 = this;

      _common.logger.log("[WatermelonDB][SQLite] Setting up database with schema version ".concat(this.schema.version));

      return Promise.resolve((0, _Result.toPromise)(function (callback) {
        return _this3._dispatcher.setUpWithSchema(_this3._tag, _this3._dbName, _this3._encodedSchema(), _this3.schema.version, callback);
      })).then(function ($await_10) {
        try {
          _common.logger.log("[WatermelonDB][SQLite] Schema set up successfully");

          return $return();
        } catch ($boundEx) {
          return $error($boundEx);
        }
      }, $error);
    }.bind(this));
  };

  _proto.find = function find(table, id, callback) {
    var _this4 = this;

    this._dispatcher.find(this._tag, table, id, function (result) {
      return callback((0, _Result.mapValue)(function (rawRecord) {
        return (0, _common2.sanitizeFindResult)(rawRecord, _this4.schema.tables[table]);
      }, result));
    });
  };

  _proto.query = function query(_query, callback) {
    this.unsafeSqlQuery(_query.table, (0, _encodeQuery.default)(_query), callback);
  };

  _proto.unsafeSqlQuery = function unsafeSqlQuery(tableName, sql, callback) {
    var _this5 = this;

    this._dispatcher.query(this._tag, tableName, sql, function (result) {
      return callback((0, _Result.mapValue)(function (rawRecords) {
        return (0, _common2.sanitizeQueryResult)(rawRecords, _this5.schema.tables[tableName]);
      }, result));
    });
  };

  _proto.count = function count(query, callback) {
    var sql = (0, _encodeQuery.default)(query, true);

    this._dispatcher.count(this._tag, sql, callback);
  };

  _proto.batch = function batch(operations, callback) {
    var batchOperations = operations.map(function (operation) {
      var [type, table, rawOrId] = operation;

      switch (type) {
        case 'create':
          // $FlowFixMe
          return ['create', table, rawOrId.id].concat((0, _encodeInsert.default)(table, rawOrId));

        case 'update':
          // $FlowFixMe
          return ['execute', table].concat((0, _encodeUpdate.default)(table, rawOrId));

        case 'markAsDeleted':
        case 'destroyPermanently':
          // $FlowFixMe
          return operation;
        // same format, no need to repack

        default:
          throw new Error('unknown batch operation type');
      }
    });
    var {
      batchJSON: batchJSON
    } = this._dispatcher;

    if (batchJSON) {
      batchJSON(this._tag, JSON.stringify(batchOperations), callback);
    } else {
      this._dispatcher.batch(this._tag, batchOperations, callback);
    }
  };

  _proto.getDeletedRecords = function getDeletedRecords(table, callback) {
    this._dispatcher.getDeletedRecords(this._tag, table, callback);
  };

  _proto.destroyDeletedRecords = function destroyDeletedRecords(table, recordIds, callback) {
    this._dispatcher.destroyDeletedRecords(this._tag, table, recordIds, callback);
  };

  _proto.unsafeResetDatabase = function unsafeResetDatabase(callback) {
    this._dispatcher.unsafeResetDatabase(this._tag, this._encodedSchema(), this.schema.version, function (result) {
      if (result.value) {
        _common.logger.log('[WatermelonDB][SQLite] Database is now reset');
      }

      callback(result);
    });
  };

  _proto.getLocal = function getLocal(key, callback) {
    this._dispatcher.getLocal(this._tag, key, callback);
  };

  _proto.setLocal = function setLocal(key, value, callback) {
    this._dispatcher.setLocal(this._tag, key, value, callback);
  };

  _proto.removeLocal = function removeLocal(key, callback) {
    this._dispatcher.removeLocal(this._tag, key, callback);
  };

  _proto._encodedSchema = function _encodedSchema() {
    var {
      encodeSchema: encodeSchema
    } = require('./encodeSchema');

    return encodeSchema(this.schema);
  };

  _proto._migrationSteps = function _migrationSteps(fromVersion) {
    var {
      stepsForMigration: stepsForMigration
    } = require('../../Schema/migrations/helpers');

    var {
      migrations: migrations
    } = this; // TODO: Remove this after migrations are shipped

    if (!migrations) {
      return null;
    }

    return stepsForMigration({
      migrations: migrations,
      fromVersion: fromVersion,
      toVersion: this.schema.version
    });
  };

  _proto._encodeMigrations = function _encodeMigrations(steps) {
    var {
      encodeMigrationSteps: encodeMigrationSteps
    } = require('./encodeSchema');

    return encodeMigrationSteps(steps);
  };

  return SQLiteAdapter;
}();

exports.default = SQLiteAdapter;