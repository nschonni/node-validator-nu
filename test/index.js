var expect = require('expect.js'),
    nodeValidatorNu = require('..');

describe('node-validator-nu', function() {
  it('should say hello', function(done) {
    expect(nodeValidatorNu()).to.equal('Hello, world');
    done();
  });
});
