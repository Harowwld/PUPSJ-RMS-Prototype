import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ALGORITHM = "aes-256-cbc";
// In a real system, this key should be stored in a secure environment variable or Key Vault
const ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY || "pup-emanage-secure-backup-key-32"; 
const IV_LENGTH = 16;

export function encryptFile(inputPath, outputPath) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  
  const input = fs.createReadStream(inputPath);
  const output = fs.createWriteStream(outputPath);
  
  return new Promise((resolve, reject) => {
    output.write(iv); // Prepend IV to the file
    input.pipe(cipher).pipe(output);
    
    output.on("finish", resolve);
    output.on("error", reject);
    input.on("error", reject);
  });
}

export function decryptFile(inputPath, outputPath) {
  const input = fs.createReadStream(inputPath);
  
  return new Promise((resolve, reject) => {
    let iv;
    input.once("readable", () => {
      iv = input.read(IV_LENGTH);
      if (!iv) return reject(new Error("Could not read IV"));
      
      const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
      const output = fs.createWriteStream(outputPath);
      
      input.pipe(decipher).pipe(output);
      
      output.on("finish", resolve);
      output.on("error", reject);
    });
    input.on("error", reject);
  });
}
