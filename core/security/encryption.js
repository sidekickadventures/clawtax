/**
 * ClawTax Security Layer
 * Client-side AES-256-GCM encryption using WebCrypto API
 */

const CLAWTAX_SECURITY = {
    /**
     * Generate a new AES-GCM key
     */
    async generateKey() {
        return await crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );
    },

    /**
     * Export key to base64 for storage
     */
    async exportKey(key) {
        const exported = await crypto.subtle.exportKey('raw', key);
        return this.arrayBufferToBase64(exported);
    },

    /**
     * Import key from base64
     */
    async importKey(base64Key) {
        const keyData = this.base64ToArrayBuffer(base64Key);
        return await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );
    },

    /**
     * Encrypt data using AES-256-GCM
     */
    async encrypt(plaintext, key) {
        const encoder = new TextEncoder();
        const data = encoder.encode(plaintext);
        
        // Generate random IV (12 bytes for GCM)
        const iv = crypto.getRandomValues(new Uint8Array(12));
        
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            data
        );
        
        // Return IV + encrypted data
        const combined = new Uint8Array(iv.length + encrypted.byteLength);
        combined.set(iv, 0);
        combined.set(new Uint8Array(encrypted), iv.length);
        
        return this.arrayBufferToBase64(combined.buffer);
    },

    /**
     * Decrypt data using AES-256-GCM
     */
    async decrypt(encryptedBase64, key) {
        const combined = new Uint8Array(this.base64ToArrayBuffer(encryptedBase64));
        
        // Extract IV (first 12 bytes) and ciphertext
        const iv = combined.slice(0, 12);
        const ciphertext = combined.slice(12);
        
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            ciphertext
        );
        
        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    },

    /**
     * Encrypt object with metadata
     */
    async encryptPayload(payload, key) {
        const plaintext = JSON.stringify(payload);
        const encrypted = await this.encrypt(plaintext, key);
        
        return {
            v: 1, // version
            alg: 'AES-256-GCM',
            data: encrypted,
            timestamp: Date.now()
        };
    },

    /**
     * Decrypt payload
     */
    async decryptPayload(encryptedPayload, key) {
        const { data } = encryptedPayload;
        const plaintext = await this.decrypt(data, key);
        return JSON.parse(plaintext);
    },

    /**
     * Hash data using SHA-256 (for non-reversible storage)
     */
    async hash(data) {
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
        return this.arrayBufferToBase64(hashBuffer);
    },

    /**
     * Generate secure random ID
     */
    generateId() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    },

    // Utility functions
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    },

    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }
};

// Local Storage Manager (encrypted)
const CLAWTAX_STORAGE = {
    PREFIX: 'clawtax_',
    
    /**
     * Save encrypted data locally
     */
    async save(key, data, encryptionKey) {
        const encrypted = await CLAWTAX_SECURITY.encryptPayload(data, encryptionKey);
        localStorage.setItem(this.PREFIX + key, JSON.stringify(encrypted));
    },
    
    /**
     * Load and decrypt data
     */
    async load(key, encryptionKey) {
        const stored = localStorage.getItem(this.PREFIX + key);
        if (!stored) return null;
        
        try {
            const encrypted = JSON.parse(stored);
            return await CLAWTAX_SECURITY.decryptPayload(encrypted, encryptionKey);
        } catch (e) {
            console.error('Failed to decrypt data:', e);
            return null;
        }
    },
    
    /**
     * Clear all local data
     */
    clear() {
        const keys = Object.keys(localStorage).filter(k => k.startsWith(this.PREFIX));
        keys.forEach(k => localStorage.removeItem(k));
    }
};

// Export for browser
if (typeof window !== 'undefined') {
    window.CLAWTAX_SECURITY = CLAWTAX_SECURITY;
    window.CLAWTAX_STORAGE = CLAWTAX_STORAGE;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CLAWTAX_SECURITY, CLAWTAX_STORAGE };
}
