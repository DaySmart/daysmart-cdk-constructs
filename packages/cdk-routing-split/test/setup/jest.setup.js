/* eslint-disable @typescript-eslint/no-var-requires */
const AWS = require('aws-sdk');

AWS.config.update({ region: 'us-east-1' });
if (process.env.DSI_PARAMETER_NAME && process.env.DSI_PARAMETER_NAME.includes('sandbox')) {
    AWS.config.credentials = new AWS.SharedIniFileCredentials({ profile: 'sandbox' });
    jest.setTimeout(30000); // allows for local debugging using vscode
}

// prevent lambdas from logging to jest
global.console = {
    //log: jest.fn(),
    log: console.log, //Uncomment for debugging purposes
    error: jest.fn(),
    //error: console.error, //Uncomment for debugging purposes
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
};
