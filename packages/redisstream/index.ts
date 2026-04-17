import { createClient } from "redis";

const client = await createClient({ url: process.env.REDIS_URL })
  .on("error", (err) => console.error("Redis Client Error", err))
  .connect();

type WebsiteEvent = { url: string; id: string };
type MessageType = {
    id: string;
    message: {
        url: string;
        id: string;
    };
};

const STREAM_NAME = "betteruptime:website";

async function xAdd({ url, id }: WebsiteEvent) {
    await client.xAdd(STREAM_NAME, "*", { url, id });
}

export async function xAddBulk(websites: WebsiteEvent[]) {
    await Promise.all(websites.map(w => xAdd(w)));
}

export async function xReadGroup(
    consumerGroup: string,
    workerId: string
): Promise<MessageType[] | undefined> {
    const res = await client.xReadGroup(
        consumerGroup,
        workerId,
        { key: STREAM_NAME, id: ">" },
        { COUNT: 5 }
    );

    const messages: MessageType[] | undefined = ((res as any)?.[0])?.messages;
    return messages;
}

async function xAck(consumerGroup: string, eventId: string) {
    await client.xAck(STREAM_NAME, consumerGroup, eventId);
}

export async function xAckBulk(consumerGroup: string, eventIds: string[]) {
    await Promise.all(eventIds.map(eventId => xAck(consumerGroup, eventId)));
}

export async function ensureConsumerGroup(consumerGroup: string) {
    try {
        await client.xGroupCreate(STREAM_NAME, consumerGroup, "0", { MKSTREAM: true });
    } catch (err: any) {
        if (!err?.message?.includes("BUSYGROUP")) throw err;
    }
}

export async function kvSet(key: string, value: string, ttlSeconds?: number) {
    if (ttlSeconds !== undefined) {
        await client.set(key, value, { EX: ttlSeconds });
    } else {
        await client.set(key, value);
    }
}

export async function kvGet(key: string): Promise<string | null> {
    return client.get(key);
}

export async function kvDel(key: string) {
    await client.del(key);
}
