require('dotenv').config({ path: 'rabbitmq-demo\.github\.env' });
const jsforce = require('jsforce');


console.log('Test - SALESFORCE_USERNAME:', process.env.SALESFORCE_USERNAME);
console.log('Test - SALESFORCE_PASSWORD aanwezig?', !!process.env.SALESFORCE_PASSWORD);
console.log('Test - SALESFORCE_SECURITY_TOKEN aanwezig?', !!process.env.SALESFORCE_SECURITY_TOKEN);
console.log('Alle env vars:', Object.keys(process.env).filter(k => k.startsWith('SALESFORCE')));