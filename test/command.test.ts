import { Command } from '../src/command';
import * as chai from 'chai';
import * as exec from '@actions/exec';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';

const expect = chai.expect;
chai.use(sinonChai);

suite('Command', () => {
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    suite('execute', () => {
        test('check if promise rejected if oc path is not defined', async () => {
            try {
                await Command.execute(undefined, 'args');
                expect.fail();
            } catch (err) {
                expect(err).equals('Unable to find oc bundle');
            }
        });

        test('check if promise rejected if oc path is empty', async () => {
            try {
                await Command.execute('', 'args');
                expect.fail();
            } catch (err) {
                expect(err).equals('Unable to find oc bundle');
            }
        });

        test('check if prepareOcArgs is called with right params', async () => {
            const prepareOcArgsStub = sandbox.stub(Command, 'prepareOcArgs');
            sandbox.stub(exec, 'exec').resolves(0);
            await Command.execute('path', 'args');
            expect(prepareOcArgsStub).calledOnceWith('args');
        });

        test('check if exec method is called with right command', async () => {
            sandbox.stub(Command, 'prepareOcArgs').resolves('cmdArgs');
            const execStub = sandbox.stub(exec, 'exec').resolves(0);
            const result = await Command.execute('path', 'args');
            expect(execStub).calledOnceWith('path cmdArgs');
            expect(result).equals(0);
        });
    });

    suite('prepareOcArgs', () => {
        test('oc is cut off from final result string', async () => {
            const res = await Command.prepareOcArgs('oc version');
            expect(res).equals('version');
        });

        test('oc.exe is cut off from final result string', async () => {
            const res = await Command.prepareOcArgs('oc.exe version');
            expect(res).equals('version');
        });

        test('check if substituer substitute value', async () => {
            process.env.TESTENV = 'TEST';
            const result = await Command.prepareOcArgs('oc ${TESTENV}');
            expect(result).equals('TEST');
        });

        test('slice function is not called if args doesnt contain oc', async () => {
            const sliceStub = sandbox.stub(Array.prototype, 'slice');
            await Command.prepareOcArgs('version');
            expect(sliceStub).not.called;
        });
    });
});