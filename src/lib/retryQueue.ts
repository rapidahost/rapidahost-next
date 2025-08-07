import fs from 'fs';
import path from 'path';

const filePath = path.resolve('./retryQueue.json');

export async function addToRetryQueue(data: any) {
  const current = fs.existsSync(filePath)
    ? JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    : [];
  current.push({ ...data, createdAt: new Date().toISOString() });
  fs.writeFileSync(filePath, JSON.stringify(current, null, 2));
}

export async function getRetryQueue() {
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export async function clearRetryQueue() {
  fs.writeFileSync(filePath, '[]');
}

export async function popRetryItem() {
  const queue = await getRetryQueue();
  if (!queue.length) return null;
  const item = queue.shift();
  fs.writeFileSync(filePath, JSON.stringify(queue, null, 2));
  return item;
}
