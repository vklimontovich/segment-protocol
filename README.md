# Segment Protocol

Segment introduced [Analytics.js in 2012](https://news.ycombinator.com/item?id=4912076). Since then, a lot of companies
besides Segment have started to use same API for their own SDKs. Notable examples: Jitsu, Rudderstack, June.so and Hightouch Events

However, Segment protocol was never formally spec'ed. `segment-protocols` project aims to fill the gap, at least partially,
by providing a TypeScript types for Segment protocol. Since the protocol doesn't have an official documentation, each
vendor has its own treatment and set of extension. This project aims to cover most of them and be flexible enough.

Along with the types, this project also provides a set of tools to work them.

## Types

`AnalyticsInterface` is an interface that contains all the methods that are supported by Segment-compatible SDKs: `track()`, `page()`, `screen()` etc.

`AnayliticsClientEvent` is an interface that contains an event that can be sent to Segment-compatible end-point. The type has a number
of subtypes that narrow it down for particular event type: `ScreenEvent`, `TrackEvent`, `IdentifyEvent` etc.

`AnalyticsServerEvent` is an event that is being processed by server. It's an `AnayliticsClientEvent` plus certain properties
which is inferred from HTTP Request context, such as IP address

## Compile-time type-safety

Segment protocol allows to pass any set of properties and user traits along with event. It's convinient and gives a lot of flexibility,
but at the same time it's easy to make a mistake and pass a wrong property name or value type. `AnalyticsTypeHelper` solves this:

```typescript

//first, let's define types for properties and user traits
type TrackingProperties = { env: string };
type UserProperties = { name: string; email: string };
//define a type with all possible event names for .track() method
type EventNames = 'Sign Up' | 'Sign In' | 'Sign Out';

type MyAnalytics = AnalyticsInterface<{
  //event names for .track() method
  eventNames: "Sign Up" | "Login" | "Logout";
  //properties for .page() and .track() methods
  page: TrackingProperties;
  track: TrackingProperties;
  //user traits for .identify() method
  traits: UserProperties;
}>;

//now we can use it. No need to create a new instance of analytics, since all validation is done at compile time
const myAnalytics: MyAnalytics = analytics as MyAnalytics;

myAnalytics.page({ env: "prod" }); // ✅OK
myAnalytics.page({ otherProp: "prod" }); //⚠️Error - unknown property
myAnalytics.identify({ name: "John Doe", email: "john.doe@gmail.com" }); //✅OK
myAnalytics.identify({ name: "John Doe" }); //⚠️Error - email is missing
myAnalytics.track("Sign Up"); //✅OK
myAnalytics.track("sign up"); //⚠️Error - misspelled event name
```

## Tools

`createAnalyticsParser()` creates an adjusted implementation of `AnalyticsInterface` that returns `AnalyticsServerEvent`
on every method call. This function serves as a reference implementation that turns `.track()`, `.page()` etc. methods
into a JSON message that is being sent to Segment-compatible end-point.



