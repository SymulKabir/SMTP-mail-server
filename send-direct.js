// send-direct.js
const dns = require('dns').promises;
const fs = require('fs');
const { SMTPClient } = require('smtp-client');
const MailComposer = require('mailcomposer').MailComposer;
const dkim = require('dkim-signer');

const CONFIG = {
  from: 'symul@somacharnews.com',
  fromName: 'Somachar News',
  to: 'saimonpranta@gmail.com',
  subject: 'Direct MX Test from Node.js',
  text: 'Hello — test message sent directly to recipient MX from Node.js.',
  html: '<p>Hello — <b>test message</b> sent directly to recipient MX from Node.js.</p>',
  // DKIM settings
  dkimDomain: 'somacharnews.com',
  dkimSelector: 'default',
  dkimPrivateKeyPath: '/etc/opendkim/keys/somacharnews.com/default.private',
  // optional connect timeout (ms)
  timeout: 20000
};

function buildRawMessage(opts) {
  return new Promise((resolve, reject) => {
    const mail = new MailComposer({
      from: `${opts.fromName} <${opts.from}>`,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
      date: new Date()
    });

    mail.compile().build((err, message) => {
      if (err) return reject(err);
      // message is Buffer
      resolve(message);
    });
  });
}

function dkimSignRaw(rawBuffer, { domainName, keySelector, privateKey }) {
  // dkim-signer expects a string
  const rawString = rawBuffer.toString('utf-8');
  const sigOptions = {
    privateKey,
    keySelector,
    domainName,
    headerFieldNames: 'from:to:subject:date:message-id'
  };
  // returns signed message string: DKIM-Signature header + original message
  return dkim.sign(rawString, sigOptions);
}

async function getPrimaryMx(hostname) {
  const mx = await dns.resolveMx(hostname);
  if (!mx || mx.length === 0) throw new Error('No MX records found for ' + hostname);
  mx.sort((a, b) => a.priority - b.priority);
  return mx[0].exchange;
}

async function sendDirect({ from, to, signedMessage, timeout }) {
  const recipientDomain = to.split('@')[1];
  const mxHost = await getPrimaryMx(recipientDomain);

  console.log('Resolved MX:', mxHost);

  const client = new SMTPClient({
    host: mxHost,
    port: 25,
    timeout
  });

  try {
    await client.connect();
    // Read initial server banner (connect waits for it internally)
    await client.greet({ hostname: 'mail.somacharnews.com' }); // EHLO
    const caps = client._greeting ? client._greeting : ''; // not all versions expose; we'll try using supported methods

    // Try STARTTLS when supported
    try {
      await client.startTLS({ rejectUnauthorized: false });
      // after STARTTLS, greet again
      await client.greet({ hostname: 'mail.somacharnews.com' });
      console.log('Upgraded to TLS with', mxHost);
    } catch (tlsErr) {
      // If startTLS failed or not supported, continue unencrypted (server may accept)
    }

    await client.mail({ from });
    await client.rcpt({ to });
    await client.data(signedMessage);
    await client.quit();
    console.log('✅ Message accepted by', mxHost);
  } finally {
    try { client.close(); } catch (_) {}
  }
}

(async () => {
  try {
    const raw = await buildRawMessage(CONFIG);
    const privKey = fs.readFileSync(CONFIG.dkimPrivateKeyPath, 'utf8');
    const signed = dkimSignRaw(raw, {
      domainName: CONFIG.dkimDomain,
      keySelector: CONFIG.dkimSelector,
      privateKey: privKey
    });
    // signed is a string: DKIM-Signature header + \r\n + original raw message
    // Ensure CRLF line endings for SMTP and dot-stuffing handled by client.data()
    await sendDirect({
      from: CONFIG.from,
      to: CONFIG.to,
      signedMessage: signed,
      timeout: CONFIG.timeout
    });
    console.log('Done.');
  } catch (err) {
    console.error('Error:', err && err.stack ? err.stack : err);
  }
})();
