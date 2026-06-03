type P = (() => Promise<{ default: string; }>) | ({[k: string]: (() => Promise<{ default: string; }>)});
type K = {"16":{"solid":{[k: string]:string | any}},"20":{"solid":{[k: string]:string | any}},"24":{"outline":{[k: string]:string | any},"solid":{[k: string]:string | any}}};
declare global {
interface Window {
    FLUIXI_ICONS?: Record<"bootstrap" | "font-awesome" | "heroicons" | "iconoir" | "lucide" | "material-design" | "phosphor" | "remix" | "tabler", K>;
}
}
export {}
