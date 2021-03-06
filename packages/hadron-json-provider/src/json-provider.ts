import * as fs from 'fs';
import { extname, relative } from 'path';
import { parseString as xmlToJson } from 'xml2js';
import locate, { configLocate } from '@brainhubeu/hadron-file-locator';

const isFunction = (functionToCheck: any): boolean =>
  functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';

const getExtension = (path: string): string => extname(path).substring(1);

export const jsLoader = (path: string) => {
  const supportsExtension: string = 'js';
  return new Promise((resolve, reject) => {
    if (getExtension(path) !== supportsExtension) {
      reject(new Error(`${path} doesn't have ${supportsExtension} extension`));
    }

    let data = require(`./${relative(__dirname, path)}`);
    if (!isFunction(data) && data && isFunction(data.default)) {
      data = data.default;
    }
    data !== null ? resolve(data()) : reject(new Error('File not found'));
  });
};

export const jsonLoader = (path: string) => {
  const supportsExtension: string = 'json';
  return new Promise((resolve, reject) => {
    if (getExtension(path) !== supportsExtension) {
      reject(
        new Error(`${path} doesn't have a ${supportsExtension} extension`),
      );
    }

    fs.readFile(path, 'utf8', (err, data) => {
      err ? reject(err) : resolve(JSON.parse(data));
    });
  });
};

export const xmlLoader = (path: string) => {
  const supportsExtension: string = 'xml';
  return new Promise((resolve, reject) => {
    if (getExtension(path) !== supportsExtension) {
      reject(new Error(`${path} doesn't have ${supportsExtension} extension`));
    }

    fs.readFile(path, 'utf8', (err, data) => {
      if (err) {
        reject(err);
      }

      xmlToJson(data, (jsonErr: Error, jsonData: string) => {
        if (jsonErr) {
          reject(jsonErr);
        }
        resolve(jsonData);
      });
    });
  });
};

const mapper: { [key: string]: (path: string) => Promise<any> } = {
  js: jsLoader,
  json: jsonLoader,
  xml: xmlLoader,
};

const extensionMapper = (paths: string[]): Array<Promise<any>> =>
  paths.map((path) => mapper[getExtension(path)](path));

export const configJsonProvider = (
  paths: string[],
  configName: string,
  type: string,
  extensions: string[] = [],
  concatResults: boolean = false,
): Promise<object> =>
  configLocate(paths, configName, type, extensions)
    .then((locatedPaths: string[]) =>
      Promise.all(extensionMapper(locatedPaths)),
    )
    .then(
      (data: any) => (concatResults ? [...data] : Object.assign({}, ...data)),
    );

export const jsonProvider = (
  paths: string[],
  extensions: string[],
  concatResults: boolean = false,
) =>
  locate(paths, extensions)
    .then((locatedPaths: string[]) =>
      Promise.all(extensionMapper(locatedPaths)),
    )
    .then(
      (data: any) => (concatResults ? [...data] : Object.assign({}, ...data)),
    );

export default jsonProvider;
