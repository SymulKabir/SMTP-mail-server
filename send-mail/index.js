const dns = require("dns");
const net = require("net");
const tls = require("tls");
const fs = require("fs");
const { DKIMSign } = require("nodemailer/lib/dkim");

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

          const dkimSigner = new DKIMSign({
            domainName: "somacharnews.com",
            keySelector: "default",
            privateKey: fs.readFileSync(
              "/etc/opendkim/keys/somacharnews.com/default.private",
              "utf8"
            ),
            headerFieldNames: "from:to:subject:date",
          });

          const messageBody = `Subject: ${subject}\r\nFrom: ${from}\r\nTo: ${to}\r\nDate: ${new Date().toUTCString()}\r\n\r\n${body}\r\n`;
          const dkimHeader = dkimSigner.sign(messageBody);
          const message = `${dkimHeader}\r\n${messageBody}`;

          await writeTLS(`EHLO mail.somacharnews.com`);
          await writeTLS(`MAIL FROM:<${from}>`);
          await writeTLS(`RCPT TO:<${to}>`);
          await writeTLS(`DATA`);
          await writeTLS(`${message}\r\n.`);
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
      subject: "Professional Node.js Mail Test",
      body: "Hello! This email was sent directly from mail.somacharnews.com using port 25 with STARTTLS and DKIM.",
    });
  } catch (err) {
    console.error("❌ Error:", err);
  }
})();
