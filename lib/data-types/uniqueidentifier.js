"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _guidParser = require("../guid-parser");

var _writableTrackingBuffer = _interopRequireDefault(require("../tracking-buffer/writable-tracking-buffer"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const UniqueIdentifier = {
  id: 0x24,
  type: 'GUIDN',
  name: 'UniqueIdentifier',
  declaration: function declaration() {
    return 'uniqueidentifier';
  },
  resolveLength: function resolveLength() {
    return 16;
  },

  generateTypeInfo() {
    return Buffer.from([this.id, 0x10]);
  },

  generateParameterData: function* generateParameterData(parameter, options) {
    if (parameter.value != null) {
      const buffer = new _writableTrackingBuffer.default(1);
      buffer.writeUInt8(0x10);
      buffer.writeBuffer(Buffer.from((0, _guidParser.guidToArray)(parameter.value)));
      yield buffer.data;
    } else {
      yield Buffer.from([0x00]);
    }
  },
  validate: function validate(value) {
    if (value == null) {
      return null;
    }

    if (typeof value !== 'string') {
      if (typeof value.toString !== 'function') {
        return TypeError('Invalid string.');
      }

      value = value.toString();
    }

    return value;
  }
};
var _default = UniqueIdentifier;
exports.default = _default;
module.exports = UniqueIdentifier;