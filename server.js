const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const amqp = require('amqplib');
const path = require('path');
const cors = require('cors');
const config = require('./config');
const { encrypt, decrypt } = require('./crypto-utils');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cors());
app.use(express.json());

// Serveer de Frontend bestanden uit de 'public' map
app.use(express.static(path.join(__dirname, 'public')));

// --- RABBITMQ HULPFUNCTIE ---
async function getChannel() {
    const conn = await amqp.connect(config.RABBITMQ_URL);
    const channel = await conn.createChannel();
    await channel.assertExchange(config.EXCHANGE_NAME, 'topic', { durable: true });
    await channel.assertQueue(config.QUEUE_NAME, { durable: true });
    await channel.bindQueue(config.QUEUE_NAME, config.EXCHANGE_NAME, 'order.*');
    return { conn, channel };
}

// --- API 1: SEND (Verstuur Order) ---
app.post('/api/send', async (req, res) => {
    console.log("👉 [API] Send aangeroepen");
    const { orderId, customerName } = req.body;

    let connection;
    try {
        const { conn, channel } = await getChannel();
        connection = conn;

        const msg = {
            data: { orderId, customerName },
            ts: new Date().toISOString()
        };

        const encryptedMsg = encrypt(msg);
        const payload = { encryptedData: encryptedMsg };

        channel.publish(config.EXCHANGE_NAME, 'order.new', Buffer.from(JSON.stringify(payload)), { persistent: true });

        io.emit('log', { source: 'APP', msg: `Order ${orderId} verstuurd naar Queue.` });
        res.json({ status: 'ok' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) setTimeout(() => connection.close(), 500);
    }
});

// --- API 2: RECEIVE SAP (XML output) ---
app.post('/api/receive', async (req, res) => {
    console.log("👉 [API] Receive SAP aangeroepen");
    let connection;
    try {
        const { conn, channel } = await getChannel();
        connection = conn;

        const msg = await channel.get(config.QUEUE_NAME, { noAck: false });
        if (msg) {
            const rawContent = JSON.parse(msg.content.toString());
            let content = rawContent;

            if (rawContent.encryptedData) {
                content = decrypt(rawContent.encryptedData);
            }

            io.emit('log', { source: 'SAP', msg: `Bericht opgehaald: ${content.data.orderId}` });

            const sapXml = `<ORDERS05><BELNR>${content.data.orderId}</BELNR><KUNNR>${content.data.customerName}</KUNNR></ORDERS05>`;
            io.emit('xml', { xml: sapXml });

            channel.ack(msg);
            res.json({ status: 'processed' });
        } else {
            io.emit('log', { source: 'INFO', msg: `Queue is leeg.` });
            res.json({ status: 'empty' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) setTimeout(() => connection.close(), 500);
    }
});

// --- API 3: RECEIVE RAW (JSON output) ---
app.post('/api/receive-json', async (req, res) => {
    console.log("👉 [API] Receive JSON aangeroepen");
    let connection;
    try {
        const { conn, channel } = await getChannel();
        connection = conn;

        const msg = await channel.get(config.QUEUE_NAME, { noAck: false });
        if (msg) {
            const rawContent = JSON.parse(msg.content.toString());
            let content = rawContent;

            if (rawContent.encryptedData) {
                content = decrypt(rawContent.encryptedData);
            }

            // Stuur de ruwe data naar de frontend
            // We sturen nu de ontsleutelde data zodat de UI werkt zoals voorheen
            io.emit('json-raw', content);
            io.emit('log', { source: 'DEBUG', msg: `JSON data geïnspecteerd voor ${content.data.orderId}.` });

            channel.ack(msg);
            res.json({ status: 'processed' });
        } else {
            io.emit('log', { source: 'INFO', msg: `Queue is leeg.` });
            res.json({ status: 'empty' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) setTimeout(() => connection.close(), 500);
    }
});

server.listen(3000, () => {
    console.log('🚀 Server draait op http://localhost:3000');
});