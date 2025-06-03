const jestDom = require('@testing-library/jest-dom');

// Polyfill TextEncoder/TextDecoder for Node 18-
const { TextEncoder, TextDecoder } = require('util');
if (!global.TextEncoder) global.TextEncoder = TextEncoder;
if (!global.TextDecoder) global.TextDecoder = TextDecoder; 