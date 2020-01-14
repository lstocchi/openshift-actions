import * as path from 'path';

import { runTests } from 'vscode-test';

/* global console, __dirname */
/* eslint no-undef: "error" */

async function main() {
    try {
        // The folder containing the Extension Manifest package.json
        // Passed to `--extensionDevelopmentPath`
        const extensionDevelopmentPath = path.resolve(__dirname, '../..');

        // The path to the extension test runner script
        // Passed to --extensionTestsPath
        const extensionTestsPath = path.resolve(__dirname, './');

        // Download VS Code, unzip it and run the integration test
        console.log(extensionDevelopmentPath, extensionTestsPath);
        await runTests({ extensionDevelopmentPath, extensionTestsPath });
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

main();