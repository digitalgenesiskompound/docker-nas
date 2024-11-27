const Encryption = (function () {
    // Generate a random Initialization Vector (IV)
    function generateIV() {
        return CryptoJS.lib.WordArray.random(16); // 16 bytes for AES-128
    }

    // Generate a random Salt
    function generateSalt() {
        return CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex);
    }

    // Generate a key from a passphrase using PBKDF2 with a unique salt
    function generateKey(passphrase, salt) {
        return CryptoJS.PBKDF2(passphrase, CryptoJS.enc.Hex.parse(salt), {
            keySize: 256 / 32,
            iterations: 1000,
        });
    }

    // Encrypt data using AES-CBC
    function encryptData(data, key, iv) {
        const encrypted = CryptoJS.AES.encrypt(data, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
        return encrypted.toString(); // Base64-encoded ciphertext
    }

    // Decrypt data using AES-CBC
    function decryptData(ciphertext, key, ivHex) {
        const iv = CryptoJS.enc.Hex.parse(ivHex);
        const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
        return decrypted; // Returns WordArray
    }

    // Helper function to convert WordArray to Uint8Array
    function wordArrayToUint8Array(wordArray) {
        const sigBytes = wordArray.sigBytes;
        const words = wordArray.words;
        const result = new Uint8Array(sigBytes);
        let offset = 0;

        for (let i = 0; i < sigBytes; i++) {
            const byte = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
            result[offset++] = byte;
        }

        return result;
    }

    return {
        generateIV,
        generateSalt,
        generateKey,
        encryptData,
        decryptData,
        wordArrayToUint8Array,
    };
})();
