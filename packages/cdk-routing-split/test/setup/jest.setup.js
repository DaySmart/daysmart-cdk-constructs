/* eslint-disable @typescript-eslint/no-var-requires */
const AWS = require('aws-sdk');

AWS.config.update({ region: 'us-east-1' });
AWS.config.credentials = new AWS.SharedIniFileCredentials({ profile: 'sandbox' });

// prevent lambdas from logging to jest
global.console = {
    log: jest.fn(),
    //log: console.log, //Uncomment for debugging purposes
    error: jest.fn(),
    //error: console.error, //Uncomment for debugging purposes
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
};
