// This is a workaround for the issue with 'waitFor' not working as expected
import { tick } from 'svelte';

// Using this function may lead to flaky tests, so only use it when 'waitFor' does not seem to catch the issue.
// You will need to overshoot the number of ticks to await to avoid flakiness.
export async function awaitNthTicks(times: number) {
    for (let i = 0; i < times; i++) {
        await tick()
    }
}