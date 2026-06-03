import { spawn } from "node:child_process"
import path from "node:path"
import fs from "node:fs"
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// const PACKAGES_DIR = path.resolve(__dirname, "../packages/icons");
const copyRemix = ()=>{
    const remix_dirs = [
        "Arrows", "Buildings", "Business", 
        "Communication", "Design", "Development", 
        "Device", "Document", "Editor", "Finance", 
        "Food", "Health\s&\sMedical", "Logos", 
        "Map", "Media", "Others", "System",
        "User\s&\sFaces", "Weather"
    ]
    const remixDir = path.join(__dirname, '../tmp-icons/icon-remix/icons')
    for(const dir of remix_dirs){
        fs.mkdirSync(path.join(__dirname, '../packages/icons/icon-remix/icons'), {recursive: true})
        console.log('remixDir', path.join(remixDir, dir))
        console.log('target path', path.join(__dirname, '../packages/icons/icon-remix/icons'))
        spawn('cp', ['-r', `${path.join(remixDir, dir)}/*`, `${path.join(__dirname, '../packages/icons/icon-remix/icons')}/`], {stdio: 'inherit', shell: true})
    }
}

copyRemix()