import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { ChatReadEvent } from "../../lib/nats/index.js";

const contactBroadcasts: Array<{
  contactId: string;
  event: string;
  payload: Record<string, unknown>;
}> = [];

const conversationBroadcasts: Array<{
  conversationId: string;
  event: string;
  payload: Record<string, unknown>;
}> = [];

mock.module("../message-broadcast.service.js", () => ({
  broadcastToContactViewers: (
    _companyId: string,
    contactId: string,
    event: string,
    payload: Record<string, unknown>,
  ) => {
    contactBroadcasts.push({ contactId, event, payload });
    return Promise.resolve();
  },
  broadcastToConversationViewers: (
    _companyId: string,
    conversationId: string,
    event: string,
    payload: Record<string, unknown>,
  ) => {
    conversationBroadcasts.push({ conversationId, event, payload });
    return Promise.resolve();
  },
}));

let stateUpdates: Array<Record<string, unknown>> = [];
let messageUpdates: Array<Record<string, unknown>> = [];
let contactToReturn: { id: string; jid: string } | undefined = {
  id: "contact-123",
  jid: "923001234567@s.whatsapp.net",
};
let conversationToReturn: { id: string } | undefined = {
  id: "conv-123",
};

let lidMappingToReturn: { jid?: string; lid?: string } | undefined;

const makeSelectChain = (table: string) => {
  const chain: any = {
    select: () => chain,
    where: () => chain,
    orderBy: () => chain,
    limit: () => chain,
    executeTakeFirst: () => {
      if (table === "contacts") {
        return Promise.resolve(contactToReturn);
      }
      if (table === "conversations") {
        return Promise.resolve(conversationToReturn);
      }
      return Promise.resolve(undefined);
    },
  };
  return chain;
};

const fakeTenantDb = {
  selectFrom: (table: string) => makeSelectChain(table),
  getExecutor: () => ({
    transformQuery: (node: unknown) => node,
    compileQuery: (node: unknown) => ({
      sql: "",
      parameters: [],
      query: node,
    }),
    executeQuery: async () => ({
      rows: lidMappingToReturn ? [lidMappingToReturn] : [],
    }),
  }),
  updateTable: (table: string) => ({
    set: (values: Record<string, unknown>) => ({
      where: (arg1?: unknown) => {
        const chain = {
          where: () => chain,
          execute: () => {
            if (table === "conversation_states") {
              stateUpdates.push(values);
            }
            if (table === "messages") {
              messageUpdates.push(values);
            }
            return Promise.resolve();
          },
        };
        if (typeof arg1 === "function") {
          return chain;
        }
        return chain;
      },
    }),
  }),
};

mock.module("../tenant.service.js", () => ({
  getTenantConnection: () => fakeTenantDb,
}));

// Import after mocking
const { handleChatReadEvent } = await import("./chat-read-handler.js");

describe("handleChatReadEvent", () => {
  beforeEach(() => {
    contactBroadcasts.length = 0;
    conversationBroadcasts.length = 0;
    stateUpdates.length = 0;
    messageUpdates.length = 0;
    contactToReturn = {
      id: "contact-123",
      jid: "923001234567@s.whatsapp.net",
    };
    conversationToReturn = {
      id: "conv-123",
    };
    lidMappingToReturn = undefined;
  });

  test("resets unread_count to 0 and broadcasts conversation:read when read is true", async () => {
    const event: ChatReadEvent = {
      contractVersion: 1,
      type: "chat_read",
      companyId: "comp-1",
      connectionId: "conn-1",
      timestamp: new Date().toISOString(),
      payload: {
        chatJid: "923001234567@s.whatsapp.net",
        read: true,
        timestamp: new Date().toISOString(),
        messageIds: ["msg-1", "msg-2"],
      },
    };

    await handleChatReadEvent(event);

    expect(stateUpdates.length).toBe(1);
    expect(stateUpdates[0].unread_count).toBe(0);

    expect(messageUpdates.length).toBe(1);
    expect(messageUpdates[0].status).toBe("read");

    expect(contactBroadcasts.length).toBe(1);
    expect(contactBroadcasts[0]).toEqual({
      contactId: "contact-123",
      event: "conversation:read",
      payload: {
        contactId: "contact-123",
        conversationId: "conv-123",
        unreadCount: 0,
      },
    });

    expect(conversationBroadcasts.length).toBe(1);
    expect(conversationBroadcasts[0]).toEqual({
      conversationId: "conv-123",
      event: "conversation:read",
      payload: {
        contactId: "contact-123",
        conversationId: "conv-123",
        unreadCount: 0,
      },
    });
  });

  test("sets unread_count to 1 and broadcasts conversation:updated when read is false", async () => {
    const event: ChatReadEvent = {
      contractVersion: 1,
      type: "chat_read",
      companyId: "comp-1",
      connectionId: "conn-1",
      timestamp: new Date().toISOString(),
      payload: {
        chatJid: "923001234567@s.whatsapp.net",
        read: false,
        timestamp: new Date().toISOString(),
      },
    };

    await handleChatReadEvent(event);

    expect(stateUpdates.length).toBe(1);
    expect(stateUpdates[0].unread_count).toBe(1);

    expect(contactBroadcasts.length).toBe(1);
    expect(contactBroadcasts[0]).toEqual({
      contactId: "contact-123",
      event: "conversation:updated",
      payload: {
        contactId: "contact-123",
        conversationId: "conv-123",
        unreadCount: 1,
      },
    });
  });

  test("gracefully skips when contact does not exist", async () => {
    contactToReturn = undefined;
    const event: ChatReadEvent = {
      contractVersion: 1,
      type: "chat_read",
      companyId: "comp-1",
      connectionId: "conn-1",
      timestamp: new Date().toISOString(),
      payload: {
        chatJid: "unknown@s.whatsapp.net",
        read: true,
        timestamp: new Date().toISOString(),
      },
    };

    await handleChatReadEvent(event);

    expect(stateUpdates.length).toBe(0);
    expect(messageUpdates.length).toBe(0);
    expect(contactBroadcasts.length).toBe(0);
  });

  test("resolves LID mapping and marks conversation as read when event uses @lid", async () => {
    // Return LID mapping to phone number
    lidMappingToReturn = { jid: "923001234567@s.whatsapp.net" };
    // Initially contact not returned for LID, but returned for mapped phone number
    contactToReturn = {
      id: "contact-123",
      jid: "923001234567@s.whatsapp.net",
    };

    const event: ChatReadEvent = {
      contractVersion: 1,
      type: "chat_read",
      companyId: "comp-1",
      connectionId: "conn-1",
      timestamp: new Date().toISOString(),
      payload: {
        chatJid: "110277597069540@lid",
        read: true,
        timestamp: new Date().toISOString(),
      },
    };

    await handleChatReadEvent(event);

    expect(stateUpdates.length).toBe(1);
    expect(stateUpdates[0].unread_count).toBe(0);
    expect(contactBroadcasts.length).toBe(1);
    expect(contactBroadcasts[0].event).toBe("conversation:read");
  });
});

