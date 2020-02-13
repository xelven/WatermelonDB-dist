"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.encodeMigrationSteps = exports.encodeSchema = void 0;

var _rambdax = require("rambdax");

var _RawRecord = require("../../../RawRecord");

var _encodeName = _interopRequireDefault(require("../encodeName"));

var _encodeValue = _interopRequireDefault(require("../encodeValue"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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

var encodeTable = function encodeTable(table) {
  return encodeCreateTable(table) + encodeTableIndicies(table);
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