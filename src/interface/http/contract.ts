export type HttpMethod = "DELETE" | "GET" | "PATCH" | "POST";

export interface HttpRouteContract {
  readonly method: HttpMethod;
  readonly path: string;
  readonly actorHeader: "CrewLead" | "Passenger" | "optional" | "none";
  readonly requestBody: readonly string[];
  readonly successStatus: number;
  readonly errorStatuses: readonly number[];
}

export const httpContract: readonly HttpRouteContract[] = [
  {
    method: "GET",
    path: "/health",
    actorHeader: "none",
    requestBody: [],
    successStatus: 200,
    errorStatuses: [],
  },
  {
    method: "POST",
    path: "/crew-leads/bootstrap",
    actorHeader: "none",
    requestBody: ["leads[].id", "leads[].name"],
    successStatus: 201,
    errorStatuses: [400, 409],
  },
  {
    method: "GET",
    path: "/crew-leads",
    actorHeader: "none",
    requestBody: [],
    successStatus: 200,
    errorStatuses: [],
  },
  {
    method: "POST",
    path: "/passengers",
    actorHeader: "CrewLead",
    requestBody: ["id", "name", "tier"],
    successStatus: 201,
    errorStatuses: [400, 403, 409],
  },
  {
    method: "GET",
    path: "/passengers",
    actorHeader: "none",
    requestBody: [],
    successStatus: 200,
    errorStatuses: [],
  },
  {
    method: "GET",
    path: "/passengers/:id",
    actorHeader: "none",
    requestBody: [],
    successStatus: 200,
    errorStatuses: [404],
  },
  {
    method: "PATCH",
    path: "/passengers/:id/tier",
    actorHeader: "CrewLead",
    requestBody: ["tier"],
    successStatus: 200,
    errorStatuses: [400, 403, 404],
  },
  {
    method: "DELETE",
    path: "/passengers/:id",
    actorHeader: "CrewLead",
    requestBody: [],
    successStatus: 200,
    errorStatuses: [400, 403, 404],
  },
  {
    method: "POST",
    path: "/resources",
    actorHeader: "CrewLead",
    requestBody: ["id", "name", "category", "minTier"],
    successStatus: 201,
    errorStatuses: [400, 403, 409],
  },
  {
    method: "GET",
    path: "/resources",
    actorHeader: "optional",
    requestBody: [],
    successStatus: 200,
    errorStatuses: [],
  },
  {
    method: "POST",
    path: "/access/use",
    actorHeader: "Passenger",
    requestBody: ["resourceId"],
    successStatus: 201,
    errorStatuses: [400, 403, 404],
  },
  {
    method: "GET",
    path: "/reports/history/:passengerId",
    actorHeader: "none",
    requestBody: [],
    successStatus: 200,
    errorStatuses: [],
  },
  {
    method: "GET",
    path: "/reports/aggregate-by-tier",
    actorHeader: "none",
    requestBody: [],
    successStatus: 200,
    errorStatuses: [],
  },
  {
    method: "GET",
    path: "/reports/top-resources",
    actorHeader: "optional",
    requestBody: [],
    successStatus: 200,
    errorStatuses: [],
  },
];
