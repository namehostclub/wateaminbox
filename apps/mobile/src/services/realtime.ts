import { Centrifuge } from "centrifuge";
import { type QueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

let centrifugeInstance: Centrifuge | null = null;

export async function initRealtimeClient(
  companyId: string,
  userId: string,
  queryClient: QueryClient,
) {
  if (centrifugeInstance) {
    centrifugeInstance.disconnect();
    centrifugeInstance = null;
  }

  try {
    const { token, wsUrl } = await api.getRealtimeToken();

    const centrifuge = new Centrifuge(wsUrl, {
      token,
      minReconnectDelay: 1000,
      maxReconnectDelay: 10000,
    });

    // Company wide channel
    const companySub = centrifuge.newSubscription(`company:${companyId}`);
    companySub.on("publication", (ctx) => {
      const event = ctx.data as { type: string; payload: unknown };
      if (!event?.type) return;

      if (event.type === "message:new") {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        queryClient.invalidateQueries({ queryKey: ["messages"] });
      } else if (event.type === "conversation:read") {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      }
    });
    companySub.subscribe();

    // User specific channel (assignments, mentions)
    const userSub = centrifuge.newSubscription(`user:${userId}`);
    userSub.on("publication", (ctx) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });
    userSub.subscribe();

    centrifuge.connect();
    centrifugeInstance = centrifuge;

    return () => {
      centrifuge.disconnect();
      centrifugeInstance = null;
    };
  } catch (err) {
    console.warn("Failed to connect to Centrifugo:", err);
    return () => {};
  }
}

