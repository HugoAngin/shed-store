// Prints a bcrypt hash of a password, for ADMIN_PASSWORD_HASH in .env
const bcrypt = require("bcrypt");
const readline = require("readline");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question("New admin password: ", async (password) => {
  rl.close();
  if (password.length < 12) {
    console.error("Please use at least 12 characters.");
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 12);
  console.log(`\nAdd this line to your .env file:\nADMIN_PASSWORD_HASH='${hash}'`);
});
