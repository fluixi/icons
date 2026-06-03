type P = (() => Promise<{ default: string; }>) | ({[k: string]: (() => Promise<{ default: string; }>)});
type K = {"bold":{[k: string]:string | any},"duotone":{[k: string]:string | any},"fill":{[k: string]:string | any},"light":{[k: string]:string | any},"regular":{[k: string]:string | any},"thin":{[k: string]:string | any}};
declare global {
interface Window {
    FLUIXI_ICONS?: Record<"bootstrap" | "font-awesome" | "heroicons" | "iconoir" | "lucide" | "material-design" | "phosphor" | "remix" | "tabler", K>;
}
}
export {}
