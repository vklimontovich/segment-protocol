import { AnalyticsInterface, getDummyAnalytics, getTypesafeAnalytic } from "../src";
import { expect, test } from "bun:test";

test("testTypedHelper", () => {
  //first, let's define types for properties and user traits
  type TrackingProperties = { env: string };
  type UserProperties = { name: string; email: string };
  //define a type with all possible event names for .track() method
  type EventNames = "Sign Up" | "Sign In" | "Sign Out";

  //define a type with all possible event names for .track() method
  type MyAnalytics = AnalyticsInterface<{
    //event names for .track() method
    eventNames: EventNames;
    //properties for .page() and .track() methods
    page: TrackingProperties;
    track: TrackingProperties;
    //user traits for .identify() method
    traits: UserProperties;
  }>;

  const dummyAnalytics = getDummyAnalytics({ log: true, silent: true });
  const myAnalytics = getTypesafeAnalytic<MyAnalytics>(dummyAnalytics);

  myAnalytics.page({ env: "prod" }); //OK
  //myAnalytics.page({ otherProp: "prod" }); //Error - unknown property
  myAnalytics.identify({ name: "John Doe", email: "john.doe@gmail.com" }); //OK
  //myAnalytics.identify({ name: "John Doe" }); //Error - email is missing
  myAnalytics.track("Sign Up"); //OK
  //myAnalytics.track("sign up"); //Error - misspelled error name
  console.log("All events", dummyAnalytics.log);
  const identifies = dummyAnalytics.log.filter(e => e.type === "identify");
  const tracks = dummyAnalytics.log.filter(e => e.type === "track");
  const pages = dummyAnalytics.log.filter(e => e.type === "page");
  expect(identifies.length).toBe(1);
  expect(tracks.length).toBe(1);
  expect(pages.length).toBe(1);
  expect(identifies[0].traits).toEqual({ name: "John Doe", email: "john.doe@gmail.com" });
  expect(tracks[0].event).toEqual("Sign Up");
});
