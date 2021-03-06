"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.tableName = tableName;
exports.columnName = columnName;
exports.appSchema = appSchema;
exports.validateColumnSchema = validateColumnSchema;
exports.tableSchema = tableSchema;

var _invariant = _interopRequireDefault(require("../utils/common/invariant"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function tableName(name) {
  return name;
}

function columnName(name) {
  return name;
}

var safeNameCharacters = /^[a-zA-Z_]\w*$/;

function appSchema({
  version: version,
  tables: tableList
}) {
  process.env.NODE_ENV !== 'production' && (0, _invariant.default)(version > 0, "Schema version must be greater than 0");
  var tables = tableList.reduce(function (map, table) {
    if (process.env.NODE_ENV !== 'production') {
      (0, _invariant.default)(typeof table === 'object' && table.name, "Table schema must contain a name");
    }

    map[table.name] = table;
    return map;
  }, {});
  return {
    version: version,
    tables: tables
  };
}

function validateColumnSchema(column) {
  if (process.env.NODE_ENV !== 'production') {
    (0, _invariant.default)(column.name, "Missing column name");
    (0, _invariant.default)(['string', 'boolean', 'number'].includes(column.type), "Invalid type ".concat(column.type, " for column ").concat(column.name, " (valid: string, boolean, number)"));
    (0, _invariant.default)(!['id', '_changed', '_status', '$loki'].includes(column.name), "You must not define a column with name ".concat(column.name));
    (0, _invariant.default)(safeNameCharacters.test(column.name), "Column name (".concat(column.name, ") must contain only safe characters ").concat(safeNameCharacters.toString()));

    if (column.name === 'created_at' || column.name === 'updated_at') {
      (0, _invariant.default)(column.type === 'number' && !column.isOptional, "".concat(column.name, " must be of type number and not optional"));
    }

    if (column.name === 'last_modified') {
      (0, _invariant.default)(column.type === 'number', "For compatibility reasons, column last_modified must be of type 'number', and should be optional");
    }
  }
}

function tableSchema({
  name: name,
  columns: columnArray
}) {
  if (process.env.NODE_ENV !== 'production') {
    (0, _invariant.default)(name, "Missing table name in schema");
    (0, _invariant.default)(safeNameCharacters.test(name), "Table name ".concat(name, " must contain only safe characters ").concat(safeNameCharacters.toString()));
  }

  var columns = columnArray.reduce(function (map, column) {
    if (process.env.NODE_ENV !== 'production') {
      validateColumnSchema(column);
    }

    map[column.name] = column;
    return map;
  }, {});
  return {
    name: name,
    columns: columns,
    columnArray: columnArray
  };
}