type P = (() => Promise<{ default: string; }>) | ({[k: string]: (() => Promise<{ default: string; }>)});
type K = {"brands":{[k: string]:string | any},"regular":{[k: string]:string | any},"solid":{[k: string]:string | any}};
declare global {
interface Window {
    FLUIXI_ICONS?: Record<"bootstrap" | "font-awesome" | "heroicons" | "iconoir" | "lucide" | "material-design" | "phosphor" | "remix" | "tabler", K>;
}
}
export {}
