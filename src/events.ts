import { createAnalyticsSerializer, CreateAnalyticsSerializerOpts } from "./serializer";
import { DefaultEventTypes, EmptyObject, TypesafeEvents } from "./typesafe";

export type ID = string | null | undefined;
export type ISO8601Date = string;

export function getTypesafeAnalytic<T>(dummyAnalytics: AnalyticsInterface) {
  return dummyAnalytics as T;
}

/**
 * Returns an implementation of AnalyticsInterface that prints out all events to console
 */
export function getDummyAnalytics(
  opts: { log?: boolean; silent?: boolean } & CreateAnalyticsSerializerOpts = {}
): AnalyticsInterface & { log: AnalyticsClientEvent[] } {
  const log: AnalyticsClientEvent[] = [];
  const analytics = getLoggingAnalytics(createAnalyticsSerializer(opts), (type, event) => {
    if (opts.log) {
      log.push(event);
    }
    if (!opts.silent) {
      console.log(`Analytics event ${type}:`, JSON.stringify(event, null, 2));
    }
    return Promise.resolve(event);
  });
  return { ...analytics, log };
}

export function getLoggingAnalytics(
  serializer: AnalyticsSerializer,
  handler: (
    type: keyof AnalyticsSerializer,
    event: AnalyticsClientEvent
  ) => Promise<DispatchedEvent<AnalyticsClientEvent>>
): AnalyticsInterface {
  function createImpl(method: keyof AnalyticsSerializer) {
    return (...args: any[]) => {
      // @ts-ignore
      const result = serializer[method](...args) as AnalyticsClientEvent;
      return handler(method, result);
    };
  }

  const analytics: Record<keyof AnalyticsSerializer, any> = {
    track: createImpl("track"),
    page: createImpl("page"),
    identify: createImpl("identify"),
    group: createImpl("group"),
    alias: createImpl("alias"),
    screen: createImpl("screen"),
    reset: async () => {},
  };

  return analytics as AnalyticsInterface;
}

export const eventTypes = ["track", "page", "identify", "group", "alias", "screen"] as const;

export type EventType = (typeof eventTypes)[number];

/**
 * Event coming from client library
 */
export interface AnalyticsClientEvent {
  /**
   * Unique message ID
   */
  messageId: string;
  timestamp?: Date | ISO8601Date;
  type: EventType;
  // page specific
  category?: string;
  name?: string;

  properties?: JSONObject;
  /**
   * Traits can be either here, or in context.traits. It depends on an event type and a library (some vendors put
   * traits to both sides)
   */
  traits?: JSONObject;

  context: AnalyticsContext;

  userId?: ID;
  anonymousId?: ID;
  groupId?: ID;
  previousId?: ID;

  event?: string;
  writeKey?: string;
  sentAt?: Date | ISO8601Date;
}

export interface TrackingFamilyEvent<P extends JSONObject = JSONObject> extends AnalyticsClientEvent {
  properties?: P;
  /**
   * For page/track/etc (TrackingFamily) events, traits should be never in root and be stored in context.traits
   */
  traits?: never;
}

export interface PageEvent<P extends JSONObject = JSONObject> extends TrackingFamilyEvent<P> {
  type: "page";
}

export interface ScreenEvent<P extends JSONObject = JSONObject> extends TrackingFamilyEvent<P> {
  type: "screen";
}

export interface TrackEvent<P extends JSONObject = JSONObject> extends TrackingFamilyEvent<P> {
  type: "track";
  //make event name mandatory for track events
  event: string;
}

export interface AliasEvent extends TrackingFamilyEvent<EmptyObject> {
  type: "alias";
  userId: ID;
  previousId: ID;
}

export type IdentifyEvent<
  T extends JSONObject = JSONObject,
  P extends JSONObject = JSONObject,
> = AnalyticsClientEvent & {
  type: "identify";
  //identify event should never have traits in context, only in root
  context: Omit<AnalyticsContext, "traits">;
  traits?: T;
} & (
    | {
        userId: ID;
        properties?: P;
      }
    | {
        userId?: never;
        properties: P;
      }
  );

export type GroupEvent<T extends JSONObject = JSONObject, P extends JSONObject = JSONObject> = AnalyticsClientEvent & {
  type: "group";
  //identify event should never have traits in context, only in root
  context: Omit<AnalyticsContext, "traits">;
  traits?: T;
  properties?: P;
  groupId: ID;
  userId?: string;
};

export type ServerContextReservedProps = {
  //always filled with an IP from where request came from
  //if request came server-to-server, then it's an IP of a server
  //for device events it will be an IP of a device
  //don'analytics use this field in functions, use context.ip instead
  request_ip?: string;
  receivedAt?: ISO8601Date;
};
/**
 * A context of an event that is added on server-side
 */
