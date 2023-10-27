import {
  AliasEvent,
  AnalyticsClientEvent,
  AnalyticsInterface,
  AnalyticsMethodResult,
  AnalyticsSerializer,
  DispatchedEvent,
  GroupEvent,
  ID,
  IdentifyEvent,
  JSONObject,
  PageEvent,
  ScreenEvent,
  TrackEvent,
} from "./events";
import { DefaultEventTypes } from "./typesafe";

type ReplaceReturnType<T extends (...a: any) => any, TNewReturn> = (...a: Parameters<T>) => TNewReturn;

export type EventTemplate = Pick<
  AnalyticsClientEvent,
  "userId" | "anonymousId" | "previousId" | "groupId" | "writeKey" | "sentAt"
> &
  Required<Pick<AnalyticsClientEvent, "sentAt" | "context" | "messageId">>;

type EventTemplateFactory = (opts: {
  type: AnalyticsClientEvent["type"];
  name: AnalyticsClientEvent["name"];
}) => Partial<EventTemplate>;

export interface CreateAnalyticsSerializerOpts {
  template?: EventTemplateFactory;
}

const defaultTemplate: ReplaceReturnType<EventTemplateFactory, EventTemplate> = () => {
  return {
    context: {},
    messageId: Math.random().toString(36).substring(2, 15),
    sentAt: new Date().toISOString(),
  };
};
const defaultOpts: Required<CreateAnalyticsSerializerOpts> = {
  template: defaultTemplate,
};

export type CreateAnalyticsOpts = CreateAnalyticsSerializerOpts & {
  handler: (event: AnalyticsClientEvent) => Promise<void>;
  handleReset: () => void;
};

export type AnalyticsState = {
  userId?: AnalyticsClientEvent["userId"];
  userTraits?: AnalyticsClientEvent["traits"];
  groupId?: GroupEvent["groupId"];
  groupTraits?: GroupEvent["traits"];
};

/**
 * Creates an instance of AnalyticsInterface. The instance doesn't do anything by itself,
 * it constructs analytics event and passes it to opts.handler
 */
export function createAnalytics(opts: CreateAnalyticsOpts): AnalyticsInterface {
  const serializer = createAnalyticsSerializer(opts);
  const state: AnalyticsState = {};
  return {
    async screen(
      category: string | DefaultEventTypes["page"] | undefined,
      name: string | DefaultEventTypes["page"] | undefined,
      properties: object | DefaultEventTypes["page"] | null | undefined
    ): Promise<DispatchedEvent<ScreenEvent>> {
      const event = serializer.screen(category, name, properties);
      event.userId = event.userId || state.userId;
      event.groupId = event.groupId || state.groupId;
      await opts.handler(event);
      return event;
    },
    async alias(
      userIdOrObject: string | { userId: ID; previousId: ID },
      previousUserId?: string
    ): Promise<DispatchedEvent<AliasEvent>> {
      const event = serializer.alias(userIdOrObject, previousUserId);
      state.userId = event.userId;
      await opts.handler(event);
      return event;
    },
    async group(groupId?: ID | JSONObject, traits?: JSONObject | null): Promise<DispatchedEvent<GroupEvent>> {
      const event = serializer.group(groupId, traits);
      state.groupId = event.groupId;
      state.groupTraits = event.traits;
      await opts.handler(event);
      return event;
    },
    async reset() {
      state.userId = undefined;
      state.userTraits = undefined;
      state.groupId = undefined;
      state.groupTraits = undefined;
      opts?.handleReset();
    },
    async identify(
      id: ID | DefaultEventTypes["traits"] | undefined,
      traits: DefaultEventTypes["traits"] | undefined
    ): Promise<DispatchedEvent<IdentifyEvent>> {
      const event = serializer.identify(id, traits);
      state.userId = event.userId;
      state.userTraits = event.traits;
      await opts.handler(event);
      return event;
    },
    async page(
      category: string | DefaultEventTypes["page"] | undefined,
      name: string | DefaultEventTypes["page"] | undefined,
      properties: object | DefaultEventTypes["page"] | null | undefined
    ): Promise<DispatchedEvent<PageEvent>> {
      const event = serializer.page(category, name, properties);
      event.userId = event.userId || state.userId;
      event.groupId = event.groupId || state.groupId;
      await opts.handler(event);
      return event;
    },
    async track(
      eventName: DefaultEventTypes["eventNames"],
      properties: JSONObject | undefined
    ): Promise<DispatchedEvent<TrackEvent>> {
      const event = serializer.track(eventName, properties);
      event.userId = event.userId || state.userId;
      event.groupId = event.groupId || state.groupId;
      await opts.handler(event);
      return event;
    },
  };
}

