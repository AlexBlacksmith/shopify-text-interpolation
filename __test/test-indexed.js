import * as fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { translateTextTo } from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//const regBefore = /{{\s*([\S]*)\s*}}/gm;
// const regAfter = /\<t\>\{([\S]*)\}\<\/t\>/gm;
const regVars = /{{\s*\w+\s*}}/g
const regBracesLeft = /{{\s+/
const regBracesRight = /\s+}}/

const examples = JSON.parse(fs.readFileSync(path.join(__dirname, 'examples.json')));


const getVars = (reg, str) => str.match(reg);

const getMap = (arr) => {
	const map = {};
	arr.map((key, index) => {
  	map[index] = key;
  });
  return map;
}

const indexVars = (vars, str) => {
	const map = getMap(vars);
  Object.entries(map).map(([key, val]) => {
  	str = str.replace(regBracesLeft, `<t id="${key}">{`);
    str = str.replace(regBracesRight, '}</t>');
  });
  return str;
}

const addVarsToTranslation = (map, str) => {
	Object.entries(map).map(([key, val]) => {
        const reg = new RegExp("<t id=\""+key+"\"[\\p{L}\\p{P}\\p{S}\\p{Z}]+t>", 'u')
        str = str.replace(reg, val);
    });
    return str;
}

const getTranslatedStrWithVars = async (vars, map, text) => {
    const indexedString = indexVars(vars, text);
    //console.log(indexedString);
    try {
        const translatedString = await translateTextTo(indexedString, 'ru');
        //console.log(translatedString);
        const newStr = addVarsToTranslation(map, translatedString);

        return newStr;
    } catch(err) {
        console.error(err);
    }
}

const translateObj = async (obj) => {
    await Promise.all(Object.entries(obj).map(async ([key, val]) => {
        const vars = getVars(regVars, val)
        const varsMap = getMap(vars);
        const translate = await getTranslatedStrWithVars(vars, varsMap, val);
        obj[key] = translate;
    }));
    console.log(obj);
}

//translateObj(examples);