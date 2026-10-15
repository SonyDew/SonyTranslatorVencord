/* Copyright (c) 2026 SonyDev. LicenseRef-SonyTranslator-Personal-Use-1.0 */
type Job = { start(): void; cancel(reason: Error): void; priority: number };

export class RequestQueue {
    private active = 0;
    private waiting: Job[] = [];
    private jobs = new Set<Job>();

    constructor(private concurrency = 4, private capacity = 128, private timeoutMs = 15000) {}

    run<T>(work: () => Promise<T>, signal?: AbortSignal, priority = 0): Promise<T> {
        if (signal?.aborted) return Promise.reject(new Error("Translation cancelled"));
        if (this.waiting.length >= this.capacity) return Promise.reject(new Error("Translation queue full"));
        return new Promise<T>((resolve, reject) => {
            let done = false;
            const finish = (error?: Error, value?: T) => {
                if (done) return;
                done = true;
                clearTimeout(timer);
                signal?.removeEventListener("abort", abort);
                this.waiting = this.waiting.filter(candidate => candidate !== job);
                this.jobs.delete(job);
                if (error) reject(error); else resolve(value as T);
            };
            const abort = () => finish(new Error("Translation cancelled"));
            const timer = setTimeout(() => finish(new Error("Translation timed out")), this.timeoutMs);
            const job: Job = {
                priority,
                cancel: error => finish(error),
                start: () => {
                    this.active++;
                    Promise.resolve().then(() => done ? undefined as T : work()).then(
                        value => finish(undefined, value),
                        error => finish(error instanceof Error ? error : new Error(String(error))),
                    ).finally(() => {
                        // Vencord's transport cannot abort an active fetch. Keep its slot
                        // until it settles, even after the consumer times out or cancels.
                        this.active--;
                        this.pump();
                    });
                },
            };
            this.jobs.add(job);
            signal?.addEventListener("abort", abort, { once: true });
            this.waiting.push(job);
            this.waiting.sort((a, b) => b.priority - a.priority);
            this.pump();
        });
    }

    private pump() {
        while (this.active < this.concurrency && this.waiting.length) this.waiting.shift()!.start();
    }

    clear() {
        for (const job of [...this.jobs]) job.cancel(new Error("Translation invalidated"));
    }

    get pending() { return this.waiting.length; }
    get running() { return this.active; }
}

export type TranslationLease = { promise: Promise<string | null>; release(): void };
type CacheEntry = { promise: Promise<string | null>; controller: AbortController; users: number; settled: boolean; expires: number };

export class TranslationCache {
    private entries = new Map<string, CacheEntry>();
    constructor(private limit = 500, private ttlMs = 180000, private now = Date.now) {}

    acquire(key: string, produce: (signal: AbortSignal) => Promise<string | null>): TranslationLease {
        let entry = this.entries.get(key);
        if (entry?.settled && entry.expires <= this.now()) { this.entries.delete(key); entry = undefined; }
        if (!entry) {
            if (this.entries.size >= this.limit) {
                const oldest = this.entries.keys().next().value;
                if (oldest !== undefined) {
                    this.entries.get(oldest)?.controller.abort();
                    this.entries.delete(oldest);
                }
            }
            const controller = new AbortController();
            const created: CacheEntry = { promise: Promise.resolve(null), controller, users: 0, settled: false, expires: 0 };
            created.promise = Promise.resolve().then(() => {
                if (controller.signal.aborted) throw new Error("Translation cancelled");
                return produce(controller.signal);
            }).then(value => {
                created.settled = true;
                created.expires = this.now() + this.ttlMs;
                if (!value?.trim() && this.entries.get(key) === created) this.entries.delete(key);
                return value;
            }, error => {
                if (this.entries.get(key) === created) this.entries.delete(key);
                throw error;
            });
            this.entries.set(key, created);
            entry = created;
        }
        entry.users++;
        const acquired = entry;
        let released = false;
        return { promise: entry.promise, release: () => {
            if (released) return;
            released = true;
            if (--acquired.users === 0 && !acquired.settled) {
                acquired.controller.abort();
                if (this.entries.get(key) === acquired) this.entries.delete(key);
            }
        } };
    }

    clear() {
        for (const entry of this.entries.values()) entry.controller.abort();
        this.entries.clear();
    }
    get size() { return this.entries.size; }
}
