const cpabe = require('../cp-abe');
const chai = require('chai');

const expect = chai.expect;

describe('CP-ABE functionality', function() {
  it('CP-ABE setup should exist', function() {
    expect(cpabe.setup).to.exists;
    expect(cpabe.encryptMessage).to.exists;
  });

  it('CP-ABE encrypt function must get three arguments', function() {
    expect(() => {
      cpabe.encryptMessage();
    }).to.throw;
    expect(() => {
      cpabe.encryptMessage("a");
    }).to.throw;
    expect(() => {
      cpabe.encryptMessage("a", "a");
    }).to.throw;
  })

  var keys_for_multiple_times = cpabe.setup();
  it('CP-ABE encrypt function multiple times', function() {
      cpabe.encryptMessage(keys_for_multiple_times.pubkey, "usuario or level = 4", new Buffer("hola"));
      cpabe.encryptMessage(keys_for_multiple_times.pubkey, "usuario or level = 4", new Buffer("hola"));
      cpabe.encryptMessage(keys_for_multiple_times.pubkey, "usuario or level = 4", new Buffer("hola"));
      cpabe.encryptMessage(keys_for_multiple_times.pubkey, "usuario or level = 4", new Buffer("hola"));
      cpabe.encryptMessage(keys_for_multiple_times.pubkey, "usuario or level = 4", new Buffer("hola"));
  })

  it('CP-ABE encrypt function must process only valid policies', function() {
    expect(() => {
      cpabe.encryptMessage(new Buffer("a"), "policy level = 2", new Buffer("a"))
    }).to.throw;

    expect(() => {
      cpabe.encryptMessage(new Buffer("a"), "policy and level = 2", new Buffer("a"))
    }).not.to.throw;
  })

  it('CP-ABE encryption and decryption should work', function() {
    var keys = cpabe.setup();
    var message = "hello world " + Math.random();
    var encrypted = cpabe.encryptMessage(keys.pubkey, "admin or policytest", new Buffer(message));
    var privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["admin"]);
    var decrypted = cpabe.decryptMessage(keys.pubkey, privkey, encrypted);
    expect(decrypted.toString()).to.be.equal(message);
  })

  it('CP-ABE encryption with complex policies', function() {
    var keys = cpabe.setup();
    var message = "hello world " + Math.random();
    var encrypted = cpabe.encryptMessage(keys.pubkey, "admin or user and helloaccess", new Buffer(message));

    var privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["admin"]);
    var decrypted = cpabe.decryptMessage(keys.pubkey, privkey, encrypted);
    expect(decrypted.toString()).to.be.equal(message);

    privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["user", "helloaccess"]);
    var decrypted = cpabe.decryptMessage(keys.pubkey, privkey, encrypted);
    expect(decrypted.toString()).to.be.equal(message);

    expect(() => {
      privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["user"]);
      cpabe.decryptMessage(keys.pubkey, privkey, encrypted);
    }).to.throw;

    expect(() => {
      privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["helloaccess"]);
      cpabe.decryptMessage(keys.pubkey, privkey, encrypted);
    }).to.throw;
  })
});
