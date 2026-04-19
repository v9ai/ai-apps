import { i as _coercedBigint, j as _coercedBoolean, k as _coercedDate, m as _coercedNumber, q as _coercedString, Z as ZodString, t as ZodNumber, v as ZodBoolean, w as ZodBigInt, x as ZodDate } from './schemas.mjs';

function string(params) {
    return _coercedString(ZodString, params);
}
function number(params) {
    return _coercedNumber(ZodNumber, params);
}
function boolean(params) {
    return _coercedBoolean(ZodBoolean, params);
}
function bigint(params) {
    return _coercedBigint(ZodBigInt, params);
}
function date(params) {
    return _coercedDate(ZodDate, params);
}

var coerce = /*#__PURE__*/Object.freeze({
    __proto__: null,
    bigint: bigint,
    boolean: boolean,
    date: date,
    number: number,
    string: string
});

export { coerce as c, date as d, number as n };
//# sourceMappingURL=coerce.mjs.map
