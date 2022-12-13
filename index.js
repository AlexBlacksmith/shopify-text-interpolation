const fs = require('fs');
const path = require('path');
const {Translate} = require('@google-cloud/translate').v2;

const { 
    interpolate, 
    deinterpolate, 
    getObjKeysArray,
    parseJSONFile,
    getValuesMap,
    compareObjectsByKeys 
} = require('./helpers.js')

const translateApi = new Translate({key: process.env.GOOGLE_API_KEY });

const mergeObjectsValues = (keys, source, target) => {
    const step = keys.shift();

    if(target[step] && typeof target[step] === 'string' && typeof source[step] === 'string') {
        target[step] = source[step];
        return;
    }

    if (typeof target[step] === 'object' && typeof source[step] === 'object') {
        mergeObjectsValues(keys, source[step], target[step]);
    }
}

const mergeLocalesKeys = (keyMap, locale, source) => {
    const sourceCopy = JSON.parse(JSON.stringify(source));
    Object.keys(keyMap).map(key => {
        const keysArr = key.split('.');
        mergeObjectsValues(keysArr, locale, sourceCopy);
    });
    return sourceCopy;
}

const translateUpdatedKeys = async (keyMap, updatedObj) => {
    const translateBySteps = async (steps, obj) => {
        const step = steps.shift();
        if (typeof obj[step] === 'string') {
            obj[step] = await translateStr(obj[step]);
            return;
        }
        if (typeof obj[step] === 'object') {
            await translateBySteps(steps, obj[step]);
        }
    }

    await Promise.all(Object.keys(keyMap).map(async (key) => {
        const steps = key.split('.');
        await translateBySteps(steps, updatedObj);
    }));

    return updatedObj;
}

const translateStr = async (str) => {
    const interpolatedStr = interpolate(str);
    const [translation] = await translateApi.translate(interpolatedStr, 'ru');
    return deinterpolate(translation)
}

const start = async () => {
    const source = parseJSONFile('./templates/in/en.json');
    const locale = parseJSONFile('./templates/in/ru.json');

    const valuesMap = getValuesMap(source);

    const updatedLocaleObject = mergeLocalesKeys(valuesMap, locale, source);

    // const keysArrLocale = getObjKeysArray(locale);
    // const keysArrSource = getObjKeysArray(source);
    // const keysArrUpdated = getObjKeysArray(updatedLocaleObject);            

    const entriesDiffs = compareObjectsByKeys(getValuesMap(source), getValuesMap(locale));
    // console.log(entriesDiffs);

    // if (keysArrLocale.length === keysArrSource.length) {
    //     console.log('Success +++ ', keysArrLocale.length, 'from', keysArrSource.length);
    // } else {
    //     console.log('False --- ', keysArrLocale.length, 'from', keysArrSource.length);
    // }

    // const checkDiff = compareObjectsByKeys(getValuesMap(source), getValuesMap(updatedLocaleObject));

    // if (keysArrUpdated.length === keysArrSource.length) {
    //     console.log('Success +++ ', keysArrUpdated.length, 'from', keysArrSource.length, checkDiff);
    // } else {
    //     console.log('False --- ', keysArrUpdated.length, 'from', keysArrSource.length, checkDiff);
    // }

    const translatedLocaleObject = await translateUpdatedKeys(entriesDiffs, updatedLocaleObject);


    fs.unlinkSync(path.join(__dirname, './templates/out/updated-ru.json'));
    fs.writeFileSync(path.join(__dirname, './templates/out/updated-ru.json'), JSON.stringify(translatedLocaleObject, null, '\t'));
}

start()