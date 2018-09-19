"use strict";
process.env.NODE_DEBUG = 'tls';


import {EventEmitter} from "events";
import * as tls from "tls";
import {TLSSocket} from "tls";
import {carry} from "carrier";

const DEFAULT_LOGGER = {
	error: (msg, props) => {
		console.log(msg);
		if (!!props) console.trace(props.exception);
	},
	warning: (msg, props?) => {
		console.log(msg);
		if (!!props) console.log(props);
	},
	notice: (msg, props?) => {
		console.log(msg);
		if (!!props) console.log(props);
	},
	info: (msg, props?) => {
		console.log(msg);
		if (!!props) console.log(props);
	},
	debug: (msg, props?) => {
		console.log(msg);
		if (!!props) console.log(props);
	}
};

interface IOptions {
	id?: string;  //device id
	ip: string;  //device ip address
	port: number;  //port
	//mac: string;  //device mac address
}

class SslClient {
	private readonly _ip: string;
	private readonly _port: number = 2878;
	private _logger;

	private _socket: tls.TLSSocket = null;

	constructor(ip: string, logger, port?: number) {
		this._ip = ip;
		this._port = port;
		this._logger = logger;
	}

	connect(): TLSSocket {
		this._socket = tls.connect({
			port: this._port,
			host: this._ip,
			rejectUnauthorized: false,
			secureContext: tls.createSecureContext({ciphers: 'HIGH:!DH:!aNULL'})
		}, () => {
			this._logger.info('connected to samsung AC', {ipAddr: this._ip, port: this._port, tls: true});
		});
		this._socket.setEncoding('utf-8');
		return this._socket;
	}

	disconnect() {
		this._socket.end();
	}

	readLines(callback: (string) => void) {
		return carry(this._socket, callback);
	}

	writeLine(data: string) {
		if (!this._socket) throw new Error('not connected');
		this._logger.debug('write line', {line: data});
		this._socket.write(data + "\r\n");
	}
}

export class SamsungAuthenticator extends EventEmitter {
	private _logger = DEFAULT_LOGGER;
	private readonly _options: IOptions;
	private _sslClient: SslClient;

	constructor(options: IOptions) {
		super();
		this._options = options;
		this._sslClient = new SslClient(options.ip, this._logger, options.port);
	}

	get options(): IOptions {
		return this._options;
	}

	getToken() {
		this._sslClient.connect();
		this._sslClient.readLines((line) => {
			this._logger.debug('read', line);
			switch (line) {
				case "DRC-1.00":
					break;
				case '<?xml version="1.0" encoding="utf-8" ?><Update Type="InvalidateAccount"/>':
					this._sslClient.writeLine('<Request Type="GetToken" />');
					break;
				case '<?xml version="1.0" encoding="utf-8" ?><Response Type="GetToken" Status="Ready"/>':
					this.emit('waiting');
					break;
				default:
					let matches = line.match(/Token="(.*)"/);

					if (matches) {
						this._options.id = matches[1];
						this.emit('authenticated', this._options.id);
					}
					else if (line == '<?xml version="1.0" encoding="utf-8" ?><Response Status="Fail" Type="Authenticate" ErrorCode="301" />') {
						this.emit('error', 'Failed authentication. Too slow !!!');
					}

					this._sslClient.disconnect();
			}

		}).on('end', () => {
			this._logger.debug('TLS Socket end');
			this.emit('end');
		}).on('error', (err) => {
			this._logger.error('TLS Socket error', err);
			this.emit('error', err);
		});
	}
}

