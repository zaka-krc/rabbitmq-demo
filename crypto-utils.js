const crypto = require('crypto');
const config = require('./config');

const algorithm = 'aes-256-cbc';

// Helper om een 32-byte sleutel te genereren uit de geheime string
function getKey() {
    return crypto.createHash('sha256').update(String(config.ENCRYPTION_SECRET)).digest();
}

/**
 * Versleutelt een object of string.
 * Retourformaat: "iv_hex:encrypted_content_hex"
 */
function encrypt(data) {
    const key = getKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    // Converteer JSON objecten eerst naar string
    const text = typeof data === 'object' ? JSON.stringify(data) : String(data);

    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Ontsleutelt een string in formaat "iv_hex:encrypted_content_hex".
 * Retourneert het geparste JSON object indien mogelijk, anders de string.
 */
function decrypt(text) {
    try {
        const key = getKey();
        const textParts = text.split(':');

        // Basis validatie
        if (textParts.length < 2) return null;

        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');

        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        const decryptedString = decrypted.toString();

        // Probeer JSON te parsen, anders retourneer string
        try {
            return JSON.parse(decryptedString);
        } catch (e) {
            return decryptedString;
        }
    } catch (err) {
        console.error("Decryption failed:", err.message);
        return null; // or throw
    }
}

module.exports = { encrypt, decrypt };
