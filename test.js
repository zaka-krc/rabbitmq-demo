const sendMessage = require('./send');      // Import your sender
const startReceiver = require('./receive'); // Import your receiver
const assert = require('assert');

const testMessage = 'Integration Test Message';

async function runTest() {
  console.log("--- Starting Real Code Test ---");

  // 1. Start your actual receiver, but inject a "Spy" function
  const connection = await startReceiver((receivedContent) => {
      
      // 3. Verify the message is what we sent
      try {
          console.log(`Spy caught message: ${receivedContent}`);
          assert.strictEqual(receivedContent, testMessage);
          console.log("✅ TEST PASSED");
          
          // Cleanup
          connection.close(); 
          process.exit(0);
      } catch (err) {
          console.error("❌ TEST FAILED: Content did not match");
          process.exit(1);
      }
  });

  // 2. Use your actual sender to send a message
  await sendMessage(testMessage);
}

runTest();