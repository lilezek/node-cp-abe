const cpabe = require('../../cpabe');
const chai = require('chai');
const expect = chai.expect;

describe('CP-ABE functionality', function () {
  it('CP-ABE setup should exist', function () {
    expect(cpabe.setup).to.exists;
    expect(cpabe.encryptMessage).to.exists;
  });

  it('CP-ABE encrypt function must get three arguments', function () {
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
  it('CP-ABE encrypt function multiple times', function () {
    cpabe.encryptMessage(keys_for_multiple_times.pubkey, "usuario or level = 4", new Buffer("hola"));
    cpabe.encryptMessage(keys_for_multiple_times.pubkey, "usuario or level = 4", new Buffer("hola"));
    cpabe.encryptMessage(keys_for_multiple_times.pubkey, "usuario or level = 4", new Buffer("hola"));
    cpabe.encryptMessage(keys_for_multiple_times.pubkey, "usuario or level = 4", new Buffer("hola"));
    cpabe.encryptMessage(keys_for_multiple_times.pubkey, "usuario or level = 4", new Buffer("hola"));
  })

  it('CP-ABE encrypt function must process only valid policies', function () {
    expect(() => {
      cpabe.encryptMessage(new Buffer("a"), "policy level = 2", new Buffer("a"))
    }).to.throw;

    expect(() => {
      cpabe.encryptMessage(new Buffer("a"), "policy and level = 2", new Buffer("a"))
    }).not.to.throw;

    expect(() => {
      cpabe.encryptMessage(new Buffer("a"), "policy level = 266#3", new Buffer("a"))
    }).to.throw;
  })

  it('CP-ABE generate numerical keys', function () {
    var keys = cpabe.setup();
    var message = "hello world " + Math.random();
    var encrypted = cpabe.encryptMessage(keys.pubkey, "admin or policytest", new Buffer(message));

    expect(() => {
      var privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["x = 30"]);
    }).not.to.throw;

    expect(() => {
      var privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["y = 30#6"]);
    }).not.to.throw;

    expect(() => {
      var privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["y = 14#7"]);
    }).not.to.throw;

    expect(() => {
      var privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["y = 340#65"]);
    }).to.throw;

    expect(() => {
      var privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["y = 16#3"]);
    }).to.throw;

    expect(() => {
      var privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["z = "]);
    }).to.throw;

    expect(() => {
      var privkey = cpabe.keygen(keys.pubkey, keys.mstkey, [" = 69"]);
    }).to.throw;

    expect(() => {
      var privkey = cpabe.keygen(keys.pubkey, keys.mstkey, [" = "]);
    }).to.throw;

    expect(() => {
      var privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["a = 'b'"]);
    }).to.throw;

    expect(() => {
      var privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["c = d"]);
    }).to.throw;

    expect(() => {
      var privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["e = 21#"]);
    }).to.throw;

    expect(() => {
      var privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["f = #45"]);
    }).to.throw;

    expect(() => {
      var privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["y = 16#3"]);
    }).to.throw;
  })

  it('CP-ABE encryption and decryption should work', function () {
    var keys = cpabe.setup();
    var message = "hello world " + Math.random();
    var encrypted = cpabe.encryptMessage(keys.pubkey, "admin or policytest", new Buffer(message));
    var privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["admin"]);
    var decrypted = cpabe.decryptMessage(keys.pubkey, privkey, encrypted);
    expect(decrypted.toString()).to.be.equal(message);
  })

  it('CP-ABE encryption with complex policies', function () {
    var keys = cpabe.setup();
    var message = "hello world " + Math.random();
    var encrypted = cpabe.encryptMessage(keys.pubkey, "admin or user and helloaccess", new Buffer(message));

    var privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["admin"]);
    var decrypted = cpabe.decryptMessage(keys.pubkey, privkey, encrypted);
    expect(decrypted.toString()).to.be.equal(message);

    privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["admin", "user"]);
    var decrypted = cpabe.decryptMessage(keys.pubkey, privkey, encrypted);
    expect(decrypted.toString()).to.be.equal(message);

    privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["admin", "helloaccess"]);
    var decrypted = cpabe.decryptMessage(keys.pubkey, privkey, encrypted);
    expect(decrypted.toString()).to.be.equal(message);

    privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["user", "helloaccess"]);
    var decrypted = cpabe.decryptMessage(keys.pubkey, privkey, encrypted);
    expect(decrypted.toString()).to.be.equal(message);

    privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["admin", "user", "helloaccess"]);
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

  it('CP-ABE encryption with grouped policies', function () {
    var keys = cpabe.setup();
    var message = "hello world " + Math.random();
    var encrypted = cpabe.encryptMessage(keys.pubkey, "(admin | user) & helloaccess", new Buffer(message));

    expect(() => {
      var privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["shabu", "admin"]);
      var decrypted = cpabe.decryptMessage(keys.pubkey, privkey, encrypted);
    }).to.throw;

    expect(() => {
      var privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["user"]);
      var decrypted = cpabe.decryptMessage(keys.pubkey, privkey, encrypted);
    }).to.throw;

    expect(() => {
      var privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["helloaccess"]);
      var decrypted = cpabe.decryptMessage(keys.pubkey, privkey, encrypted);
    }).to.throw;

    expect(() => {
      var privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["admin", "user"]);
      var decrypted = cpabe.decryptMessage(keys.pubkey, privkey, encrypted);
    }).to.throw;

    privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["admin", "helloaccess"]);
    var decrypted = cpabe.decryptMessage(keys.pubkey, privkey, encrypted);
    expect(decrypted.toString()).to.be.equal(message);

    privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["user", "helloaccess"]);
    var decrypted = cpabe.decryptMessage(keys.pubkey, privkey, encrypted);
    expect(decrypted.toString()).to.be.equal(message);

    privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["admin", "user", "helloaccess"]);
    var decrypted = cpabe.decryptMessage(keys.pubkey, privkey, encrypted);
    expect(decrypted.toString()).to.be.equal(message);

  })

  it('CP-ABE encryption with threshold gates', function () {
    var keys = cpabe.setup();
    var message = "hello world " + Math.random();
    var encrypted = cpabe.encryptMessage(keys.pubkey, "2 of (a,b,c)", new Buffer(message));

    expect(() => {
      privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["a"]);
      var decrypted = cpabe.decryptMessage(keys.pubkey, privkey, encrypted);
    }).to.throw;

    expect(() => {
      privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["b"]);
      var decrypted = cpabe.decryptMessage(keys.pubkey, privkey, encrypted);
    }).to.throw;

    expect(() => {
      privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["c"]);
      var decrypted = cpabe.decryptMessage(keys.pubkey, privkey, encrypted);
    }).to.throw;

    privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["a", "b"]);
    var decrypted = cpabe.decryptMessage(keys.pubkey, privkey, encrypted);
    expect(decrypted.toString()).to.be.equal(message);

    privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["a", "c"]);
    var decrypted = cpabe.decryptMessage(keys.pubkey, privkey, encrypted);
    expect(decrypted.toString()).to.be.equal(message);

    privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["b", "c"]);
    var decrypted = cpabe.decryptMessage(keys.pubkey, privkey, encrypted);
    expect(decrypted.toString()).to.be.equal(message);

    privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["a", "b", "c"]);
    var decrypted = cpabe.decryptMessage(keys.pubkey, privkey, encrypted);
    expect(decrypted.toString()).to.be.equal(message);

  })

  it('CP-ABE decryption with whole number attributes (equality)', function () {
    var keys = cpabe.setup();
    var message = "hello world " + Math.random();

    var encrypted = cpabe.encryptMessage(keys.pubkey, "exec_level = 15", new Buffer(message));

    privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["exec_level = 15"]);
    var decrypted = cpabe.decryptMessage(keys.pubkey, privkey, encrypted);
    expect(decrypted.toString()).to.be.equal(message);

    expect(() => {
      var privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["exec_level = 12"]);
      var decrypted = cpabe.decryptMessage(keys.pubkey, privkey, encrypted);
    }).to.throw;

    expect(() => {
      var privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["exec_level = 17"]);
      var decrypted = cpabe.decryptMessage(keys.pubkey, privkey, encrypted);
    }).to.throw;
  })

  it('CP-ABE decryption with whole number attributes (strict inequality)', function () {
    var keys = cpabe.setup();
    var message = "hello world " + Math.random();

    var encrypted = cpabe.encryptMessage(keys.pubkey, "exec_level > 6", new Buffer(message));

    privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["exec_level = 7"]);
    var decrypted = cpabe.decryptMessage(keys.pubkey, privkey, encrypted);
    expect(decrypted.toString()).to.be.equal(message);

    expect(() => {
      var privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["exec_level = 6"]);
      var decrypted = cpabe.decryptMessage(keys.pubkey, privkey, encrypted);
    }).to.throw;

    expect(() => {
      var privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["exec_level = 5"]);
      var decrypted = cpabe.decryptMessage(keys.pubkey, privkey, encrypted);
    }).to.throw;

  })

  it('CP-ABE decryption with whole number attributes (inequality)', function () {
    this.timeout(3000);
    var keys = cpabe.setup();
    var message = "hello world " + Math.random();

    var encrypted = cpabe.encryptMessage(keys.pubkey, "exec_level <= 10", new Buffer(message));

    privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["exec_level = 8"]);
    var decrypted = cpabe.decryptMessage(keys.pubkey, privkey, encrypted);
    expect(decrypted.toString()).to.be.equal(message);

    privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["exec_level = 10"]);
    var decrypted = cpabe.decryptMessage(keys.pubkey, privkey, encrypted);
    expect(decrypted.toString()).to.be.equal(message);

    expect(() => {
      var privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["exec_level = 12"]);
      var decrypted = cpabe.decryptMessage(keys.pubkey, privkey, encrypted);
    }).to.throw;

  })

  it('CP-ABE decryption with explicit-length numbers', function () {
    var keys = cpabe.setup();
    var message = "hello world " + Math.random();
    var encrypted = cpabe.encryptMessage(keys.pubkey, "exec_level >= 5#4", new Buffer(message));

    privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["exec_level = 5#4"]);
    var decrypted = cpabe.decryptMessage(keys.pubkey, privkey, encrypted);
    expect(decrypted.toString()).to.be.equal(message);

    privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["exec_level = 8#4"]);
    var decrypted = cpabe.decryptMessage(keys.pubkey, privkey, encrypted);
    expect(decrypted.toString()).to.be.equal(message);

    expect(() => {
      var privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["exec_level = 3#4"]);
      var decrypted = cpabe.decryptMessage(keys.pubkey, privkey, encrypted);
    }).to.throw;

    expect(() => {
      var privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["exec_level = 8#5"]);
      var decrypted = cpabe.decryptMessage(keys.pubkey, privkey, encrypted);
    }).to.throw

    expect(() => {
      var privkey = cpabe.keygen(keys.pubkey, keys.mstkey, ["exec_level = 8#3"]);
      var decrypted = cpabe.decryptMessage(keys.pubkey, privkey, encrypted);
    }).to.throw

  })

  it('CP-ABE encryption and decryption using example from paper', function () {
    this.timeout(5000);
    var keys = cpabe.setup();
    var message = "security_report.pdf " + Math.random();

    var policy = "(sysadmin and (hire_date < 946702800 or security_team)) or (business_staff and 2 of (executive_level >= 5, audit_group, strategy_team))";

    var hire_date = new Date(parseInt(Date.now() / 1000)).getSeconds();
    var hire_date_attr = "hire_date = " + hire_date;

    var encrypted = cpabe.encryptMessage(keys.pubkey, policy, new Buffer(message));

    var sara_priv_key = cpabe.keygen(keys.pubkey, keys.mstkey, ["sysadmin", "it_department", "office = 1431", hire_date_attr]);
    var kevin_priv_key = cpabe.keygen(keys.pubkey, keys.mstkey, ["business_staff", "strategy_team", "executive_level = 7", "office = 2362", hire_date_attr]);

    expect(() => {
      var decrypted = cpabe.decryptMessage(keys.pubkey, sara_priv_key, encrypted);
    }).to.throw;

    var decrypted = cpabe.decryptMessage(keys.pubkey, kevin_priv_key, encrypted);
    expect(decrypted.toString()).to.be.equal(message);

  })

});