export type ServerContext = ServerContextReservedProps & { [k: string]: any };

export type AnalyticsServerEvent = AnalyticsClientEvent & ServerContext;

export type JSONPrimitive = string | number | boolean | null | undefined;
export type JSONValue = JSONPrimitive | JSONObject | JSONArray;
export type JSONObject = { [member: string]: JSONValue };
export type JSONArray = Array<JSONValue>;

export type Integrations = {
  All?: boolean;
  [integration: string]: boolean | JSONObject | undefined;
};

export type Options = {
  integrations?: Integrations;
  userId?: ID;
  anonymousId?: ID;
  timestamp?: Date | string;
  context?: AnalyticsContext;
  traits?: JSONObject;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

type CompactMetricType = "g" | "c";

export interface CompactMetric {
  m: string; // metric name
  v: number; // value
  k: CompactMetricType;
  t: string[]; // tags
  e: number; // timestamp in unit milliseconds
}

export type PageReservedProps = {
  path?: string;
  referrer?: string;
  host?: string;
  referring_domain?: string;
  search?: string;
  title?: string;
  url?: string;
};

export interface AnalyticsContext {
  /**
   * IP address of the originating request. If event is sent from a device, then it's an IP of a device
   * (copied from requestIp)
   * If request is sent from server-to-server, this field is not automatically populated
   * and should be filled manually
   */
  ip?: string;
  /**
   * Automatically detected IP address of the originating request. If event is sent from a device, then it's an IP of a device.
   * Otherwise, it will be an ip of a server
   */
  requestIp?: string;

  page?: PageReservedProps & JSONObject;
  metrics?: CompactMetric[];

  userAgent?: string;

  userAgentVendor?: string;

  locale?: string;

  library?: {
    name: string;
    version: string;
  };

  traits?: { crossDomainId?: string } & JSONObject;

  campaign?: {
    name?: string;
    term?: string;
    source?: string;
    medium?: string;
    content?: string;
    [key: string]: any;
  };

  referrer?: {
    btid?: string;
    urid?: string;
  };

  amp?: {
    id: string;
  };
  /**
   * Other tracking tools client ids
   */
  clientIds?: {
    //Client ID of GA4 property
    ga4?: string;
  } & JSONObject;

  [key: string]: any;
}

export type DispatchedEvent<T extends AnalyticsClientEvent> = T;

/**
 * Segment-compatible analytics interface. All methods are async and return a promise that resolves when event is
 * processed (e.g. send to server) or rejected if event is not processed (e.g. if server returned an error).
 *
 * Inside the Promise there's an event that has been sent to server
 *
 */
export interface AnalyticsInterface<T extends TypesafeEvents = DefaultEventTypes> {
  /**
   * https://segment.com/docs/connections/sources/catalog/libraries/website/javascript/#track
   */
  track(eventName: T["eventNames"], properties?: JSONObject): Promise<DispatchedEvent<TrackEvent>>;

  /**
   * See https://segment.com/docs/connections/sources/catalog/libraries/website/javascript/#page
   */
  page(
    category?: string | T["page"],
    name?: string | T["page"],
    properties?: object | T["page"] | null
  ): Promise<DispatchedEvent<PageEvent>>;

  /**
   * See https://segment.com/docs/connections/sources/catalog/libraries/website/javascript/#identify
   */
  identify(id?: ID | T["traits"], traits?: T["traits"]): Promise<DispatchedEvent<IdentifyEvent>>;

  group(groupId?: ID | JSONObject, traits?: JSONObject | null): Promise<DispatchedEvent<GroupEvent>>;

  reset(): Promise<void>;

  alias(
    userIdOrObject: string | { userId: ID; previousId: ID },
    previousUserId?: string
  ): Promise<DispatchedEvent<AliasEvent>>;

  screen(
    category?: string | T["page"],
    name?: string | T["page"],
    properties?: object | T["page"] | null
  ): Promise<DispatchedEvent<ScreenEvent>>;
}

export type AnalyticsMethodResult<K extends keyof AnalyticsInterface> = ReturnType<
  AnalyticsInterface[K]
> extends Promise<infer R>
  ? R
  : AnalyticsInterface[K];

/**
 * This type is an equivalent of AnalyticsInterface, but instead of processing the event it returns
 * a message that is ready to be sent to segment-compatible endpoint
 *
 * See createAnalyticsParser() for implementation
 */
export type AnalyticsSerializer = {
  [K in keyof AnalyticsInterface]: AnalyticsInterface[K] extends (...args: any[]) => any
    ? (...args: Parameters<AnalyticsInterface[K]>) => AnalyticsMethodResult<K>
    : never;
};
