import { t as tokenIntercept } from './getSSOTokenFromFile.mjs';
import { f as fileIntercept } from './SignatureV4MultiRegion.mjs';

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
//# sourceMappingURL=externalDataInterceptor.mjs.map
