import "dotenv/config";
import { prismaClient } from "store/client";
import { xAddBulk, kvSet, kvGet } from "redisstream/client";

const LAST_PUSHED_PREFIX = "pusher:last_pushed:";

async function getLastPushed(websiteId: string): Promise<number> {
    const val = await kvGet(`${LAST_PUSHED_PREFIX}${websiteId}`);
    return val ? parseInt(val, 10) : 0;
}

async function setLastPushed(websiteId: string, ts: number) {
    await kvSet(`${LAST_PUSHED_PREFIX}${websiteId}`, String(ts));
}

async function main() {
    const websites = await prismaClient.website.findMany({
        select: { url: true, id: true, check_interval_sec: true }
    });

    const now = Date.now();

    const dueSites = await Promise.all(
        websites.map(async w => {
            const last = await getLastPushed(w.id);
            return now - last >= w.check_interval_sec * 1000 ? w : null;
        })
    );
    const due = dueSites.filter((w): w is NonNullable<typeof w> => w !== null);

    if (due.length > 0) {
        await xAddBulk(due.map(w => ({ url: w.url, id: w.id })));
        await Promise.all(due.map(w => setLastPushed(w.id, now)));
    }
}

setInterval(() => { main().catch(console.error); }, 30 * 1000);

main().catch(console.error);
