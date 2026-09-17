import "server-only";
import { readInfrastructureConfig } from "./infrastructure/config";

export const getServerEnv = readInfrastructureConfig;
