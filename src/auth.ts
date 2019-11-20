import * as core from '@actions/core';
import { BASIC_AUTHENTICATION, NO_AUTHENTICATION, TOKEN_AUTHENTICATION } from './constants';
import { Command } from './command';

export interface OpenShiftEndpoint {
    /* URL to the OpenShiftServer */
    serverUrl: string;
    /* dictionary of auth data */
    parameters: {
      [key: string]: string;
    };
    /* auth scheme such as OAuth or username/password etc... */
    scheme: string;
}

export class OcAuth {
    static async initOpenShiftEndpoint(openShiftServer: string, parameters: string): Promise<OpenShiftEndpoint> {
        if (!openShiftServer) {
            return Promise.reject('Invalid Openshift cluster URL.');
        }
        if (!parameters) {
            return Promise.reject('Invalid parameters workflow input.');
        }

        const paramsJSON: { [key: string]: string } = JSON.parse(parameters);
        let scheme = '';
        if (paramsJSON['username'] && paramsJSON['password']){
            scheme = BASIC_AUTHENTICATION;
        } else if (paramsJSON['apitoken']) {
            scheme = TOKEN_AUTHENTICATION;
        } else {
            return Promise.reject('There are no sufficient parameters to authenticate to an Openshift cluster.');
        }

        return {
            serverUrl: openShiftServer,
            parameters: paramsJSON,
            scheme: scheme
        } as OpenShiftEndpoint;
    }

    static async createKubeConfig(endpoint: OpenShiftEndpoint, ocPath: string): Promise<void> {
        if (!endpoint) {
            core.debug('Null endpoint is not allowed');
            return Promise.reject('Endpoint is not valid');
        }

        // potential values for EndpointAuthorization:
        //
        // parameters:{"apitoken":***}, scheme:'Token'
        // parameters:{"username":***,"password":***}, scheme:'UsernamePassword'
        // parameters:{"kubeconfig":***}, scheme:'None'
        const authType = endpoint.scheme;
        let useCertificateOrSkipTls = OcAuth.getCertificateAuthorityFile(endpoint);
        if (useCertificateOrSkipTls === '') {
            useCertificateOrSkipTls = OcAuth.skipTlsVerify(endpoint);
        }
        switch (authType) {
            case BASIC_AUTHENTICATION:
                const username = endpoint.parameters['username'];
                const password = endpoint.parameters['password'];
                await Command.execute(
                    ocPath,
                    `login ${useCertificateOrSkipTls} -u ${username} -p ${password} ${endpoint.serverUrl}`
                );
                break;
            case TOKEN_AUTHENTICATION:
                const args = `login ${useCertificateOrSkipTls} --token ${endpoint.parameters['apitoken']} ${endpoint.serverUrl}`;
                await Command.execute(ocPath, args);
                break;
            case NO_AUTHENTICATION:
                // authKubeConfig(endpoint.parameters['kubeconfig'], runnerOS);
                break;
            default:
                throw new Error(`unknown authentication type '${authType}'`);
        }

    }

    static getCertificateAuthorityFile(endpoint: OpenShiftEndpoint): string {
        let certificateFile = '';
        if (endpoint.parameters['certificateAuthorityFile']) {
            certificateFile = `--certificate-authority=${endpoint.parameters['certificateAuthorityFile']}`;
        }
        return certificateFile;
    }

    static skipTlsVerify(endpoint: OpenShiftEndpoint): string {
        let skipTlsVerify = '';
        if (endpoint.parameters['acceptUntrustedCerts'] === 'true') {
            skipTlsVerify = '--insecure-skip-tls-verify';
        }
        return skipTlsVerify;
    }
}