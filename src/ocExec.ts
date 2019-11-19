import * as core from '@actions/core';
import { Installer } from './installer';
import { Command } from './command';
import { OcAuth, OpenShiftEndpoint } from './auth';
const { Toolkit } = require('actions-toolkit');

async function run() {
    const openShiftUrl = core.getInput('openshift_server_url');
    const parameters = core.getInput('parameters');
    const version = core.getInput('version');
    const args = core.getInput('cmd');
    const tools = new Toolkit();
    const argsA = args.split('\n');
    
    const runnerOS = process.env['RUNNER_OS'];

    core.debug(version);
    core.debug(runnerOS);
    core.debug(process.env['RUNNER_TEMP']);

    let ocPath = await Installer.installOc(version, runnerOS);
    if (ocPath === null) {
        throw new Error('no oc binary found');
    }

    const endpoint: OpenShiftEndpoint = await OcAuth.initOpenShiftEndpoint(openShiftUrl, parameters);
    await OcAuth.createKubeConfig(endpoint, ocPath, runnerOS);
    for (const a of argsA) {
        await Command.execute(ocPath, a);  
    }    
      
}

run().catch(core.setFailed);