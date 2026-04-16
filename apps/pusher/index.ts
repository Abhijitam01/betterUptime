import "dotenv/config";
import { prismaClient } from "store/client";
import { xAddBulk } from "redisstream/client";

// Track when each website was last enqueued: websiteId → timestamp
const lastPushed = new Map<string, number>();

async function main() {
    const websites = await prismaClient.website.findMany({
        select: { url: true, id: true, check_interval_sec: true }
    });

    const now = Date.now();
    const due = websites.filter(w => {
        const last = lastPushed.get(w.id) ?? 0;
        return now - last >= w.check_interval_sec * 1000;
    });

    if (due.length > 0) {
        await xAddBulk(due.map(w => ({ url: w.url, id: w.id })));
        for (const w of due) lastPushed.set(w.id, now);
    }
}

// Run every 30s (minimum supported interval is 30s)
setInterval(() => { main().catch(console.error); }, 30 * 1000);

main().catch(console.error);