export function createAnalyticsSerializer(_opts: CreateAnalyticsSerializerOpts = {}): AnalyticsSerializer {
  const opts: Required<CreateAnalyticsSerializerOpts> = { ...defaultOpts, ..._opts };
  return {
    reset() {},
    alias(userIdOrObject, previousId): AliasEvent {
      const template = {
        ...defaultTemplate({ type: "alias", name: undefined }),
        ...opts.template({ type: "alias", name: undefined }),
      };
      return {
        ...template,
        type: "alias",
        userId: typeof userIdOrObject === "string" ? userIdOrObject : userIdOrObject.userId,
        previousId: typeof userIdOrObject === "string" ? previousId : userIdOrObject.previousId,
      };
    },
    group(_id, _traits): AnalyticsMethodResult<"group"> {
      const id = typeof _id === "string" ? _id : undefined;
      const traits: JSONObject = (typeof _id === "object" ? _id : _traits) || {};
      const template = {
        ...defaultTemplate({ type: "identify", name: undefined }),
        ...opts.template({ type: "identify", name: undefined }),
      };
      const userId =
        _traits && typeof _traits === "object" && _traits.userId && typeof _traits.userId === "string"
          ? //traits contains userId, it's not strictly allowed and make sense
            //make it work to moving it to userId
            _traits.userId
          : undefined;
      return {
        ...template,
        type: "group",
        groupId: id,
        userId,
        traits,
      };
    },
    screen(_category, _name, _properties): AnalyticsMethodResult<"screen"> {
      const category = typeof _category === "string" ? _category : undefined;
      const name = typeof _name === "string" ? _name : undefined;
      const properties: JSONObject =
        ((typeof _properties === "object"
          ? _properties
          : typeof _name === "object"
          ? _name
          : typeof _category === "object"
          ? _category
          : {}) as JSONObject) || {};

      const template = {
        ...defaultTemplate({ type: "screen", name: undefined }),
        ...opts.template({ type: "screen", name: undefined }),
      };
      return {
        ...template,
        type: "screen",
        category,
        name,
        properties,
      };
    },
    track(eventName: string, properties): TrackEvent {
      const template = {
        ...defaultTemplate({ type: "track", name: eventName }),
        ...opts.template({ type: "track", name: eventName }),
      };
      return {
        ...template,
        type: "track",
        event: eventName,
        properties,
      };
    },
    page(_category, _name, _properties): PageEvent {
      const category = typeof _category === "string" ? _category : undefined;
      const name = typeof _name === "string" ? _name : undefined;
      const properties: JSONObject =
        ((typeof _properties === "object"
          ? _properties
          : typeof _name === "object"
          ? _name
          : typeof _category === "object"
          ? _category
          : {}) as JSONObject) || {};

      const template = {
        ...defaultTemplate({ type: "page", name: undefined }),
        ...opts.template({ type: "page", name: undefined }),
      };
      return {
        ...template,
        type: "page",
        category,
        name,
        properties,
      };
    },
    identify(_id, _traits): IdentifyEvent {
      const id = typeof _id === "string" ? _id : undefined;
      const traits: JSONObject = (typeof _id === "object" ? _id : _traits) || {};
      const template = {
        ...defaultTemplate({ type: "identify", name: undefined }),
        ...opts.template({ type: "identify", name: undefined }),
      };
      return {
        ...template,
        type: "identify",
        userId: id,
        traits,
      };
    },
  };
}
