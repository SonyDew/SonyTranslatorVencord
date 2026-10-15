import assert from "node:assert/strict";
import { test } from "node:test";
import { RequestQueue, TranslationCache } from "../requestQueue.ts";

const tick = () => new Promise<void>(resolve => setImmediate(resolve));

test("queue never exceeds transport concurrency and outgoing work has priority", async () => {
    const queue = new RequestQueue(1);
    let release!: (value: string) => void;
    const order: string[] = [];
    const first = queue.run(() => new Promise<string>(resolve => { release = resolve; }));
    await tick();
    const background = queue.run(async () => { order.push("incoming"); return "b"; });
    const outgoing = queue.run(async () => { order.push("outgoing"); return "c"; }, undefined, 1);
    assert.equal(queue.running, 1);
    release("a");
    await Promise.all([first, background, outgoing]);
    assert.deepEqual(order, ["outgoing", "incoming"]);
});

test("timeout rejects promptly without starting replacement requests over the transport limit", async () => {
    const queue = new RequestQueue(1, 8, 15);
    let finish!: (value: string) => void;
    await assert.rejects(queue.run(() => new Promise<string>(resolve => { finish = resolve; })), /timed out/);
    assert.equal(queue.running, 1);
    let called = false;
    await assert.rejects(queue.run(async () => { called = true; return "no"; }), /timed out/);
    assert.equal(called, false);
    assert.equal(queue.pending, 0);
    finish("late");
    await tick();
    assert.equal(await queue.run(async () => "recovered"), "recovered");
});

test("cancelled and cleared queued requests do not reach Google", async () => {
    const queue = new RequestQueue(1);
    let finish!: (value: string) => void;
    const running = queue.run(() => new Promise<string>(resolve => { finish = resolve; }));
    await tick();
    const controller = new AbortController();
    const cancelled = queue.run(async () => { throw new Error("must not start"); }, controller.signal);
    const checked = assert.rejects(cancelled, /cancelled/);
    controller.abort(); await checked;
    const invalidated = assert.rejects(running, /invalidated/);
    queue.clear(); await invalidated;
    finish("done"); await tick();
    assert.equal(queue.pending, 0);
});

test("queue has a bounded waiting list", async () => {
    const queue = new RequestQueue(1, 1);
    const a = queue.run(async () => "a");
    const b = queue.run(async () => "b");
    await assert.rejects(queue.run(async () => "c"), /queue full/);
    await Promise.all([a, b]);
});

test("cache deduplicates subscribers, expires values and cancels only the last waiting consumer", async () => {
    let now = 0;
    const cache = new TranslationCache(2, 10, () => now);
    let calls = 0;
    const produce = async () => { calls++; return "result"; };
    const first = cache.acquire("same", produce);
    const second = cache.acquire("same", produce);
    first.release();
    assert.equal(await second.promise, "result"); second.release();
    assert.equal(calls, 1);
    now = 11;
    const fresh = cache.acquire("same", produce);
    await fresh.promise; fresh.release();
    assert.equal(calls, 2);
    const pending = cache.acquire("pending", signal => new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error("cancelled")))));
    await tick();
    const aborted = assert.rejects(pending.promise, /cancelled/);
    pending.release(); await aborted;
    assert.equal(cache.size, 1);
});

test("a failed old request cannot delete a replacement cache entry", async () => {
    const cache = new TranslationCache();
    let fail!: (error: Error) => void;
    const old = cache.acquire("key", () => new Promise((_, reject) => { fail = reject; }));
    await tick();
    const failure = assert.rejects(old.promise, /old/);
    old.release();
    const replacement = cache.acquire("key", async () => "new");
    assert.equal(await replacement.promise, "new");
    fail(new Error("old")); await failure;
    assert.equal(cache.size, 1); replacement.release();
});

test("null and failed results are never sticky in cache", async () => {
    const cache = new TranslationCache();
    const empty = cache.acquire("x", async () => null);
    await empty.promise; empty.release(); assert.equal(cache.size, 0);
    const failed = cache.acquire("x", async () => { throw new Error("offline"); });
    await assert.rejects(failed.promise, /offline/); failed.release();
    const retry = cache.acquire("x", async () => "online");
    assert.equal(await retry.promise, "online"); retry.release();
});
