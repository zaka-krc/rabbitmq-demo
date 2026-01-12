const amqp = require('amqplib');
const config = require('./config');

async function startSapConverter() {
  // 1. Verbinding maken met RabbitMQ
  const connection = await amqp.connect(config.RABBITMQ_URL, config.RABBITMQ_OPTIONS);
  const channel = await connection.createChannel();

  // Zorgen dat de wachtrij bestaat
  await channel.assertQueue(config.QUEUE_NAME, { durable: true });

  console.log(" 🔄 SAP Converter gestart...");
  console.log(" [*] Wachten op bestellingen in '%s' om te vertalen...", config.QUEUE_NAME);

  // 2. Luisteren naar berichten
  channel.consume(config.QUEUE_NAME, (msg) => {
    if (msg !== null) {
      const { decrypt } = require('./crypto-utils');

      // Het bericht komt binnen als ruwe data (Buffer), dus eerst omzetten naar tekst en dan naar JSON object
      let jsonContent = JSON.parse(msg.content.toString());

      if (jsonContent.encryptedData) {
        jsonContent = decrypt(jsonContent.encryptedData);
      }

      const orderData = jsonContent.data; // Hier zit de echte info in (orderId, customerName)

      console.log("\n [📥] Nieuw bericht ontvangen (JSON):");
      console.log(jsonContent);

      // 3. Hier gebeurt de conversie (Mapping)
      // We pakken de gegevens uit de JSON en stoppen ze in de XML templates

      const datumVandaag = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // Maakt bijv. 20260108

      const sapXml = `
<ORDERS05>
    <IDOC BEGIN="1">
        <!-- HEADER: Algemene info over de bestelling -->
        <E1EDK01 SEGMENT="1">
            <CURCY>EUR</CURCY>
            <BELNR>${orderData.orderId}</BELNR>  <!-- Order ID -->
            <BSART>OR</BSART>
        </E1EDK01>
        
        <!-- DATUM: Wanneer is het besteld? -->
        <E1EDK03 SEGMENT="1">
            <IDDAT>012</IDDAT>
            <DATUM>${datumVandaag}</DATUM>
        </E1EDK03>
        
        <!-- ORGANISATIE: Voor welke afdeling is dit? -->
        <E1EDK14 SEGMENT="1">
            <QUALF>008</QUALF>
            <ORGID>1000</ORGID>
        </E1EDK14>

        <!-- PARTNER: Wie heeft er besteld? -->
        <E1EDKA1 SEGMENT="1">
            <PARVW>AG</PARVW> <!-- AG = Opdrachtgever -->
            <PARTN>${orderData.customerName}</PARTN> <!-- Klantnaam/ID -->
        </E1EDKA1>
    </IDOC>
</ORDERS05>`;

      // 4. Het resultaat laten zien (Dit zou normaal naar SAP gestuurd worden)
      console.log("\n [✅] Succesvol vertaald naar SAP IDoc (XML):");
      console.log(sapXml);

      // 5. Bevestig aan RabbitMQ dat we klaar zijn
      channel.ack(msg);
    }
  });
}

// Start de functie
startSapConverter().catch(console.error);