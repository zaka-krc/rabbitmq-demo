# RabbitMQ Integratie Demo

Dit is een simpel Node.js project dat laat zien hoe je RabbitMQ gebruikt met encryptie en simulatie van SAP-verwerking.

## 📋 Voorwaarden
1. **Node.js** geïnstalleerd.
2. **RabbitMQ server** die draait (bijvoorbeeld in WSL).

## 🚀 Installatie
Installeer de benodigde packages:
```bash
npm install
```

## ⚙️ Configuratie (Belangrijk!)
Het project staat standaard ingesteld op **AMQPS (SSL)**.
1. Zorg dat je RabbitMQ gebruiker en wachtwoord in `config.js` kloppen.
2. Als je **geen SSL** wilt gebruiken:
   - Verander `amqps://` naar `amqp://` in `config.js`.
   - Je mag `RABBITMQ_OPTIONS` laten staan of weghalen.


## 🔒 RabbitMQ SSL (AMQPS) Setup (WSL)
Om RabbitMQ met SSL te laten werken in WSL, moet je certificaten genereren en de server configureren.

### Stap 1: Certificaten Genereren
Voer dit script uit in je projectmap (binnen WSL):
```bash
chmod +x generate_certs.sh
./generate_certs.sh
```
Dit maakt een map `./certs` aan.

### Stap 2: Certificaten Kopiëren
Kopieer de bestanden naar de RabbitMQ configuratiemap:
```bash
sudo mkdir -p /etc/rabbitmq/certs
sudo cp ./certs/* /etc/rabbitmq/certs/
sudo chown -R rabbitmq:rabbitmq /etc/rabbitmq/certs
sudo chmod -R 700 /etc/rabbitmq/certs
```

### Stap 3: Configureren
Voeg dit toe aan `/etc/rabbitmq/rabbitmq.conf`:
```properties
listeners.ssl.default = 5671
ssl_options.cacertfile = /etc/rabbitmq/certs/ca_certificate.pem
ssl_options.certfile   = /etc/rabbitmq/certs/server_certificate.pem
ssl_options.keyfile    = /etc/rabbitmq/certs/server_key.pem
ssl_options.verify = verify_none
ssl_options.fail_if_no_peer_cert = false
```

### Stap 4: Herstarten
```bash
sudo service rabbitmq-server restart
```

## ▶️ Starten

### 1. Start de Server
Dit start de web interface en de API.
```bash
node server.js
```
Ga naar **http://localhost:3000** in je browser.

### 2. Start de SAP Converter (Optioneel)
Dit script luistert continu naar nieuwe orders en zet ze om naar XML.
```bash
node sap-converter.js
```
*Let op: Als deze draait, pikt hij de berichten direct van de wachtrij!*

## 🧪 Testen
Draai een automatische test om te zien of alles werkt (verzenden -> versleutelen -> ontvangen -> ontsleutelen):
```bash
npm test
```
