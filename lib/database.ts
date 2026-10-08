import { env } from "cloudflare:workers";
export function database(){if(!env.DB)throw new Error("Profile storage is unavailable.");return env.DB;}
