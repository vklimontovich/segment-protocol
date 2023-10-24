import { AnalyticsClientEvent, AnalyticsSerializer, IdentifyEvent, JSONObject, PageEvent, TrackEvent } from "./events";

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

export function createAnalyticsSerializer(_opts: CreateAnalyticsSerializerOpts = {}): AnalyticsSerializer {
  const opts: Required<CreateAnalyticsSerializerOpts> = { ..._opts, ...defaultOpts };
  return {
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
