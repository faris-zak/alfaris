// Preload for offline verification, inherited by Node child processes.
const blocked = () => { throw new Error('Outbound networking disabled for repository security verification'); };
for (const name of ['node:http', 'node:https']) {
  const module = require(name);
  module.request = blocked;
  module.get = blocked;
}
require('node:net').Socket.prototype.connect = blocked;
require('node:tls').connect = blocked;
globalThis.fetch = blocked;
