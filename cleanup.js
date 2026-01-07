const http = require('http');

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

async function cleanup() {
  try {
    console.log('Fetching all queues from RabbitMQ...\n');
    
    const queues = await getAllQueues();
    
    if (queues.length === 0) {
      console.log('✓ No queues found. Everything is clean!');
      process.exit(0);
    }

    console.log(`Found ${queues.length} queue(s):\n`);
    
    for (const queue of queues) {
      try {
        // Skip exclusive queues (they're auto-deleted)
        if (queue.exclusive) {
          console.log(`⚠ Skipping exclusive queue: ${queue.name} (auto-deleted when connection closes)`);
          continue;
        }
        
        await deleteQueue(queue.name);
        console.log(`✓ Deleted queue: ${queue.name}`);
      } catch (err) {
        console.log(`✗ Failed to delete queue '${queue.name}': ${err.message}`);
      }
    }
    
    console.log('\n✅ Cleanup completed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    console.error('\nMake sure RabbitMQ Management plugin is enabled and accessible at http://localhost:15672');
    process.exit(1);
  }
}

cleanup();
