type P = (() => Promise<{ default: string; }>) | ({[k: string]: (() => Promise<{ default: string; }>)});
type K = Record<string, string | P | {[k: string]: P | string}>;
declare global {
interface Window {
    FLUIXI_ICONS?: Record<"bootstrap" | "lucide", K | Record<string, K>>;
}
}
export {}
