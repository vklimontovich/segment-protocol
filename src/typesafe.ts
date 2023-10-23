import { JSONObject } from "./events";

export type EmptyObject = Record<string, never>;
export type TypesafeEvents<
  T_page extends JSONObject = JSONObject,
  T_track extends JSONObject = JSONObject,
  //in most cases, identify event shouldn't have any *event* properties,
  //all properties should be *user* properties and placed in traits
  //that's why we default to empty object here
  T_identify extends JSONObject = EmptyObject,
  T_traits extends JSONObject = JSONObject,
  T_types extends string = string,
> = {
  page?: T_page;
  identify?: T_identify;
  traits?: T_traits;
  track?: T_track;
  eventNames?: T_types;
};

/**
 * Default event types which allows any properties for all event except identify,
 * and any event name
 */
export type DefaultEventTypes = {
  [k in keyof Omit<TypesafeEvents, "identify" | "eventNames">]: JSONObject;
} & {
  eventNames: string;
  identify: EmptyObject;
};
