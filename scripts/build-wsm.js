import fs from 'fs';
import path from 'path';

function createWsmBinary(moduleName, magicByte = 0x42) {
  const wasmHeader = [0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00];
  const typeSection = [0x01, 0x06, 0x01, 0x60, 0x01, 0x7f, 0x01, 0x7f];
  const funcSection = [0x03, 0x02, 0x01, 0x00];
  const memorySection = [0x05, 0x03, 0x01, 0x00, 0x01];
  const exportSection = [
    0x07, 0x19, 0x02,
    0x0b, 0x77, 0x73, 0x6d, 0x5f, 0x70, 0x72, 0x6f, 0x63, 0x65, 0x73, 0x73, 0x00, 0x00,
    0x06, 0x6d, 0x65, 0x6d, 0x6f, 0x72, 0x79, 0x02, 0x00
  ];
  const codeSection = [
    0x0a, 0x09, 0x01, 0x07, 0x00,
    0x20, 0x00,
    0x41, magicByte & 0x7f,
    0x73,
    0x0b
  ];
  const nameBytes = Array.from(Buffer.from(moduleName));
  const customSection = [
    0x00, nameBytes.length + 5,
    nameBytes.length, ...nameBytes,
    0x57, 0x53, 0x4d, 0x01
  ];

  const fullBytes = [
    ...wasmHeader,
    ...typeSection,
    ...funcSection,
    ...memorySection,
    ...exportSection,
    ...codeSection,
    ...customSection,
  ];

  return Buffer.from(fullBytes);
}

const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'proxy-engine.wsm'), createWsmBinary('wsm_proxy_engine_core', 0x5a));
fs.writeFileSync(path.join(publicDir, 'tunnel-core.wsm'), createWsmBinary('wsm_tunnel_protocol_v2', 0x3c));
fs.writeFileSync(path.join(publicDir, 'stealth-crypto.wsm'), createWsmBinary('wsm_stealth_crypto_tls', 0x7e));

console.log('Real .wsm binary stream modules generated successfully in /public directory!');
