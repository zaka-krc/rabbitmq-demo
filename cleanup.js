const http = require('http');
const config = require('./config');

// RabbitMQ Management API credentials (default)
const hostname = 'localhost';
const port = 15672;
const username = 'guest';
const password = 'guest';
const vhost = '/';

async function getAllQueues() {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    
    const options = {
      hostname: hostname,
      port: port,
      path: `/api/queues/${encodeURIComponent(vhost)}`,
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Failed to fetch queues: ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function deleteQueue(queueName) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    
    const options = {
      hostname: hostname,
      port: port,
      path: `/api/queues/${encodeURIComponent(vhost)}/${encodeURIComponent(queueName)}`,
      method: 'DELETE',
      headers: {
        'Authorization': `Basic ${auth}`
      }
    };

    const req = http.request(options, (res) => {
      if (res.statusCode === 204 || res.statusCode === 200) {
        resolve();
      } else {
        reject(new Error(`Failed to delete: ${res.statusCode}`));
      }
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function deleteExchange(exchangeName) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    
    const options = {
      hostname: hostname,
      port: port,
      path: `/api/exchanges/${encodeURIComponent(vhost)}/${encodeURIComponent(exchangeName)}`,
      method: 'DELETE',
      headers: {
        'Authorization': `Basic ${auth}`
      }
    };

    const req = http.request(options, (res) => {
      if (res.statusCode === 204 || res.statusCode === 200) {
        resolve();
      } else {
        reject(new Error(`Failed to delete: ${res.statusCode}`));
      }
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function cleanup() {
  console.log('=== RabbitMQ Cleanup ===\n');
  
  try {
    // 1. Delete our demo queue
    console.log(`Deleting queue '${config.QUEUE_NAME}'...`);
    try {
      await deleteQueue(config.QUEUE_NAME);
      console.log(`✓ Deleted queue: ${config.QUEUE_NAME}`);
    } catch (err) {
      console.log(`⚠ Queue '${config.QUEUE_NAME}' not found or already deleted`);
    }

    // 2. Delete our demo exchange
    console.log(`\nDeleting exchange '${config.EXCHANGE_NAME}'...`);
    try {
      await deleteExchange(config.EXCHANGE_NAME);
      console.log(`✓ Deleted exchange: ${config.EXCHANGE_NAME}`);
    } catch (err) {
      console.log(`⚠ Exchange '${config.EXCHANGE_NAME}' not found or already deleted`);
    }

    // 3. Show remaining queues (if any)
    console.log('\n--- Remaining queues ---');
    const queues = await getAllQueues();
    
    if (queues.length === 0) {
      console.log('No queues remaining. Everything is clean!');
    } else {
      console.log(`Found ${queues.length} other queue(s):`);
      for (const queue of queues) {
        console.log(`  - ${queue.name} (${queue.messages || 0} messages)`);
      }
    }
    
    console.log('\n✅ Cleanup completed!\n');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    console.error('\nMake sure RabbitMQ Management plugin is enabled at http://localhost:15672');
    process.exit(1);
  }
}

cleanup();
