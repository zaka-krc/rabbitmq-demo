import jsforce from 'jsforce';
import * as dotenv from 'dotenv';

// Laad de variabelen uit je .env bestand
dotenv.config();

async function testConnection() {
    console.log("--- Salesforce Connectie Test ---");
    
    // De configuratie ophalen uit de .env
    const conn = new jsforce.Connection({
        loginUrl: process.env.SF_LOGIN_URL || 'https://login.salesforce.com'
    });

    const username = process.env.SF_USERNAME;
    const password = process.env.SF_PASSWORD;
    const token = process.env.SF_TOKEN;

    if (!username || !password || !token) {
        console.error("❌ Fout: Mis de inloggegevens in .env (Username, Password of Token)");
        return;
    }

    try {
        console.log(`Bezig met inloggen voor: ${username}...`);
        
        // Log in: Wachtwoord en Token moeten achter elkaar geplakt worden
        await conn.login(username, password + token);

        console.log("✅ Succes! Verbonden met Salesforce.");
        console.log("Organisatie ID:", conn.userInfo.organizationId);
        console.log("Gebruikers ID:", conn.userInfo.id);

        // Test een simpele query
        const res = await conn.query("SELECT Name FROM Organization");
        console.log("Organisatie naam uit SF:", res.records[0].Name);

    } catch (err) {
        console.error("❌ Verbinding mislukt!");
        console.error("Foutmelding:", err.message);
    }
}

testConnection();