"use strict";


import {SamsungAuthenticator} from "./samsung-airconditioner";

(() => {
	let ac = new SamsungAuthenticator({ip: "10.10.10.125", port: 2878});
	ac.on('end', () => {
		console.log("end");
	}).on('waiting', () => {
		console.log("Go power on your air con in the next 30 seconds");
	}).on('error', (err) => {
		console.log("error");
		console.log(err);
	}).on('authenticated', (id) => {
		console.log('token ' + id);
	}).getToken();
})();
