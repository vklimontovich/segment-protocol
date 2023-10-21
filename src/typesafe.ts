import { JSONObject } from "./events";

export type TypesafeEvents<
  T_page extends JSONObject = JSONObject,
  T_track extends JSONObject = JSONObject,
  T_identify extends JSONObject = {},
  T_traits extends JSONObject = JSONObject,
  T_types extends string = string,
> = {
  page?: T_page;
  identify?: T_identify;
  traits?: T_traits;
  track?: T_track;
  trackTypes?: T_types;
};

export type DefaultEventTypes = {
  [k in keyof Omit<TypesafeEvents, "identify" | "trackTypes">]: JSONObject;
} & {
  trackTypes: string;
  identify: {};
};
