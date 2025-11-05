const dns = require("dns");
const net = require("net");
const tls = require("tls");
const fs = require("fs");
const { createSigner } = require("nodemailer/lib/dkim");

const resolveMxAsync = (domain) =>
  new Promise((resolve, reject) => {
    dns.resolveMx(domain, (err, addresses) => {
      if (err) return reject(err);
      resolve(addresses);
    });
  });

const sendMail = async ({ from, to, subject, body }) => {
  const domain = to.split("@")[1];
  const mxRecords = await resolveMxAsync(domain);
  const mxHost = mxRecords.sort((a, b) => a.priority - b.priority)[0].exchange;

  console.log(`Connecting to MX: ${mxHost}`);

  return new Promise((resolve, reject) => {
    const socket = net.connect(25, mxHost);

    socket.once("data", async (data) => {
      console.log("<<", data.toString().trim());

      const write = (cmd) =>
        new Promise((res) => {
          socket.write(cmd + "\r\n");
          console.log(">>", cmd);
          socket.once("data", (d) => {
            console.log("<<", d.toString().trim());
            res(d.toString());
          });
        });

      await write(`EHLO mail.somacharnews.com`);
      await write(`STARTTLS`);

      const secureSocket = tls.connect(
        {
          socket,
          host: mxHost,
          servername: mxHost,
          rejectUnauthorized: false,
        },
        async () => {
          console.log("🔐 TLS connection established");

          const writeTLS = (cmd) =>
            new Promise((res) => {
              secureSocket.write(cmd + "\r\n");
              console.log(">>", cmd);
              secureSocket.once("data", (d) => {
                console.log("<<", d.toString().trim());
                res(d.toString());
              });
            });

          // ✅ Create DKIM signer
          const signer = createSigner({
            domainName: "somacharnews.com",
            keySelector: "default",
            privateKey: fs.readFileSync(
              "/etc/opendkim/keys/somacharnews.com/default.private",
              "utf8"
            ),
            headerFieldNames: "from:to:subject:date",
          });

          const messageBody = `Subject: ${subject}\r\nFrom: ${from}\r\nTo: ${to}\r\nDate: ${new Date().toUTCString()}\r\n\r\n${body}\r\n`;
          const signedMessage = signer.sign(messageBody);

          await writeTLS(`EHLO mail.somacharnews.com`);
          await writeTLS(`MAIL FROM:<${from}>`);
          await writeTLS(`RCPT TO:<${to}>`);
          await writeTLS(`DATA`);
          await writeTLS(`${signedMessage}\r\n.`);
          await writeTLS(`QUIT`);

          console.log("✅ Mail successfully sent!");
          resolve();
          secureSocket.end();
        }
      );

      secureSocket.on("error", (err) => reject("TLS Error: " + err.message));
    });

    socket.on("error", (err) => reject("Socket Error: " + err.message));
  });
};

(async () => {
  try {
    await sendMail({
      from: "symul@somacharnews.com",
      to: "saimonpranta@gmail.com",
      subject: "✅ Node.js Direct MX Test (DKIM + TLS)",
      body: "Hello! This is a real SMTP test sent directly to Gmail with DKIM and STARTTLS.",
    });
  } catch (err) {
    console.error("❌ Error:", err);
  }
})();



// 