const cpabe = require('../../cpabe');

var keys = cpabe.setup();
var message = "security_report.pdf " + Math.random();

console.log("message: " + message);

var policy = "(sysadmin and (hire_date < 946702800 or security_team)) or (business_staff and 2 of (executive_level >= 5, audit_group, strategy_team))"

var hire_date = parseInt(Math.floor(Date.now() / 1000));
var hire_date_attr = "hire_date = " + hire_date;
console.log(hire_date_attr);
console.log(hire_date < 946702800);

var encrypted = cpabe.encryptMessage(keys.pubkey, policy, new Buffer(message));

var sara_priv_key = cpabe.keygen(keys.pubkey, keys.mstkey, ["sysadmin", "it_department", "office = 1431", hire_date_attr]);
var kevin_priv_key = cpabe.keygen(keys.pubkey, keys.mstkey, ["business_staff", "strategy_team", "executive_level = 7", "office = 2362", hire_date_attr]);

// Will decrypt
var decrypted = cpabe.decryptMessage(keys.pubkey, kevin_priv_key, encrypted);
console.log("decrypted: " + decrypted.toString());

// Will not decrypt
var decrypted = cpabe.decryptMessage(keys.pubkey, sara_priv_key, encrypted);
console.log("decrypted: " + decrypted.toString());


