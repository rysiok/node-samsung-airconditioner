"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var samsung_airconditioner_1 = require("./samsung-airconditioner");
(function () {
    var ac = new samsung_airconditioner_1.SamsungAuthenticator({ ip: "10.10.10.125", port: 2878 });
    ac.on('end', function () {
        console.log("end");
    }).on('waiting', function () {
        console.log("Go power on your air con in the next 30 seconds");
    }).on('error', function (err) {
        console.log("error");
        console.log(err);
    }).on('authenticated', function (id) {
        console.log('token ' + id);
    }).getToken();
})();
