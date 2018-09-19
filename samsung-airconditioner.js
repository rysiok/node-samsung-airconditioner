"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
process.env.NODE_DEBUG = 'tls';
var events_1 = require("events");
var tls = require("tls");
var carrier_1 = require("carrier");
var DEFAULT_LOGGER = {
    error: function (msg, props) {
        console.log(msg);
        if (!!props)
            console.trace(props.exception);
    },
    warning: function (msg, props) {
        console.log(msg);
        if (!!props)
            console.log(props);
    },
    notice: function (msg, props) {
        console.log(msg);
        if (!!props)
            console.log(props);
    },
    info: function (msg, props) {
        console.log(msg);
        if (!!props)
            console.log(props);
    },
    debug: function (msg, props) {
        console.log(msg);
        if (!!props)
            console.log(props);
    }
};
var SslClient = /** @class */ (function () {
    function SslClient(ip, logger, port) {
        this._port = 2878;
        this._socket = null;
        this._ip = ip;
        this._port = port;
        this._logger = logger;
    }
    SslClient.prototype.connect = function () {
        var _this = this;
        this._socket = tls.connect({
            port: this._port,
            host: this._ip,
            rejectUnauthorized: false,
            secureContext: tls.createSecureContext({ ciphers: 'HIGH:!DH:!aNULL' })
        }, function () {
            _this._logger.info('connected to samsung AC', { ipAddr: _this._ip, port: _this._port, tls: true });
        });
        this._socket.setEncoding('utf-8');
        return this._socket;
    };
    SslClient.prototype.disconnect = function () {
        this._socket.end();
    };
    SslClient.prototype.readLines = function (callback) {
        return carrier_1.carry(this._socket, callback);
    };
    SslClient.prototype.writeLine = function (data) {
        if (!this._socket)
            throw new Error('not connected');
        this._logger.debug('write line', { line: data });
        this._socket.write(data + "\r\n");
    };
    return SslClient;
}());
var SamsungAuthenticator = /** @class */ (function (_super) {
    __extends(SamsungAuthenticator, _super);
    function SamsungAuthenticator(options) {
        var _this = _super.call(this) || this;
        _this._logger = DEFAULT_LOGGER;
        _this._options = options;
        _this._sslClient = new SslClient(options.ip, _this._logger, options.port);
        return _this;
    }
    Object.defineProperty(SamsungAuthenticator.prototype, "options", {
        get: function () {
            return this._options;
        },
        enumerable: true,
        configurable: true
    });
    SamsungAuthenticator.prototype.getToken = function () {
        var _this = this;
        this._sslClient.connect();
        this._sslClient.readLines(function (line) {
            _this._logger.debug('read', line);
            switch (line) {
                case "DRC-1.00":
                    break;
                case '<?xml version="1.0" encoding="utf-8" ?><Update Type="InvalidateAccount"/>':
                    _this._sslClient.writeLine('<Request Type="GetToken" />');
                    break;
                case '<?xml version="1.0" encoding="utf-8" ?><Response Type="GetToken" Status="Ready"/>':
                    _this.emit('waiting');
                    break;
                default:
                    var matches = line.match(/Token="(.*)"/);
                    if (matches) {
                        _this._options.id = matches[1];
                        _this.emit('authenticated', _this._options.id);
                    }
                    else if (line == '<?xml version="1.0" encoding="utf-8" ?><Response Status="Fail" Type="Authenticate" ErrorCode="301" />') {
                        _this.emit('error', 'Failed authentication. Too slow !!!');
                    }
                    _this._sslClient.disconnect();
            }
        }).on('end', function () {
            _this._logger.debug('TLS Socket end');
            _this.emit('end');
        }).on('error', function (err) {
            _this._logger.error('TLS Socket error', err);
            _this.emit('error', err);
        });
    };
    return SamsungAuthenticator;
}(events_1.EventEmitter));
exports.SamsungAuthenticator = SamsungAuthenticator;
