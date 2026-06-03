type P = (() => Promise<{ default: string; }>) | ({[k: string]: (() => Promise<{ default: string; }>)});
type K = {"filled":{[k: string]:string | any},"outlined":{[k: string]:string | any},"round":{[k: string]:string | any},"sharp":{[k: string]:string | any},"two-tone":{[k: string]:string | any}};
declare global {
interface Window {
    FLUIXI_ICONS?: Record<"bootstrap" | "font-awesome" | "heroicons" | "iconoir" | "lucide" | "material-design" | "phosphor" | "remix" | "tabler", K>;
}
}
export {}
