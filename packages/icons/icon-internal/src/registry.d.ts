type P = (() => Promise<{ default: string; }>) | ({[k: string]: (() => Promise<{ default: string; }>)});
type K = {"filled":{[k: string]:string | any},"outline":{[k: string]:string | any}};
declare global {
interface Window {
    FLUIXI_ICONS?: Record<"internal", K>;
}
}
export {}
