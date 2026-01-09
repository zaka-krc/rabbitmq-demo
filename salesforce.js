require('dotenv').config();
const jsforce = require('jsforce');

const SF_USERNAME = process.env.SF_USERNAME;
const SF_PASSWORD = process.env.SF_PASSWORD;
const SF_SECURITY_TOKEN = process.env.SF_SECURITY_TOKEN || '';
const SF_LOGIN_URL = process.env.SF_LOGIN_URL || 'https://login.salesforce.com';
const SF_OBJECT = process.env.SF_OBJECT || 'Order__c';
const SF_EXTERNAL_ID_FIELD = process.env.SF_EXTERNAL_ID_FIELD || 'OrderId__c';

let conn;
let loggedIn = false;

async function ensureLoggedIn() {
  if (loggedIn && conn) return conn;
  if (!SF_USERNAME || !SF_PASSWORD) {
    throw new Error('Salesforce credentials missing. Set SF_USERNAME and SF_PASSWORD in env.');
  }

  conn = new jsforce.Connection({ loginUrl: SF_LOGIN_URL });
  const password = SF_PASSWORD + (SF_SECURITY_TOKEN || '');
  await conn.login(SF_USERNAME, password);
  loggedIn = true;
  console.log('Salesforce: logged in as', SF_USERNAME);
  return conn;
}

// Map a simple order object to Salesforce sObject fields and upsert using external id
async function upsertOrder(order) {
  if (!order || !order.orderId) {
    throw new Error('Invalid order object: missing orderId');
  }

  await ensureLoggedIn();

  const record = {};
  record[SF_EXTERNAL_ID_FIELD] = order.orderId;
  // map common fields; adjust names in Salesforce or set SF_OBJECT to your custom object
  record['CustomerName__c'] = order.customerName || null;
  record['Timestamp__c'] = order.timestamp || new Date().toISOString();

  // Allow additional fields passed in the order.data
  if (order.items) record['Items__c'] = JSON.stringify(order.items);

  try {
    const res = await conn.sobject(SF_OBJECT).upsert(record, SF_EXTERNAL_ID_FIELD);
    console.log('Salesforce upsert result:', res);
    return res;
  } catch (err) {
    // if token expired or invalid session, try one retry after re-login
    if (err && err.errorCode === 'INVALID_SESSION_ID') {
      loggedIn = false;
      await ensureLoggedIn();
      return conn.sobject(SF_OBJECT).upsert(record, SF_EXTERNAL_ID_FIELD);
    }
    throw err;
  }
}

module.exports = {
  upsertOrder
};
