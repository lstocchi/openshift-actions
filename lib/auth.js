"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = require("@actions/core");
const constants_1 = require("./constants");
const command_1 = require("./command");
const { Toolkit } = require('actions-toolkit');
class OcAuth {
    static initOpenShiftEndpoint(openShiftServer, parameters) {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                serverUrl: openShiftServer,
                parameters: JSON.parse(parameters),
                scheme: 'Token'
            }; //for testing
        });
    }
    static createKubeConfig(endpoint, ocPath, runnerOS) {
        return __awaiter(this, void 0, void 0, function* () {
            const tools = new Toolkit();
            tools.log('createKubeConfig');
            if (!endpoint) {
                core.debug('Null endpoint is not allowed');
                return Promise.reject('Endpoint is not valid');
            }
            // potential values for EndpointAuthorization:
            //
            // parameters:{"apitoken":***}, scheme:'Token'
            // parameters:{"username":***,"password":***}, scheme:'UsernamePassword'
            // parameters:{"kubeconfig":***}, scheme:'None'
            let authType = endpoint.scheme;
            let skip = OcAuth.skipTlsVerify(endpoint);
            switch (authType) {
                case constants_1.BASIC_AUTHENTICATION:
                    let username = endpoint.parameters['username'];
                    let password = endpoint.parameters['password'];
                    yield command_1.Command.execute(ocPath, `login ${skip} -u ${username} -p ${password} ${endpoint.serverUrl}`);
                    break;
                case constants_1.TOKEN_AUTHENTICATION:
                    let args = `login ${skip} --token ${endpoint.parameters['apitoken']} ${endpoint.serverUrl}`;
                    tools.log('args: ' + args);
                    yield command_1.Command.execute(ocPath, args);
                    break;
                case constants_1.NO_AUTHENTICATION:
                    //authKubeConfig(endpoint.parameters['kubeconfig'], runnerOS);
                    break;
                default:
                    throw new Error(`unknown authentication type '${authType}'`);
            }
        });
    }
    static skipTlsVerify(endpoint) {
        let skipTlsVerify = '';
        return skipTlsVerify;
    }
}
exports.OcAuth = OcAuth;
