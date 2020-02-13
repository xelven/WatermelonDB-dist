"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.encodeMigrationSteps = exports.encodeSchema = void 0;

var _rambdax = require("rambdax");

var _RawRecord = require("../../../RawRecord");

var _common = require("../../../utils/common");

var _encodeName = _interopRequireDefault(require("../encodeName"));

var _encodeValue = _interopRequireDefault(require("../encodeValue"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

var standardColumns = "\"id\" primary key, \"_changed\", \"_status\"";

var encodeCreateTable = function encodeCreateTable({
  name: name,
  columns: columns
}) {
  var columnsSQL = [standardColumns].concat((0, _rambdax.keys)(columns).map(function (column) {
    return (0, _encodeName.default)(column);
  })).join(', ');
  return "create table ".concat((0, _encodeName.default)(name), " (").concat(columnsSQL, ");");
};

var encodeIndex = function encodeIndex(column, tableName) {
  return column.isIndexed ? "create index ".concat(tableName, "_").concat(column.name, " on ").concat((0, _encodeName.default)(tableName), " (").concat((0, _encodeName.default)(column.name), ");") : '';
};

var encodeTableIndicies = function encodeTableIndicies({
  name: tableName,
  columns: columns
}) {
  return (0, _rambdax.values)(columns).map(function (column) {
    return encodeIndex(column, tableName);
  }).concat(["create index ".concat(tableName, "__status on ").concat((0, _encodeName.default)(tableName), " (\"_status\");")]).join('');
};

var encodeFTSTrigger = function encodeFTSTrigger({
  tableName: tableName,
  ftsTableName: ftsTableName,
  event: event,
  action: action
}) {
  var triggerName = "".concat(ftsTableName, "_").concat(event);
  return "create trigger ".concat((0, _encodeName.default)(triggerName), " after ").concat(event, " on ").concat((0, _encodeName.default)(tableName), " begin ").concat(action, " end;");
};

var encodeFTSDeleteTrigger = function encodeFTSDeleteTrigger({
  tableName: tableName,
  ftsTableName: ftsTableName
}) {
  return encodeFTSTrigger({
    tableName: tableName,
    ftsTableName: ftsTableName,
    event: 'delete',
    action: "delete from ".concat((0, _encodeName.default)(ftsTableName), " where \"rowid\" = \"OLD.rowid\";")
  });
};

var encodeFTSInsertTrigger = function encodeFTSInsertTrigger({
  tableName: tableName,
  ftsTableName: ftsTableName,
  ftsColumns: ftsColumns
}) {
  var rawColumnNames = ['rowid'].concat(_toConsumableArray(ftsColumns.map(function (column) {
    return column.name;
  })));
  var columns = rawColumnNames.map(_encodeName.default);
  var valueColumns = rawColumnNames.map(function (column) {
    return (0, _encodeName.default)("NEW.".concat(column));
  });
  var columnsSQL = columns.join(', ');
  var valueColumnsSQL = valueColumns.join(', ');
  return encodeFTSTrigger({
    tableName: tableName,
    ftsTableName: ftsTableName,
    event: 'insert',
    action: "insert into ".concat((0, _encodeName.default)(ftsTableName), " (").concat(columnsSQL, ") values (").concat(valueColumnsSQL, ");")
  });
};

var encodeFTSUpdateTrigger = function encodeFTSUpdateTrigger({
  tableName: tableName,
  ftsTableName: ftsTableName,
  ftsColumns: ftsColumns
}) {
  var rawColumnNames = ftsColumns.map(function (column) {
    return column.name;
  });
  var assignments = rawColumnNames.map(function (column) {
    return "".concat((0, _encodeName.default)(column), "=").concat((0, _encodeName.default)("NEW.".concat(column)));
  });
  var assignmentsSQL = assignments.join(', ');
  return encodeFTSTrigger({
    tableName: tableName,
    ftsTableName: ftsTableName,
    event: 'update',
    action: "update ".concat((0, _encodeName.default)(ftsTableName), " set ").concat(assignmentsSQL, " where \"rowid\" = \"NEW.rowid\";")
  });
};

var encodeFTSTriggers = function encodeFTSTriggers({
  tableName: tableName,
  ftsTableName: ftsTableName,
  ftsColumns: ftsColumns
}) {
  var updateTrigger = '';
  return encodeFTSDeleteTrigger({
    tableName: tableName,
    ftsTableName: ftsTableName
  }) + encodeFTSInsertTrigger({
    tableName: tableName,
    ftsTableName: ftsTableName,
    ftsColumns: ftsColumns
  }) + encodeFTSUpdateTrigger({
    tableName: tableName,
    ftsTableName: ftsTableName,
    ftsColumns: ftsColumns
  });
};

var encodeFTSTable = function encodeFTSTable({
  ftsTableName: ftsTableName,
  ftsColumns: ftsColumns
}) {
  var columnsSQL = ftsColumns.map(function (column) {
    return (0, _encodeName.default)(column.name);
  }).join(', ');
  return "create virtual table ".concat((0, _encodeName.default)("".concat(ftsTableName)), " using fts4(").concat(columnsSQL, ");");
};

var encodeFTSSearch = function encodeFTSSearch({
  name: tableName,
  columns: columns
}) {
  var ftsColumns = (0, _rambdax.values)(columns).filter(function (c) {
    return c.isSearchable;
  });

  if (ftsColumns.length === 0) {
    return '';
  }

  var ftsTableName = "".concat(tableName, "_fts");
  return encodeFTSTable({
    ftsTableName: ftsTableName,
    ftsColumns: ftsColumns
  }) + encodeFTSTriggers({
    tableName: tableName,
    ftsTableName: ftsTableName,
    ftsColumns: ftsColumns
  });
};

var encodeTable = function encodeTable(table) {
  return encodeCreateTable(table) + encodeTableIndicies(table) + encodeFTSSearch(table);
};

var encodeSchema = function encodeSchema({
  tables: tables
}) {
  return (0, _rambdax.values)(tables).map(encodeTable).join('');
};

exports.encodeSchema = encodeSchema;

var encodeCreateTableMigrationStep = function encodeCreateTableMigrationStep({
  schema: schema
}) {
  return encodeTable(schema);
};

var encodeAddColumnsMigrationStep = function encodeAddColumnsMigrationStep({
  table: table,
  columns: columns
}) {
  return columns.map(function (column) {
    var addColumn = "alter table ".concat((0, _encodeName.default)(table), " add ").concat((0, _encodeName.default)(column.name), ";");
    var setDefaultValue = "update ".concat((0, _encodeName.default)(table), " set ").concat((0, _encodeName.default)(column.name), " = ").concat((0, _encodeValue.default)((0, _RawRecord.nullValue)(column)), ";");
    var addIndex = encodeIndex(column, table);

    if (column.isSearchable) {
      _common.logger.warn('[DB][Worker] Support for migrations and isSearchable is still to be implemented');
    }

    return addColumn + setDefaultValue + addIndex;
  }).join('');
};

var encodeMigrationSteps = function encodeMigrationSteps(steps) {
  return steps.map(function (step) {
    if (step.type === 'create_table') {
      return encodeCreateTableMigrationStep(step);
    } else if (step.type === 'add_columns') {
      return encodeAddColumnsMigrationStep(step);
    }

    throw new Error("Unsupported migration step ".concat(step.type));
  }).join('');
};

exports.encodeMigrationSteps = encodeMigrationSteps;