import fs from 'node:fs';
import { config, ensureDirs } from './config.js';

// Jobs are keyed by the ChatGPT conversation id, so any bridge process (or a
// later session) can pick a job back up from the conversation URL alone.

function readAll() {
  try {
    return JSON.parse(fs.readFileSync(config.jobsFile, 'utf8'));
  } catch {
    return {};
  }
}

function writeAll(jobs) {
  ensureDirs();
  const tmp = `${config.jobsFile}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(jobs, null, 2));
  fs.renameSync(tmp, config.jobsFile);
}

export function conversationIdFromUrl(url) {
  const m = String(url).match(/\/c\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

/** New chats first get a client-side id ("local-chatgpt:<uuid>") that is swapped for the server id. */
export function isProvisionalId(id) {
  return /^local-/.test(id || '');
}

export function getJob(idOrUrl) {
  const jobs = readAll();
  const id = conversationIdFromUrl(idOrUrl) || idOrUrl;
  if (jobs[id]) return jobs[id];
  if (/^https?:\/\//.test(idOrUrl)) return { id, url: idOrUrl, mode: 'default', createdAt: null, adopted: true };
  throw new Error(`Unknown job "${idOrUrl}". Pass a job_id from chatgpt_submit or a chatgpt.com conversation URL.`);
}

export function saveJob(job) {
  const jobs = readAll();
  jobs[job.id] = { ...jobs[job.id], ...job, updatedAt: new Date().toISOString() };
  writeAll(jobs);
  return jobs[job.id];
}

export function listJobs(limit = 20) {
  return Object.values(readAll())
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, limit);
}
