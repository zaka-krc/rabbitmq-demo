const sendMessage = require('./send');      // Import your sender
const startReceiver = require('./receive'); // Import your receiver
const assert = require('assert');

const testData = { text: 'Integration Test Message', testId: 123 };
const testRoutingKey = 'test.message';

async function runTest() {
  console.log("--- Starting Integration Test ---");

  let connection;
  try {
    // 1. Start the receiver and listen for routing pattern 'test.*'
    connection = await startReceiver('test.*', (messageData, routingKey) => {
      // 3. Verify the received message
      try {
        console.log(`Test receiver caught message: ${JSON.stringify(messageData.data)}`);
        assert.strictEqual(routingKey, testRoutingKey, "Routing key should match");
        assert.deepStrictEqual(messageData.data, testData, "Message data should match");
        
        console.log("✅ TEST PASSED");
        
      } catch (err) {
        console.error("❌ TEST FAILED:", err.message);
        process.exit(1); // Exit with failure code
      } finally {
        // 4. Cleanup and close connection (this removes the temporary queue)
        if (connection) connection.close();
        process.exit(0); // Exit with success code
      }
    });

    console.log(`Receiver started, listening for routing key '${testRoutingKey}'`);

    // Small delay to ensure receiver is fully ready
    await new Promise(resolve => setTimeout(resolve, 500));

    // 2. Send a test message
    console.log("Sending test message...");
    await sendMessage(testRoutingKey, testData);

  } catch (error) {
    console.error("❌ An error occurred during the test setup:", error);
    if (connection) connection.close();
    process.exit(1);
  }
}

runTest();