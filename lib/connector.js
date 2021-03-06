"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Connector = exports.SequentialConnectionStrategy = exports.ParallelConnectionStrategy = void 0;

var _net = _interopRequireDefault(require("net"));

var _dns = _interopRequireDefault(require("dns"));

var punycode = _interopRequireWildcard(require("punycode"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class ParallelConnectionStrategy {
  constructor(addresses, options) {
    this.addresses = void 0;
    this.options = void 0;
    this.addresses = addresses;
    this.options = options;
  }

  connect(callback) {
    const addresses = this.addresses;
    const sockets = new Array(addresses.length);
    let errorCount = 0;

    function onError(_err) {
      errorCount += 1;
      this.removeListener('error', onError);
      this.removeListener('connect', onConnect);

      if (errorCount === addresses.length) {
        callback(new Error('Could not connect (parallel)'));
      }
    }

    function onConnect() {
      for (let j = 0; j < sockets.length; j++) {
        const socket = sockets[j];

        if (this === socket) {
          continue;
        }

        socket.removeListener('error', onError);
        socket.removeListener('connect', onConnect);
        socket.destroy();
      }

      callback(null, this);
    }

    for (let i = 0, len = addresses.length; i < len; i++) {
      const socket = sockets[i] = _net.default.connect(Object.create(this.options, {
        host: {
          value: addresses[i].address
        }
      }));

      socket.on('error', onError);
      socket.on('connect', onConnect);
    }
  }

}

exports.ParallelConnectionStrategy = ParallelConnectionStrategy;

class SequentialConnectionStrategy {
  constructor(addresses, options) {
    this.addresses = void 0;
    this.options = void 0;
    this.addresses = addresses;
    this.options = options;
  }

  connect(callback) {
    const next = this.addresses.shift();

    if (!next) {
      return callback(new Error('Could not connect (sequence)'));
    }

    const socket = _net.default.connect(Object.create(this.options, {
      host: {
        value: next.address
      }
    }));

    const onError = _err => {
      socket.removeListener('error', onError);
      socket.removeListener('connect', onConnect);
      socket.destroy();
      this.connect(callback);
    };

    const onConnect = () => {
      socket.removeListener('error', onError);
      socket.removeListener('connect', onConnect);
      callback(null, socket);
    };

    socket.on('error', onError);
    socket.on('connect', onConnect);
  }

}

exports.SequentialConnectionStrategy = SequentialConnectionStrategy;

class Connector {
  constructor(options, multiSubnetFailover) {
    this.options = void 0;
    this.multiSubnetFailover = void 0;
    this.options = options;
    this.multiSubnetFailover = multiSubnetFailover;
  }

  execute(cb) {
    if (this.options.socketStreamFactory) {
      this.executeForStream(this.options.socketStreamFactory, cb);
    } else if (this.options.host && _net.default.isIP(this.options.host)) {
      this.executeForIP(cb);
    } else {
      this.executeForHostname(cb);
    }
  }

  executeForStream(socketStreamFactory, cb) {
    const socket = socketStreamFactory();

    const onError = err => {
      socket.removeListener('error', onError);
      socket.removeListener('connect', onConnect);
      socket.destroy();
      cb(err);
    };

    const onConnect = () => {
      socket.removeListener('error', onError);
      socket.removeListener('connect', onConnect);
      cb(null, socket);
    };

    socket.on('error', onError);
    socket.on('connect', onConnect);
  }

  executeForIP(cb) {
    const socket = _net.default.connect({
      host: this.options.host,
      port: this.options.port,
      localAddress: this.options.localAddress
    });

    const onError = err => {
      socket.removeListener('error', onError);
      socket.removeListener('connect', onConnect);
      socket.destroy();
      cb(err);
    };

    const onConnect = () => {
      socket.removeListener('error', onError);
      socket.removeListener('connect', onConnect);
      cb(null, socket);
    };

    socket.on('error', onError);
    socket.on('connect', onConnect);
  }

  executeForHostname(cb) {
    const host = this.options.host;

    _dns.default.lookup(punycode.toASCII(host), {
      all: true
    }, (err, addresses) => {
      if (err) {
        return cb(err);
      }

      if (this.multiSubnetFailover) {
        new ParallelConnectionStrategy(addresses, {
          port: this.options.port,
          localAddress: this.options.localAddress
        }).connect(cb);
      } else {
        new SequentialConnectionStrategy(addresses, {
          port: this.options.port,
          localAddress: this.options.localAddress
        }).connect(cb);
      }
    });
  }

}

exports.Connector = Connector;