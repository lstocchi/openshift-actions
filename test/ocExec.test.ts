import { OcAuth, OpenShiftEndpoint } from '../src/auth';
import * as ocExec from '../src/ocExec';
import * as chai from 'chai';
import * as core from '@actions/core';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { BASIC_AUTHENTICATION, TOKEN_AUTHENTICATION } from '../src/constants';
import { Command } from '../src/command';
import { Installer } from '../src/installer';

const expect = chai.expect;
chai.use(sinonChai);

suite('ocExec', () => {
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    suite('run', () => {
        const endpoint = {
            serverUrl: 'server',
            parameters: JSON.parse('{"key":"value"}'),
            scheme: BASIC_AUTHENTICATION
        };

        test('check if correct inputs are retrieved before executing command', async () => {
            const getInputStub = sandbox.stub(core, 'getInput').onFirstCall().returns('url')
                                                                .onSecondCall().returns('params')
                                                                .onThirdCall().returns('version')
                                                                .onCall(3).returns('cmd');
            sandbox.stub(Installer, 'installOc').resolves('path');
            sandbox.stub(OcAuth, 'initOpenShiftEndpoint').resolves()
            sandbox.stub(OcAuth, 'createKubeConfig');
            sandbox.stub(Command, 'execute');
            await ocExec.run();
            expect(getInputStub.firstCall).calledWith('openshift_server_url');
            expect(getInputStub.secondCall).calledWith('parameters');
            expect(getInputStub.thirdCall).calledWith('version');
            expect(getInputStub.lastCall).calledWith('cmd');
        });

        test('reject promise if cmd is passed', async () => {
            sandbox.stub(core, 'getInput').onFirstCall().returns('url')
                                        .onSecondCall().returns('params')
                                        .onThirdCall().returns('version')
                                        .onCall(3).returns('');
            try {
                await ocExec.run();
            } catch (err) {
                expect(err).equals('Invalid cmd input. Insert at least one command to be executed.');
            }            
        });

        test('check if error is thrown if oc path is null', async () => {
            process.env.RUNNER_OS = 'OS';
            sandbox.stub(core, 'getInput').onFirstCall().returns('url')
                                        .onSecondCall().returns('params')
                                        .onThirdCall().returns('version')
                                        .onCall(3).returns('cmd');
            const installStub = sandbox.stub(Installer, 'installOc').resolves(null);
            const runSpy = sandbox.spy(ocExec, 'run');
            try {
                runSpy();
            } catch (err) {}
            expect(installStub).calledOnceWith('version', 'OS')
            expect(runSpy).throw;
        });

        test('check if initOpenShiftEndpoint and createKubeConfig are called with right params', async () => {
            sandbox.stub(core, 'getInput').onFirstCall().returns('url')
                                        .onSecondCall().returns('params')
                                        .onThirdCall().returns('version')
                                        .onCall(3).returns('cmd');
            sandbox.stub(Installer, 'installOc').resolves('path');
            const initStub = sandbox.stub(OcAuth, 'initOpenShiftEndpoint').resolves(endpoint);
            const createStub = sandbox.stub(OcAuth, 'createKubeConfig');
            sandbox.stub(Command, 'execute');
            await ocExec.run();
            expect(initStub).calledOnceWith('url', 'params');
            expect(createStub).calledOnceWith(endpoint, 'path');
        });

        test('check if execute is called once if there is 1 command as input', async () => {
            sandbox.stub(core, 'getInput').onFirstCall().returns('url')
                                        .onSecondCall().returns('params')
                                        .onThirdCall().returns('version')
                                        .onCall(3).returns('cmd');
            sandbox.stub(Installer, 'installOc').resolves('path');
            sandbox.stub(OcAuth, 'initOpenShiftEndpoint').resolves(endpoint);
            sandbox.stub(OcAuth, 'createKubeConfig');
            const commandStub = sandbox.stub(Command, 'execute');
            await ocExec.run();
            expect(commandStub).calledOnceWith('path', 'cmd');
        });

        test('check if execute is called n times if there are n commands as inputs', async () => {
            sandbox.stub(core, 'getInput').onFirstCall().returns('url')
                                        .onSecondCall().returns('params')
                                        .onThirdCall().returns('version')
                                        .onCall(3).returns('cmd\ncmd2');
            sandbox.stub(Installer, 'installOc').resolves('path');
            sandbox.stub(OcAuth, 'initOpenShiftEndpoint').resolves(endpoint);
            sandbox.stub(OcAuth, 'createKubeConfig');
            const commandStub = sandbox.stub(Command, 'execute');
            await ocExec.run();
            expect(commandStub).calledTwice;
        });
    });
})