const vr = ['16']
let map = {
}


function objectFromArrayKeys(object, keys, default_value = {}){
    let i = 0;
    let data_map = object;
    if(keys.length===0){
        if(Object.keys(data_map).length>0){
            data_map = {...data_map, ...default_value}
        }else{
            data_map = default_value
        }
        object = {...object, ...data_map }
        return data_map
    }
    while(i<keys.length){
        const key = keys[i]
        if(!data_map[key]){
            data_map[key] = {}   
        }
        if(i===keys.length-1){
            data_map[key] = {...data_map[key], ...default_value}
        }
        data_map = data_map[key]
        i+=1
    }
    return data_map
}

function objectToStringJson(object){
    let str = '';
    const keys = Object.keys(object)
    for(const key of keys){
        if(typeof object[key]==='object'){
            str += `${key}: {\n\t ${objectToStringJson(object[key])}}\n`
        }else{
            str += `${key}: ${object[key]},\n`
        }
    }
    return str
}

let data_map = objectFromArrayKeys(map, [], {'test': true});
console.log('data map', data_map)
console.log('map', map)
console.log('string', JSON.stringify(map))
// const r = Object.values(map).reduce((p, c)=>{
//     console.log('p', p)
//     console.log('c', c)
//     return c
// })

// console.log('r', r)