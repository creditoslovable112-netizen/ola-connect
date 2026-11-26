import { defineMcp } from "@lovable.dev/mcp-js";
import listPlans from "./tools/list-plans";
import getPlan from "./tools/get-plan";

export default defineMcp({
  name: "ola-hello-horizon",
  title: "Ola Hello Horizon",
  version: "0.1.0",
  instructions: "Public information about NEXUS subscription plans and prices. No personal or account data is available.",
  tools: [listPlans, getPlan],
});
