import { t as tokenIntercept } from './getSSOTokenFromFile.mjs';
import { x as fileIntercept } from './mastra.mjs';

const externalDataInterceptor = {
    getFileRecord() {
        return fileIntercept;
    },
    interceptFile(path, contents) {
        fileIntercept[path] = Promise.resolve(contents);
    },
    getTokenRecord() {
        return tokenIntercept;
    },
    interceptToken(id, contents) {
        tokenIntercept[id] = contents;
    },
};

export { externalDataInterceptor as e };
