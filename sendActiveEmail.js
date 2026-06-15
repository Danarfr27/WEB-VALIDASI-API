#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node sendActiveEmail.js <path-to-aktif.txt> <recipient-email>');
  process.exit(2);
}
const filePath = args[0];
const recipient = args[1];

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER;

if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
  console.error('Missing SMTP configuration. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS env vars.');
  process.exit(3);
}

if (!fs.existsSync(filePath)) {
  console.error('File not found:', filePath);
  process.exit(4);
}
const content = fs.readFileSync(filePath, 'utf8');

async function send() {
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });

  const subject = 'Active API keys from validator';
  const text = `Attached is the active keys file (${path.basename(filePath)}).\n\n${content}`;

  const info = await transporter.sendMail({
    from: FROM_EMAIL,
    to: recipient,
    subject,
    text,
    attachments: [ { filename: path.basename(filePath), content } ]
  });
  console.log('Message sent:', info && (info.messageId || info.response));
}

send().catch(err => { console.error('Send failed:', err && err.message || err); process.exit(5); });
