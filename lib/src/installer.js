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
/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
const core = require("@actions/core");
const fs = require("mz/fs");
const io = require("@actions/io/lib/io");
const ioUtil = require("@actions/io/lib/io-util");
const path = require("path");
const tc = require("@actions/tool-cache");
const validUrl = require("valid-url");
const constants_1 = require("./constants");
const command_1 = require("./command");
class Installer {
    static installOc(version, runnerOS, useLocalOc) {
        return __awaiter(this, void 0, void 0, function* () {
            if (useLocalOc) {
                const localOcPath = yield Installer.getLocalOcPath(version);
                if (localOcPath) {
                    return localOcPath;
                }
            }
            if (!version) {
                return Promise.reject(new Error('Invalid version input. Provide a valid version number or url where to download an oc bundle.'));
            }
            let url = '';
            if (validUrl.isWebUri(version)) {
                url = version;
            }
            else {
                url = yield Installer.getOcBundleUrl(version, runnerOS);
            }
            core.debug(`downloading: ${url}`);
            const ocBinary = yield Installer.downloadAndExtract(url, runnerOS);
            return ocBinary;
        });
    }
    static downloadAndExtract(url, runnerOS) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!url) {
                return Promise.reject(new Error('Unable to determine oc download URL.'));
            }
            let downloadDir = '';
            const pathOcArchive = yield tc.downloadTool(url);
            let ocBinary;
            if (runnerOS === 'Windows') {
                downloadDir = yield tc.extractZip(pathOcArchive);
                ocBinary = path.join(downloadDir, 'oc.exe');
            }
            else {
                downloadDir = yield tc.extractTar(pathOcArchive);
                ocBinary = path.join(downloadDir, 'oc');
            }
            if (!(yield ioUtil.exists(ocBinary))) {
                return Promise.reject(new Error('Unable to download or extract oc binary.'));
            }
            fs.chmodSync(ocBinary, '0755');
            return ocBinary;
        });
    }
    static getOcBundleUrl(version, runnerOS) {
        return __awaiter(this, void 0, void 0, function* () {
            let url = '';
            if (version === 'latest') {
                url = yield Installer.latest(runnerOS);
                return url;
            }
            // determine the base_url based on version
            const reg = new RegExp('\\d+(?=\\.)');
            const vMajorRegEx = reg.exec(version);
            if (!vMajorRegEx || vMajorRegEx.length === 0) {
                core.debug('Error retrieving version major');
                return null;
            }
            const vMajor = +vMajorRegEx[0];
            const ocUtils = yield Installer.getOcUtils();
            if (vMajor === 3) {
                url = `${ocUtils.openshiftV3BaseUrl}/${version}/`;
            }
            else if (vMajor === 4) {
                url = `${ocUtils.openshiftV4BaseUrl}/${version}/`;
            }
            else {
                core.debug('Invalid version');
                return null;
            }
            const bundle = Installer.getOcBundleByOS(runnerOS);
            if (!bundle) {
                core.debug('Unable to find bundle url');
                return null;
            }
            url += bundle;
            core.debug(`archive URL: ${url}`);
            return url;
        });
    }
    static latest(runnerOS) {
        return __awaiter(this, void 0, void 0, function* () {
            const bundle = Installer.getOcBundleByOS(runnerOS);
            if (!bundle) {
                core.debug('Unable to find bundle url');
                return null;
            }
            const ocUtils = yield Installer.getOcUtils();
            const url = `${ocUtils.openshiftV4BaseUrl}/${constants_1.LATEST}/${bundle}`;
            core.debug(`latest stable oc version: ${url}`);
            return url;
        });
    }
    static getOcBundleByOS(runnerOS) {
        let url = '';
        // determine the bundle path based on the OS type
        switch (runnerOS) {
            case 'Linux': {
                url += `${constants_1.LINUX}/${constants_1.OC_TAR_GZ}`;
                break;
            }
            case 'macOS': {
                url += `${constants_1.MACOSX}/${constants_1.OC_TAR_GZ}`;
                break;
            }
            case 'Windows': {
                url += `${constants_1.WIN}/${constants_1.OC_ZIP}`;
                break;
            }
            default: {
                return null;
            }
        }
        return url;
    }
    /**
     * Retrieve the path of the oc CLI installed in the machine.
     *
     * @param version the version of `oc` to be used. If not specified any `oc` version,
     *                if found, will be used.
     * @return the full path to the installed executable or
     *         undefined if the oc CLI version requested is not found.
     */
    static getLocalOcPath(version) {
        return __awaiter(this, void 0, void 0, function* () {
            let ocPath;
            try {
                ocPath = yield io.which('oc', true);
                core.debug(`ocPath ${ocPath}`);
            }
            catch (ex) {
                core.debug(`Oc has not been found on this machine. Err ${ex}`);
            }
            if (version && ocPath) {
                const localOcVersion = yield Installer.getOcVersion(ocPath);
                core.debug(`localOcVersion ${localOcVersion} vs ${version}`);
                if (!localOcVersion
                    || localOcVersion.toLowerCase() !== version.toLowerCase()) {
                    return undefined;
                }
            }
            return ocPath;
        });
    }
    static getOcVersion(ocPath) {
        return __awaiter(this, void 0, void 0, function* () {
            let stdOut = '';
            const options = {};
            options.listeners = {
                stdout: (data) => {
                    stdOut += data.toString();
                }
            };
            let exitCode = yield command_1.Command.execute(ocPath, 'version --short=true --client=true', options);
            if (exitCode === 1) {
                core.debug('error executing oc version --short=true --client=true');
                // if oc version failed we're dealing with oc < 4.1
                exitCode = yield command_1.Command.execute(ocPath, 'version', options);
            }
            if (exitCode === 1) {
                core.debug('error executing oc version');
                return undefined;
            }
            core.debug(`stdout ${stdOut}`);
            const regexVersion = new RegExp('v[0-9]+.[0-9]+.[0-9]+');
            const versionObj = regexVersion.exec(stdOut);
            if (versionObj && versionObj.length > 0) {
                return versionObj[0];
            }
            return undefined;
        });
    }
    static getOcUtils() {
        return __awaiter(this, void 0, void 0, function* () {
            // eslint-disable-next-line no-undef
            const rawData = yield fs.readFile(path.join(__dirname, '/../../oc-utils.json'));
            return JSON.parse(rawData);
        });
    }
}
exports.Installer = Installer;
