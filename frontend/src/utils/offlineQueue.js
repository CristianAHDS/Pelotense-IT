const QUEUE_KEY = 'pelotense-offline-queue';

function readQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch (_) {
    return [];
  }
}

function writeQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function getQueue() {
  return readQueue();
}

export function enqueueLocal(op) {
  const queue = readQueue();
  const item = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, ...op, ts: Date.now() };
  queue.push(item);
  writeQueue(queue);
  return item;
}

export function removeLocal(id) {
  writeQueue(readQueue().filter((i) => i.id !== id));
}

export function clearLocal() {
  localStorage.removeItem(QUEUE_KEY);
}
