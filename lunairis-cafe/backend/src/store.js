const fs = require('node:fs/promises');
const path = require('node:path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const RUNTIME_FILE = path.join(DATA_DIR, 'runtime.json');
const SEED_FILE = path.join(DATA_DIR, 'seed.json');
let writeQueue = Promise.resolve();

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(RUNTIME_FILE);
  } catch {
    const seed = await fs.readFile(SEED_FILE, 'utf8');
    await fs.writeFile(RUNTIME_FILE, seed, 'utf8');
  }
}

async function readData() {
  await ensureStore();
  const raw = await fs.readFile(RUNTIME_FILE, 'utf8');
  return JSON.parse(raw);
}

function updateData(mutator) {
  const operation = writeQueue.then(async () => {
    const data = await readData();
    const result = await mutator(data);
    const temporaryFile = `${RUNTIME_FILE}.tmp`;
    await fs.writeFile(temporaryFile, JSON.stringify(data, null, 2), 'utf8');
    await fs.rename(temporaryFile, RUNTIME_FILE);
    return result;
  });
  writeQueue = operation.catch(() => {});
  return operation;
}

module.exports = { ensureStore, readData, updateData };
