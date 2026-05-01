import { registerExtension, ExtensionRegistration } from "./extension";
import { registerMemory, MemoryRegistration } from "./memory";
import { registerOverview, OverviewRegistration } from "./overview";
import { registerSearch, SearchRegistration } from "./search";
import { registerLinewave, LinewaveRegistration } from "./linewave";
import { registerTypes, TypesRegistration } from "./types";

export interface ServiceRegistry {
  healthy: boolean;
  services: {
    extension: ExtensionRegistration;
    memory: MemoryRegistration;
    overview: OverviewRegistration;
    search: SearchRegistration;
    linewave: LinewaveRegistration;
    types: TypesRegistration;
  };
}

export function registerServices(workspaceRoot: string = process.cwd()): ServiceRegistry {
  const services = {
    extension: registerExtension(workspaceRoot),
    memory: registerMemory(),
    overview: registerOverview(),
    search: registerSearch(),
    linewave: registerLinewave(),
    types: registerTypes(),
  };

  return {
    healthy: Object.values(services).every((s) => s.healthy),
    services,
  };
}
