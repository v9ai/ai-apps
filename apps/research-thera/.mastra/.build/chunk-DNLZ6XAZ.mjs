import { c as createTool } from './tools.mjs';
import * as nodePath from 'path';
import nodePath__default from 'path';
import 'path/posix';
import 'fs';
import * as fs2 from 'fs/promises';
import fs2__default from 'fs/promises';
import * as os3 from 'os';
import { g as getDefaultExportFromCjs, a as getAugmentedNamespace } from './_commonjsHelpers.mjs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import 'child_process';
import 'crypto';
import 'stream';
import { c as commonjsRequire } from './_commonjs-dynamic-modules.mjs';
import { o as object, e as boolean, b as array, s as string, _ as _enum, n as number, r as record, h as unknown, u as union } from './schemas.mjs';

var utils$8 = {};

const WIN_SLASH = '\\\\/';
const WIN_NO_SLASH = `[^${WIN_SLASH}]`;

/**
 * Posix glob regex
 */

const DOT_LITERAL = '\\.';
const PLUS_LITERAL = '\\+';
const QMARK_LITERAL = '\\?';
const SLASH_LITERAL = '\\/';
const ONE_CHAR = '(?=.)';
const QMARK = '[^/]';
const END_ANCHOR = `(?:${SLASH_LITERAL}|$)`;
const START_ANCHOR = `(?:^|${SLASH_LITERAL})`;
const DOTS_SLASH = `${DOT_LITERAL}{1,2}${END_ANCHOR}`;
const NO_DOT = `(?!${DOT_LITERAL})`;
const NO_DOTS = `(?!${START_ANCHOR}${DOTS_SLASH})`;
const NO_DOT_SLASH = `(?!${DOT_LITERAL}{0,1}${END_ANCHOR})`;
const NO_DOTS_SLASH = `(?!${DOTS_SLASH})`;
const QMARK_NO_DOT = `[^.${SLASH_LITERAL}]`;
const STAR = `${QMARK}*?`;
const SEP = '/';

const POSIX_CHARS = {
  DOT_LITERAL,
  PLUS_LITERAL,
  QMARK_LITERAL,
  SLASH_LITERAL,
  ONE_CHAR,
  QMARK,
  END_ANCHOR,
  DOTS_SLASH,
  NO_DOT,
  NO_DOTS,
  NO_DOT_SLASH,
  NO_DOTS_SLASH,
  QMARK_NO_DOT,
  STAR,
  START_ANCHOR,
  SEP
};

/**
 * Windows glob regex
 */

const WINDOWS_CHARS = {
  ...POSIX_CHARS,

  SLASH_LITERAL: `[${WIN_SLASH}]`,
  QMARK: WIN_NO_SLASH,
  STAR: `${WIN_NO_SLASH}*?`,
  DOTS_SLASH: `${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$)`,
  NO_DOT: `(?!${DOT_LITERAL})`,
  NO_DOTS: `(?!(?:^|[${WIN_SLASH}])${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$))`,
  NO_DOT_SLASH: `(?!${DOT_LITERAL}{0,1}(?:[${WIN_SLASH}]|$))`,
  NO_DOTS_SLASH: `(?!${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$))`,
  QMARK_NO_DOT: `[^.${WIN_SLASH}]`,
  START_ANCHOR: `(?:^|[${WIN_SLASH}])`,
  END_ANCHOR: `(?:[${WIN_SLASH}]|$)`,
  SEP: '\\'
};

/**
 * POSIX Bracket Regex
 */

const POSIX_REGEX_SOURCE$1 = {
  alnum: 'a-zA-Z0-9',
  alpha: 'a-zA-Z',
  ascii: '\\x00-\\x7F',
  blank: ' \\t',
  cntrl: '\\x00-\\x1F\\x7F',
  digit: '0-9',
  graph: '\\x21-\\x7E',
  lower: 'a-z',
  print: '\\x20-\\x7E ',
  punct: '\\-!"#$%&\'()\\*+,./:;<=>?@[\\]^_`{|}~',
  space: ' \\t\\r\\n\\v\\f',
  upper: 'A-Z',
  word: 'A-Za-z0-9_',
  xdigit: 'A-Fa-f0-9'
};

var constants$2 = {
  MAX_LENGTH: 1024 * 64,
  POSIX_REGEX_SOURCE: POSIX_REGEX_SOURCE$1,

  // regular expressions
  REGEX_BACKSLASH: /\\(?![*+?^${}(|)[\]])/g,
  REGEX_NON_SPECIAL_CHARS: /^[^@![\].,$*+?^{}()|\\/]+/,
  REGEX_SPECIAL_CHARS: /[-*+?.^${}(|)[\]]/,
  REGEX_SPECIAL_CHARS_BACKREF: /(\\?)((\W)(\3*))/g,
  REGEX_SPECIAL_CHARS_GLOBAL: /([-*+?.^${}(|)[\]])/g,
  REGEX_REMOVE_BACKSLASH: /(?:\[.*?[^\\]\]|\\(?=.))/g,

  // Replace globs with equivalent patterns to reduce parsing time.
  REPLACEMENTS: {
    __proto__: null,
    '***': '*',
    '**/**': '**',
    '**/**/**': '**'
  },

  // Digits
  CHAR_0: 48, /* 0 */
  CHAR_9: 57, /* 9 */

  // Alphabet chars.
  CHAR_UPPERCASE_A: 65, /* A */
  CHAR_LOWERCASE_A: 97, /* a */
  CHAR_UPPERCASE_Z: 90, /* Z */
  CHAR_LOWERCASE_Z: 122, /* z */

  CHAR_LEFT_PARENTHESES: 40, /* ( */
  CHAR_RIGHT_PARENTHESES: 41, /* ) */

  CHAR_ASTERISK: 42, /* * */

  // Non-alphabetic chars.
  CHAR_AMPERSAND: 38, /* & */
  CHAR_AT: 64, /* @ */
  CHAR_BACKWARD_SLASH: 92, /* \ */
  CHAR_CARRIAGE_RETURN: 13, /* \r */
  CHAR_CIRCUMFLEX_ACCENT: 94, /* ^ */
  CHAR_COLON: 58, /* : */
  CHAR_COMMA: 44, /* , */
  CHAR_DOT: 46, /* . */
  CHAR_DOUBLE_QUOTE: 34, /* " */
  CHAR_EQUAL: 61, /* = */
  CHAR_EXCLAMATION_MARK: 33, /* ! */
  CHAR_FORM_FEED: 12, /* \f */
  CHAR_FORWARD_SLASH: 47, /* / */
  CHAR_GRAVE_ACCENT: 96, /* ` */
  CHAR_HASH: 35, /* # */
  CHAR_HYPHEN_MINUS: 45, /* - */
  CHAR_LEFT_ANGLE_BRACKET: 60, /* < */
  CHAR_LEFT_CURLY_BRACE: 123, /* { */
  CHAR_LEFT_SQUARE_BRACKET: 91, /* [ */
  CHAR_LINE_FEED: 10, /* \n */
  CHAR_NO_BREAK_SPACE: 160, /* \u00A0 */
  CHAR_PERCENT: 37, /* % */
  CHAR_PLUS: 43, /* + */
  CHAR_QUESTION_MARK: 63, /* ? */
  CHAR_RIGHT_ANGLE_BRACKET: 62, /* > */
  CHAR_RIGHT_CURLY_BRACE: 125, /* } */
  CHAR_RIGHT_SQUARE_BRACKET: 93, /* ] */
  CHAR_SEMICOLON: 59, /* ; */
  CHAR_SINGLE_QUOTE: 39, /* ' */
  CHAR_SPACE: 32, /*   */
  CHAR_TAB: 9, /* \t */
  CHAR_UNDERSCORE: 95, /* _ */
  CHAR_VERTICAL_LINE: 124, /* | */
  CHAR_ZERO_WIDTH_NOBREAK_SPACE: 65279, /* \uFEFF */

  /**
   * Create EXTGLOB_CHARS
   */

  extglobChars(chars) {
    return {
      '!': { type: 'negate', open: '(?:(?!(?:', close: `))${chars.STAR})` },
      '?': { type: 'qmark', open: '(?:', close: ')?' },
      '+': { type: 'plus', open: '(?:', close: ')+' },
      '*': { type: 'star', open: '(?:', close: ')*' },
      '@': { type: 'at', open: '(?:', close: ')' }
    };
  },

  /**
   * Create GLOB_CHARS
   */

  globChars(win32) {
    return win32 === true ? WINDOWS_CHARS : POSIX_CHARS;
  }
};

/*global navigator*/

(function (exports$1) {

	const {
	  REGEX_BACKSLASH,
	  REGEX_REMOVE_BACKSLASH,
	  REGEX_SPECIAL_CHARS,
	  REGEX_SPECIAL_CHARS_GLOBAL
	} = constants$2;

	exports$1.isObject = val => val !== null && typeof val === 'object' && !Array.isArray(val);
	exports$1.hasRegexChars = str => REGEX_SPECIAL_CHARS.test(str);
	exports$1.isRegexChar = str => str.length === 1 && exports$1.hasRegexChars(str);
	exports$1.escapeRegex = str => str.replace(REGEX_SPECIAL_CHARS_GLOBAL, '\\$1');
	exports$1.toPosixSlashes = str => str.replace(REGEX_BACKSLASH, '/');

	exports$1.isWindows = () => {
	  if (typeof navigator !== 'undefined' && navigator.platform) {
	    const platform = navigator.platform.toLowerCase();
	    return platform === 'win32' || platform === 'windows';
	  }

	  if (typeof process !== 'undefined' && process.platform) {
	    return process.platform === 'win32';
	  }

	  return false;
	};

	exports$1.removeBackslashes = str => {
	  return str.replace(REGEX_REMOVE_BACKSLASH, match => {
	    return match === '\\' ? '' : match;
	  });
	};

	exports$1.escapeLast = (input, char, lastIdx) => {
	  const idx = input.lastIndexOf(char, lastIdx);
	  if (idx === -1) return input;
	  if (input[idx - 1] === '\\') return exports$1.escapeLast(input, char, idx - 1);
	  return `${input.slice(0, idx)}\\${input.slice(idx)}`;
	};

	exports$1.removePrefix = (input, state = {}) => {
	  let output = input;
	  if (output.startsWith('./')) {
	    output = output.slice(2);
	    state.prefix = './';
	  }
	  return output;
	};

	exports$1.wrapOutput = (input, state = {}, options = {}) => {
	  const prepend = options.contains ? '' : '^';
	  const append = options.contains ? '' : '$';

	  let output = `${prepend}(?:${input})${append}`;
	  if (state.negated === true) {
	    output = `(?:^(?!${output}).*$)`;
	  }
	  return output;
	};

	exports$1.basename = (path, { windows } = {}) => {
	  const segs = path.split(windows ? /[\\/]/ : '/');
	  const last = segs[segs.length - 1];

	  if (last === '') {
	    return segs[segs.length - 2];
	  }

	  return last;
	}; 
} (utils$8));

const utils$7 = utils$8;
const {
  CHAR_ASTERISK: CHAR_ASTERISK$1,             /* * */
  CHAR_AT,                   /* @ */
  CHAR_BACKWARD_SLASH,       /* \ */
  CHAR_COMMA: CHAR_COMMA$1,                /* , */
  CHAR_DOT,                  /* . */
  CHAR_EXCLAMATION_MARK,     /* ! */
  CHAR_FORWARD_SLASH,        /* / */
  CHAR_LEFT_CURLY_BRACE,     /* { */
  CHAR_LEFT_PARENTHESES,     /* ( */
  CHAR_LEFT_SQUARE_BRACKET: CHAR_LEFT_SQUARE_BRACKET$1,  /* [ */
  CHAR_PLUS,                 /* + */
  CHAR_QUESTION_MARK,        /* ? */
  CHAR_RIGHT_CURLY_BRACE,    /* } */
  CHAR_RIGHT_PARENTHESES,    /* ) */
  CHAR_RIGHT_SQUARE_BRACKET: CHAR_RIGHT_SQUARE_BRACKET$1  /* ] */
} = constants$2;

const isPathSeparator = code => {
  return code === CHAR_FORWARD_SLASH || code === CHAR_BACKWARD_SLASH;
};

const depth = token => {
  if (token.isPrefix !== true) {
    token.depth = token.isGlobstar ? Infinity : 1;
  }
};

/**
 * Quickly scans a glob pattern and returns an object with a handful of
 * useful properties, like `isGlob`, `path` (the leading non-glob, if it exists),
 * `glob` (the actual pattern), `negated` (true if the path starts with `!` but not
 * with `!(`) and `negatedExtglob` (true if the path starts with `!(`).
 *
 * ```js
 * const pm = require('picomatch');
 * console.log(pm.scan('foo/bar/*.js'));
 * { isGlob: true, input: 'foo/bar/*.js', base: 'foo/bar', glob: '*.js' }
 * ```
 * @param {String} `str`
 * @param {Object} `options`
 * @return {Object} Returns an object with tokens and regex source string.
 * @api public
 */

const scan$1 = (input, options) => {
  const opts = options || {};

  const length = input.length - 1;
  const scanToEnd = opts.parts === true || opts.scanToEnd === true;
  const slashes = [];
  const tokens = [];
  const parts = [];

  let str = input;
  let index = -1;
  let start = 0;
  let lastIndex = 0;
  let isBrace = false;
  let isBracket = false;
  let isGlob = false;
  let isExtglob = false;
  let isGlobstar = false;
  let braceEscaped = false;
  let backslashes = false;
  let negated = false;
  let negatedExtglob = false;
  let finished = false;
  let braces = 0;
  let prev;
  let code;
  let token = { value: '', depth: 0, isGlob: false };

  const eos = () => index >= length;
  const peek = () => str.charCodeAt(index + 1);
  const advance = () => {
    prev = code;
    return str.charCodeAt(++index);
  };

  while (index < length) {
    code = advance();
    let next;

    if (code === CHAR_BACKWARD_SLASH) {
      backslashes = token.backslashes = true;
      code = advance();

      if (code === CHAR_LEFT_CURLY_BRACE) {
        braceEscaped = true;
      }
      continue;
    }

    if (braceEscaped === true || code === CHAR_LEFT_CURLY_BRACE) {
      braces++;

      while (eos() !== true && (code = advance())) {
        if (code === CHAR_BACKWARD_SLASH) {
          backslashes = token.backslashes = true;
          advance();
          continue;
        }

        if (code === CHAR_LEFT_CURLY_BRACE) {
          braces++;
          continue;
        }

        if (braceEscaped !== true && code === CHAR_DOT && (code = advance()) === CHAR_DOT) {
          isBrace = token.isBrace = true;
          isGlob = token.isGlob = true;
          finished = true;

          if (scanToEnd === true) {
            continue;
          }

          break;
        }

        if (braceEscaped !== true && code === CHAR_COMMA$1) {
          isBrace = token.isBrace = true;
          isGlob = token.isGlob = true;
          finished = true;

          if (scanToEnd === true) {
            continue;
          }

          break;
        }

        if (code === CHAR_RIGHT_CURLY_BRACE) {
          braces--;

          if (braces === 0) {
            braceEscaped = false;
            isBrace = token.isBrace = true;
            finished = true;
            break;
          }
        }
      }

      if (scanToEnd === true) {
        continue;
      }

      break;
    }

    if (code === CHAR_FORWARD_SLASH) {
      slashes.push(index);
      tokens.push(token);
      token = { value: '', depth: 0, isGlob: false };

      if (finished === true) continue;
      if (prev === CHAR_DOT && index === (start + 1)) {
        start += 2;
        continue;
      }

      lastIndex = index + 1;
      continue;
    }

    if (opts.noext !== true) {
      const isExtglobChar = code === CHAR_PLUS
        || code === CHAR_AT
        || code === CHAR_ASTERISK$1
        || code === CHAR_QUESTION_MARK
        || code === CHAR_EXCLAMATION_MARK;

      if (isExtglobChar === true && peek() === CHAR_LEFT_PARENTHESES) {
        isGlob = token.isGlob = true;
        isExtglob = token.isExtglob = true;
        finished = true;
        if (code === CHAR_EXCLAMATION_MARK && index === start) {
          negatedExtglob = true;
        }

        if (scanToEnd === true) {
          while (eos() !== true && (code = advance())) {
            if (code === CHAR_BACKWARD_SLASH) {
              backslashes = token.backslashes = true;
              code = advance();
              continue;
            }

            if (code === CHAR_RIGHT_PARENTHESES) {
              isGlob = token.isGlob = true;
              finished = true;
              break;
            }
          }
          continue;
        }
        break;
      }
    }

    if (code === CHAR_ASTERISK$1) {
      if (prev === CHAR_ASTERISK$1) isGlobstar = token.isGlobstar = true;
      isGlob = token.isGlob = true;
      finished = true;

      if (scanToEnd === true) {
        continue;
      }
      break;
    }

    if (code === CHAR_QUESTION_MARK) {
      isGlob = token.isGlob = true;
      finished = true;

      if (scanToEnd === true) {
        continue;
      }
      break;
    }

    if (code === CHAR_LEFT_SQUARE_BRACKET$1) {
      while (eos() !== true && (next = advance())) {
        if (next === CHAR_BACKWARD_SLASH) {
          backslashes = token.backslashes = true;
          advance();
          continue;
        }

        if (next === CHAR_RIGHT_SQUARE_BRACKET$1) {
          isBracket = token.isBracket = true;
          isGlob = token.isGlob = true;
          finished = true;
          break;
        }
      }

      if (scanToEnd === true) {
        continue;
      }

      break;
    }

    if (opts.nonegate !== true && code === CHAR_EXCLAMATION_MARK && index === start) {
      negated = token.negated = true;
      start++;
      continue;
    }

    if (opts.noparen !== true && code === CHAR_LEFT_PARENTHESES) {
      isGlob = token.isGlob = true;

      if (scanToEnd === true) {
        while (eos() !== true && (code = advance())) {
          if (code === CHAR_LEFT_PARENTHESES) {
            backslashes = token.backslashes = true;
            code = advance();
            continue;
          }

          if (code === CHAR_RIGHT_PARENTHESES) {
            finished = true;
            break;
          }
        }
        continue;
      }
      break;
    }

    if (isGlob === true) {
      finished = true;

      if (scanToEnd === true) {
        continue;
      }

      break;
    }
  }

  if (opts.noext === true) {
    isExtglob = false;
    isGlob = false;
  }

  let base = str;
  let prefix = '';
  let glob = '';

  if (start > 0) {
    prefix = str.slice(0, start);
    str = str.slice(start);
    lastIndex -= start;
  }

  if (base && isGlob === true && lastIndex > 0) {
    base = str.slice(0, lastIndex);
    glob = str.slice(lastIndex);
  } else if (isGlob === true) {
    base = '';
    glob = str;
  } else {
    base = str;
  }

  if (base && base !== '' && base !== '/' && base !== str) {
    if (isPathSeparator(base.charCodeAt(base.length - 1))) {
      base = base.slice(0, -1);
    }
  }

  if (opts.unescape === true) {
    if (glob) glob = utils$7.removeBackslashes(glob);

    if (base && backslashes === true) {
      base = utils$7.removeBackslashes(base);
    }
  }

  const state = {
    prefix,
    input,
    start,
    base,
    glob,
    isBrace,
    isBracket,
    isGlob,
    isExtglob,
    isGlobstar,
    negated,
    negatedExtglob
  };

  if (opts.tokens === true) {
    state.maxDepth = 0;
    if (!isPathSeparator(code)) {
      tokens.push(token);
    }
    state.tokens = tokens;
  }

  if (opts.parts === true || opts.tokens === true) {
    let prevIndex;

    for (let idx = 0; idx < slashes.length; idx++) {
      const n = prevIndex ? prevIndex + 1 : start;
      const i = slashes[idx];
      const value = input.slice(n, i);
      if (opts.tokens) {
        if (idx === 0 && start !== 0) {
          tokens[idx].isPrefix = true;
          tokens[idx].value = prefix;
        } else {
          tokens[idx].value = value;
        }
        depth(tokens[idx]);
        state.maxDepth += tokens[idx].depth;
      }
      if (idx !== 0 || value !== '') {
        parts.push(value);
      }
      prevIndex = i;
    }

    if (prevIndex && prevIndex + 1 < input.length) {
      const value = input.slice(prevIndex + 1);
      parts.push(value);

      if (opts.tokens) {
        tokens[tokens.length - 1].value = value;
        depth(tokens[tokens.length - 1]);
        state.maxDepth += tokens[tokens.length - 1].depth;
      }
    }

    state.slashes = slashes;
    state.parts = parts;
  }

  return state;
};

var scan_1 = scan$1;

const constants$1 = constants$2;
const utils$6 = utils$8;

/**
 * Constants
 */

const {
  MAX_LENGTH,
  POSIX_REGEX_SOURCE,
  REGEX_NON_SPECIAL_CHARS,
  REGEX_SPECIAL_CHARS_BACKREF,
  REPLACEMENTS
} = constants$1;

/**
 * Helpers
 */

const expandRange = (args, options) => {
  if (typeof options.expandRange === 'function') {
    return options.expandRange(...args, options);
  }

  args.sort();
  const value = `[${args.join('-')}]`;

  try {
    /* eslint-disable-next-line no-new */
    new RegExp(value);
  } catch (ex) {
    return args.map(v => utils$6.escapeRegex(v)).join('..');
  }

  return value;
};

/**
 * Create the message for a syntax error
 */

const syntaxError = (type, char) => {
  return `Missing ${type}: "${char}" - use "\\\\${char}" to match literal characters`;
};

/**
 * Parse the given input string.
 * @param {String} input
 * @param {Object} options
 * @return {Object}
 */

const parse$3 = (input, options) => {
  if (typeof input !== 'string') {
    throw new TypeError('Expected a string');
  }

  input = REPLACEMENTS[input] || input;

  const opts = { ...options };
  const max = typeof opts.maxLength === 'number' ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;

  let len = input.length;
  if (len > max) {
    throw new SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
  }

  const bos = { type: 'bos', value: '', output: opts.prepend || '' };
  const tokens = [bos];

  const capture = opts.capture ? '' : '?:';

  // create constants based on platform, for windows or posix
  const PLATFORM_CHARS = constants$1.globChars(opts.windows);
  const EXTGLOB_CHARS = constants$1.extglobChars(PLATFORM_CHARS);

  const {
    DOT_LITERAL,
    PLUS_LITERAL,
    SLASH_LITERAL,
    ONE_CHAR,
    DOTS_SLASH,
    NO_DOT,
    NO_DOT_SLASH,
    NO_DOTS_SLASH,
    QMARK,
    QMARK_NO_DOT,
    STAR,
    START_ANCHOR
  } = PLATFORM_CHARS;

  const globstar = opts => {
    return `(${capture}(?:(?!${START_ANCHOR}${opts.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`;
  };

  const nodot = opts.dot ? '' : NO_DOT;
  const qmarkNoDot = opts.dot ? QMARK : QMARK_NO_DOT;
  let star = opts.bash === true ? globstar(opts) : STAR;

  if (opts.capture) {
    star = `(${star})`;
  }

  // minimatch options support
  if (typeof opts.noext === 'boolean') {
    opts.noextglob = opts.noext;
  }

  const state = {
    input,
    index: -1,
    start: 0,
    dot: opts.dot === true,
    consumed: '',
    output: '',
    prefix: '',
    backtrack: false,
    negated: false,
    brackets: 0,
    braces: 0,
    parens: 0,
    quotes: 0,
    globstar: false,
    tokens
  };

  input = utils$6.removePrefix(input, state);
  len = input.length;

  const extglobs = [];
  const braces = [];
  const stack = [];
  let prev = bos;
  let value;

  /**
   * Tokenizing helpers
   */

  const eos = () => state.index === len - 1;
  const peek = state.peek = (n = 1) => input[state.index + n];
  const advance = state.advance = () => input[++state.index] || '';
  const remaining = () => input.slice(state.index + 1);
  const consume = (value = '', num = 0) => {
    state.consumed += value;
    state.index += num;
  };

  const append = token => {
    state.output += token.output != null ? token.output : token.value;
    consume(token.value);
  };

  const negate = () => {
    let count = 1;

    while (peek() === '!' && (peek(2) !== '(' || peek(3) === '?')) {
      advance();
      state.start++;
      count++;
    }

    if (count % 2 === 0) {
      return false;
    }

    state.negated = true;
    state.start++;
    return true;
  };

  const increment = type => {
    state[type]++;
    stack.push(type);
  };

  const decrement = type => {
    state[type]--;
    stack.pop();
  };

  /**
   * Push tokens onto the tokens array. This helper speeds up
   * tokenizing by 1) helping us avoid backtracking as much as possible,
   * and 2) helping us avoid creating extra tokens when consecutive
   * characters are plain text. This improves performance and simplifies
   * lookbehinds.
   */

  const push = tok => {
    if (prev.type === 'globstar') {
      const isBrace = state.braces > 0 && (tok.type === 'comma' || tok.type === 'brace');
      const isExtglob = tok.extglob === true || (extglobs.length && (tok.type === 'pipe' || tok.type === 'paren'));

      if (tok.type !== 'slash' && tok.type !== 'paren' && !isBrace && !isExtglob) {
        state.output = state.output.slice(0, -prev.output.length);
        prev.type = 'star';
        prev.value = '*';
        prev.output = star;
        state.output += prev.output;
      }
    }

    if (extglobs.length && tok.type !== 'paren') {
      extglobs[extglobs.length - 1].inner += tok.value;
    }

    if (tok.value || tok.output) append(tok);
    if (prev && prev.type === 'text' && tok.type === 'text') {
      prev.output = (prev.output || prev.value) + tok.value;
      prev.value += tok.value;
      return;
    }

    tok.prev = prev;
    tokens.push(tok);
    prev = tok;
  };

  const extglobOpen = (type, value) => {
    const token = { ...EXTGLOB_CHARS[value], conditions: 1, inner: '' };

    token.prev = prev;
    token.parens = state.parens;
    token.output = state.output;
    const output = (opts.capture ? '(' : '') + token.open;

    increment('parens');
    push({ type, value, output: state.output ? '' : ONE_CHAR });
    push({ type: 'paren', extglob: true, value: advance(), output });
    extglobs.push(token);
  };

  const extglobClose = token => {
    let output = token.close + (opts.capture ? ')' : '');
    let rest;

    if (token.type === 'negate') {
      let extglobStar = star;

      if (token.inner && token.inner.length > 1 && token.inner.includes('/')) {
        extglobStar = globstar(opts);
      }

      if (extglobStar !== star || eos() || /^\)+$/.test(remaining())) {
        output = token.close = `)$))${extglobStar}`;
      }

      if (token.inner.includes('*') && (rest = remaining()) && /^\.[^\\/.]+$/.test(rest)) {
        // Any non-magical string (`.ts`) or even nested expression (`.{ts,tsx}`) can follow after the closing parenthesis.
        // In this case, we need to parse the string and use it in the output of the original pattern.
        // Suitable patterns: `/!(*.d).ts`, `/!(*.d).{ts,tsx}`, `**/!(*-dbg).@(js)`.
        //
        // Disabling the `fastpaths` option due to a problem with parsing strings as `.ts` in the pattern like `**/!(*.d).ts`.
        const expression = parse$3(rest, { ...options, fastpaths: false }).output;

        output = token.close = `)${expression})${extglobStar})`;
      }

      if (token.prev.type === 'bos') {
        state.negatedExtglob = true;
      }
    }

    push({ type: 'paren', extglob: true, value, output });
    decrement('parens');
  };

  /**
   * Fast paths
   */

  if (opts.fastpaths !== false && !/(^[*!]|[/()[\]{}"])/.test(input)) {
    let backslashes = false;

    let output = input.replace(REGEX_SPECIAL_CHARS_BACKREF, (m, esc, chars, first, rest, index) => {
      if (first === '\\') {
        backslashes = true;
        return m;
      }

      if (first === '?') {
        if (esc) {
          return esc + first + (rest ? QMARK.repeat(rest.length) : '');
        }
        if (index === 0) {
          return qmarkNoDot + (rest ? QMARK.repeat(rest.length) : '');
        }
        return QMARK.repeat(chars.length);
      }

      if (first === '.') {
        return DOT_LITERAL.repeat(chars.length);
      }

      if (first === '*') {
        if (esc) {
          return esc + first + (rest ? star : '');
        }
        return star;
      }
      return esc ? m : `\\${m}`;
    });

    if (backslashes === true) {
      if (opts.unescape === true) {
        output = output.replace(/\\/g, '');
      } else {
        output = output.replace(/\\+/g, m => {
          return m.length % 2 === 0 ? '\\\\' : (m ? '\\' : '');
        });
      }
    }

    if (output === input && opts.contains === true) {
      state.output = input;
      return state;
    }

    state.output = utils$6.wrapOutput(output, state, options);
    return state;
  }

  /**
   * Tokenize input until we reach end-of-string
   */

  while (!eos()) {
    value = advance();

    if (value === '\u0000') {
      continue;
    }

    /**
     * Escaped characters
     */

    if (value === '\\') {
      const next = peek();

      if (next === '/' && opts.bash !== true) {
        continue;
      }

      if (next === '.' || next === ';') {
        continue;
      }

      if (!next) {
        value += '\\';
        push({ type: 'text', value });
        continue;
      }

      // collapse slashes to reduce potential for exploits
      const match = /^\\+/.exec(remaining());
      let slashes = 0;

      if (match && match[0].length > 2) {
        slashes = match[0].length;
        state.index += slashes;
        if (slashes % 2 !== 0) {
          value += '\\';
        }
      }

      if (opts.unescape === true) {
        value = advance();
      } else {
        value += advance();
      }

      if (state.brackets === 0) {
        push({ type: 'text', value });
        continue;
      }
    }

    /**
     * If we're inside a regex character class, continue
     * until we reach the closing bracket.
     */

    if (state.brackets > 0 && (value !== ']' || prev.value === '[' || prev.value === '[^')) {
      if (opts.posix !== false && value === ':') {
        const inner = prev.value.slice(1);
        if (inner.includes('[')) {
          prev.posix = true;

          if (inner.includes(':')) {
            const idx = prev.value.lastIndexOf('[');
            const pre = prev.value.slice(0, idx);
            const rest = prev.value.slice(idx + 2);
            const posix = POSIX_REGEX_SOURCE[rest];
            if (posix) {
              prev.value = pre + posix;
              state.backtrack = true;
              advance();

              if (!bos.output && tokens.indexOf(prev) === 1) {
                bos.output = ONE_CHAR;
              }
              continue;
            }
          }
        }
      }

      if ((value === '[' && peek() !== ':') || (value === '-' && peek() === ']')) {
        value = `\\${value}`;
      }

      if (value === ']' && (prev.value === '[' || prev.value === '[^')) {
        value = `\\${value}`;
      }

      if (opts.posix === true && value === '!' && prev.value === '[') {
        value = '^';
      }

      prev.value += value;
      append({ value });
      continue;
    }

    /**
     * If we're inside a quoted string, continue
     * until we reach the closing double quote.
     */

    if (state.quotes === 1 && value !== '"') {
      value = utils$6.escapeRegex(value);
      prev.value += value;
      append({ value });
      continue;
    }

    /**
     * Double quotes
     */

    if (value === '"') {
      state.quotes = state.quotes === 1 ? 0 : 1;
      if (opts.keepQuotes === true) {
        push({ type: 'text', value });
      }
      continue;
    }

    /**
     * Parentheses
     */

    if (value === '(') {
      increment('parens');
      push({ type: 'paren', value });
      continue;
    }

    if (value === ')') {
      if (state.parens === 0 && opts.strictBrackets === true) {
        throw new SyntaxError(syntaxError('opening', '('));
      }

      const extglob = extglobs[extglobs.length - 1];
      if (extglob && state.parens === extglob.parens + 1) {
        extglobClose(extglobs.pop());
        continue;
      }

      push({ type: 'paren', value, output: state.parens ? ')' : '\\)' });
      decrement('parens');
      continue;
    }

    /**
     * Square brackets
     */

    if (value === '[') {
      if (opts.nobracket === true || !remaining().includes(']')) {
        if (opts.nobracket !== true && opts.strictBrackets === true) {
          throw new SyntaxError(syntaxError('closing', ']'));
        }

        value = `\\${value}`;
      } else {
        increment('brackets');
      }

      push({ type: 'bracket', value });
      continue;
    }

    if (value === ']') {
      if (opts.nobracket === true || (prev && prev.type === 'bracket' && prev.value.length === 1)) {
        push({ type: 'text', value, output: `\\${value}` });
        continue;
      }

      if (state.brackets === 0) {
        if (opts.strictBrackets === true) {
          throw new SyntaxError(syntaxError('opening', '['));
        }

        push({ type: 'text', value, output: `\\${value}` });
        continue;
      }

      decrement('brackets');

      const prevValue = prev.value.slice(1);
      if (prev.posix !== true && prevValue[0] === '^' && !prevValue.includes('/')) {
        value = `/${value}`;
      }

      prev.value += value;
      append({ value });

      // when literal brackets are explicitly disabled
      // assume we should match with a regex character class
      if (opts.literalBrackets === false || utils$6.hasRegexChars(prevValue)) {
        continue;
      }

      const escaped = utils$6.escapeRegex(prev.value);
      state.output = state.output.slice(0, -prev.value.length);

      // when literal brackets are explicitly enabled
      // assume we should escape the brackets to match literal characters
      if (opts.literalBrackets === true) {
        state.output += escaped;
        prev.value = escaped;
        continue;
      }

      // when the user specifies nothing, try to match both
      prev.value = `(${capture}${escaped}|${prev.value})`;
      state.output += prev.value;
      continue;
    }

    /**
     * Braces
     */

    if (value === '{' && opts.nobrace !== true) {
      increment('braces');

      const open = {
        type: 'brace',
        value,
        output: '(',
        outputIndex: state.output.length,
        tokensIndex: state.tokens.length
      };

      braces.push(open);
      push(open);
      continue;
    }

    if (value === '}') {
      const brace = braces[braces.length - 1];

      if (opts.nobrace === true || !brace) {
        push({ type: 'text', value, output: value });
        continue;
      }

      let output = ')';

      if (brace.dots === true) {
        const arr = tokens.slice();
        const range = [];

        for (let i = arr.length - 1; i >= 0; i--) {
          tokens.pop();
          if (arr[i].type === 'brace') {
            break;
          }
          if (arr[i].type !== 'dots') {
            range.unshift(arr[i].value);
          }
        }

        output = expandRange(range, opts);
        state.backtrack = true;
      }

      if (brace.comma !== true && brace.dots !== true) {
        const out = state.output.slice(0, brace.outputIndex);
        const toks = state.tokens.slice(brace.tokensIndex);
        brace.value = brace.output = '\\{';
        value = output = '\\}';
        state.output = out;
        for (const t of toks) {
          state.output += (t.output || t.value);
        }
      }

      push({ type: 'brace', value, output });
      decrement('braces');
      braces.pop();
      continue;
    }

    /**
     * Pipes
     */

    if (value === '|') {
      if (extglobs.length > 0) {
        extglobs[extglobs.length - 1].conditions++;
      }
      push({ type: 'text', value });
      continue;
    }

    /**
     * Commas
     */

    if (value === ',') {
      let output = value;

      const brace = braces[braces.length - 1];
      if (brace && stack[stack.length - 1] === 'braces') {
        brace.comma = true;
        output = '|';
      }

      push({ type: 'comma', value, output });
      continue;
    }

    /**
     * Slashes
     */

    if (value === '/') {
      // if the beginning of the glob is "./", advance the start
      // to the current index, and don't add the "./" characters
      // to the state. This greatly simplifies lookbehinds when
      // checking for BOS characters like "!" and "." (not "./")
      if (prev.type === 'dot' && state.index === state.start + 1) {
        state.start = state.index + 1;
        state.consumed = '';
        state.output = '';
        tokens.pop();
        prev = bos; // reset "prev" to the first token
        continue;
      }

      push({ type: 'slash', value, output: SLASH_LITERAL });
      continue;
    }

    /**
     * Dots
     */

    if (value === '.') {
      if (state.braces > 0 && prev.type === 'dot') {
        if (prev.value === '.') prev.output = DOT_LITERAL;
        const brace = braces[braces.length - 1];
        prev.type = 'dots';
        prev.output += value;
        prev.value += value;
        brace.dots = true;
        continue;
      }

      if ((state.braces + state.parens) === 0 && prev.type !== 'bos' && prev.type !== 'slash') {
        push({ type: 'text', value, output: DOT_LITERAL });
        continue;
      }

      push({ type: 'dot', value, output: DOT_LITERAL });
      continue;
    }

    /**
     * Question marks
     */

    if (value === '?') {
      const isGroup = prev && prev.value === '(';
      if (!isGroup && opts.noextglob !== true && peek() === '(' && peek(2) !== '?') {
        extglobOpen('qmark', value);
        continue;
      }

      if (prev && prev.type === 'paren') {
        const next = peek();
        let output = value;

        if ((prev.value === '(' && !/[!=<:]/.test(next)) || (next === '<' && !/<([!=]|\w+>)/.test(remaining()))) {
          output = `\\${value}`;
        }

        push({ type: 'text', value, output });
        continue;
      }

      if (opts.dot !== true && (prev.type === 'slash' || prev.type === 'bos')) {
        push({ type: 'qmark', value, output: QMARK_NO_DOT });
        continue;
      }

      push({ type: 'qmark', value, output: QMARK });
      continue;
    }

    /**
     * Exclamation
     */

    if (value === '!') {
      if (opts.noextglob !== true && peek() === '(') {
        if (peek(2) !== '?' || !/[!=<:]/.test(peek(3))) {
          extglobOpen('negate', value);
          continue;
        }
      }

      if (opts.nonegate !== true && state.index === 0) {
        negate();
        continue;
      }
    }

    /**
     * Plus
     */

    if (value === '+') {
      if (opts.noextglob !== true && peek() === '(' && peek(2) !== '?') {
        extglobOpen('plus', value);
        continue;
      }

      if ((prev && prev.value === '(') || opts.regex === false) {
        push({ type: 'plus', value, output: PLUS_LITERAL });
        continue;
      }

      if ((prev && (prev.type === 'bracket' || prev.type === 'paren' || prev.type === 'brace')) || state.parens > 0) {
        push({ type: 'plus', value });
        continue;
      }

      push({ type: 'plus', value: PLUS_LITERAL });
      continue;
    }

    /**
     * Plain text
     */

    if (value === '@') {
      if (opts.noextglob !== true && peek() === '(' && peek(2) !== '?') {
        push({ type: 'at', extglob: true, value, output: '' });
        continue;
      }

      push({ type: 'text', value });
      continue;
    }

    /**
     * Plain text
     */

    if (value !== '*') {
      if (value === '$' || value === '^') {
        value = `\\${value}`;
      }

      const match = REGEX_NON_SPECIAL_CHARS.exec(remaining());
      if (match) {
        value += match[0];
        state.index += match[0].length;
      }

      push({ type: 'text', value });
      continue;
    }

    /**
     * Stars
     */

    if (prev && (prev.type === 'globstar' || prev.star === true)) {
      prev.type = 'star';
      prev.star = true;
      prev.value += value;
      prev.output = star;
      state.backtrack = true;
      state.globstar = true;
      consume(value);
      continue;
    }

    let rest = remaining();
    if (opts.noextglob !== true && /^\([^?]/.test(rest)) {
      extglobOpen('star', value);
      continue;
    }

    if (prev.type === 'star') {
      if (opts.noglobstar === true) {
        consume(value);
        continue;
      }

      const prior = prev.prev;
      const before = prior.prev;
      const isStart = prior.type === 'slash' || prior.type === 'bos';
      const afterStar = before && (before.type === 'star' || before.type === 'globstar');

      if (opts.bash === true && (!isStart || (rest[0] && rest[0] !== '/'))) {
        push({ type: 'star', value, output: '' });
        continue;
      }

      const isBrace = state.braces > 0 && (prior.type === 'comma' || prior.type === 'brace');
      const isExtglob = extglobs.length && (prior.type === 'pipe' || prior.type === 'paren');
      if (!isStart && prior.type !== 'paren' && !isBrace && !isExtglob) {
        push({ type: 'star', value, output: '' });
        continue;
      }

      // strip consecutive `/**/`
      while (rest.slice(0, 3) === '/**') {
        const after = input[state.index + 4];
        if (after && after !== '/') {
          break;
        }
        rest = rest.slice(3);
        consume('/**', 3);
      }

      if (prior.type === 'bos' && eos()) {
        prev.type = 'globstar';
        prev.value += value;
        prev.output = globstar(opts);
        state.output = prev.output;
        state.globstar = true;
        consume(value);
        continue;
      }

      if (prior.type === 'slash' && prior.prev.type !== 'bos' && !afterStar && eos()) {
        state.output = state.output.slice(0, -(prior.output + prev.output).length);
        prior.output = `(?:${prior.output}`;

        prev.type = 'globstar';
        prev.output = globstar(opts) + (opts.strictSlashes ? ')' : '|$)');
        prev.value += value;
        state.globstar = true;
        state.output += prior.output + prev.output;
        consume(value);
        continue;
      }

      if (prior.type === 'slash' && prior.prev.type !== 'bos' && rest[0] === '/') {
        const end = rest[1] !== void 0 ? '|$' : '';

        state.output = state.output.slice(0, -(prior.output + prev.output).length);
        prior.output = `(?:${prior.output}`;

        prev.type = 'globstar';
        prev.output = `${globstar(opts)}${SLASH_LITERAL}|${SLASH_LITERAL}${end})`;
        prev.value += value;

        state.output += prior.output + prev.output;
        state.globstar = true;

        consume(value + advance());

        push({ type: 'slash', value: '/', output: '' });
        continue;
      }

      if (prior.type === 'bos' && rest[0] === '/') {
        prev.type = 'globstar';
        prev.value += value;
        prev.output = `(?:^|${SLASH_LITERAL}|${globstar(opts)}${SLASH_LITERAL})`;
        state.output = prev.output;
        state.globstar = true;
        consume(value + advance());
        push({ type: 'slash', value: '/', output: '' });
        continue;
      }

      // remove single star from output
      state.output = state.output.slice(0, -prev.output.length);

      // reset previous token to globstar
      prev.type = 'globstar';
      prev.output = globstar(opts);
      prev.value += value;

      // reset output with globstar
      state.output += prev.output;
      state.globstar = true;
      consume(value);
      continue;
    }

    const token = { type: 'star', value, output: star };

    if (opts.bash === true) {
      token.output = '.*?';
      if (prev.type === 'bos' || prev.type === 'slash') {
        token.output = nodot + token.output;
      }
      push(token);
      continue;
    }

    if (prev && (prev.type === 'bracket' || prev.type === 'paren') && opts.regex === true) {
      token.output = value;
      push(token);
      continue;
    }

    if (state.index === state.start || prev.type === 'slash' || prev.type === 'dot') {
      if (prev.type === 'dot') {
        state.output += NO_DOT_SLASH;
        prev.output += NO_DOT_SLASH;

      } else if (opts.dot === true) {
        state.output += NO_DOTS_SLASH;
        prev.output += NO_DOTS_SLASH;

      } else {
        state.output += nodot;
        prev.output += nodot;
      }

      if (peek() !== '*') {
        state.output += ONE_CHAR;
        prev.output += ONE_CHAR;
      }
    }

    push(token);
  }

  while (state.brackets > 0) {
    if (opts.strictBrackets === true) throw new SyntaxError(syntaxError('closing', ']'));
    state.output = utils$6.escapeLast(state.output, '[');
    decrement('brackets');
  }

  while (state.parens > 0) {
    if (opts.strictBrackets === true) throw new SyntaxError(syntaxError('closing', ')'));
    state.output = utils$6.escapeLast(state.output, '(');
    decrement('parens');
  }

  while (state.braces > 0) {
    if (opts.strictBrackets === true) throw new SyntaxError(syntaxError('closing', '}'));
    state.output = utils$6.escapeLast(state.output, '{');
    decrement('braces');
  }

  if (opts.strictSlashes !== true && (prev.type === 'star' || prev.type === 'bracket')) {
    push({ type: 'maybe_slash', value: '', output: `${SLASH_LITERAL}?` });
  }

  // rebuild the output if we had to backtrack at any point
  if (state.backtrack === true) {
    state.output = '';

    for (const token of state.tokens) {
      state.output += token.output != null ? token.output : token.value;

      if (token.suffix) {
        state.output += token.suffix;
      }
    }
  }

  return state;
};

/**
 * Fast paths for creating regular expressions for common glob patterns.
 * This can significantly speed up processing and has very little downside
 * impact when none of the fast paths match.
 */

parse$3.fastpaths = (input, options) => {
  const opts = { ...options };
  const max = typeof opts.maxLength === 'number' ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
  const len = input.length;
  if (len > max) {
    throw new SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
  }

  input = REPLACEMENTS[input] || input;

  // create constants based on platform, for windows or posix
  const {
    DOT_LITERAL,
    SLASH_LITERAL,
    ONE_CHAR,
    DOTS_SLASH,
    NO_DOT,
    NO_DOTS,
    NO_DOTS_SLASH,
    STAR,
    START_ANCHOR
  } = constants$1.globChars(opts.windows);

  const nodot = opts.dot ? NO_DOTS : NO_DOT;
  const slashDot = opts.dot ? NO_DOTS_SLASH : NO_DOT;
  const capture = opts.capture ? '' : '?:';
  const state = { negated: false, prefix: '' };
  let star = opts.bash === true ? '.*?' : STAR;

  if (opts.capture) {
    star = `(${star})`;
  }

  const globstar = opts => {
    if (opts.noglobstar === true) return star;
    return `(${capture}(?:(?!${START_ANCHOR}${opts.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`;
  };

  const create = str => {
    switch (str) {
      case '*':
        return `${nodot}${ONE_CHAR}${star}`;

      case '.*':
        return `${DOT_LITERAL}${ONE_CHAR}${star}`;

      case '*.*':
        return `${nodot}${star}${DOT_LITERAL}${ONE_CHAR}${star}`;

      case '*/*':
        return `${nodot}${star}${SLASH_LITERAL}${ONE_CHAR}${slashDot}${star}`;

      case '**':
        return nodot + globstar(opts);

      case '**/*':
        return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${slashDot}${ONE_CHAR}${star}`;

      case '**/*.*':
        return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${slashDot}${star}${DOT_LITERAL}${ONE_CHAR}${star}`;

      case '**/.*':
        return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${DOT_LITERAL}${ONE_CHAR}${star}`;

      default: {
        const match = /^(.*?)\.(\w+)$/.exec(str);
        if (!match) return;

        const source = create(match[1]);
        if (!source) return;

        return source + DOT_LITERAL + match[2];
      }
    }
  };

  const output = utils$6.removePrefix(input, state);
  let source = create(output);

  if (source && opts.strictSlashes !== true) {
    source += `${SLASH_LITERAL}?`;
  }

  return source;
};

var parse_1 = parse$3;

const scan = scan_1;
const parse$2 = parse_1;
const utils$5 = utils$8;
const constants = constants$2;
const isObject$2 = val => val && typeof val === 'object' && !Array.isArray(val);

/**
 * Creates a matcher function from one or more glob patterns. The
 * returned function takes a string to match as its first argument,
 * and returns true if the string is a match. The returned matcher
 * function also takes a boolean as the second argument that, when true,
 * returns an object with additional information.
 *
 * ```js
 * const picomatch = require('picomatch');
 * // picomatch(glob[, options]);
 *
 * const isMatch = picomatch('*.!(*a)');
 * console.log(isMatch('a.a')); //=> false
 * console.log(isMatch('a.b')); //=> true
 * ```
 * @name picomatch
 * @param {String|Array} `globs` One or more glob patterns.
 * @param {Object=} `options`
 * @return {Function=} Returns a matcher function.
 * @api public
 */

const picomatch$2 = (glob, options, returnState = false) => {
  if (Array.isArray(glob)) {
    const fns = glob.map(input => picomatch$2(input, options, returnState));
    const arrayMatcher = str => {
      for (const isMatch of fns) {
        const state = isMatch(str);
        if (state) return state;
      }
      return false;
    };
    return arrayMatcher;
  }

  const isState = isObject$2(glob) && glob.tokens && glob.input;

  if (glob === '' || (typeof glob !== 'string' && !isState)) {
    throw new TypeError('Expected pattern to be a non-empty string');
  }

  const opts = options || {};
  const posix = opts.windows;
  const regex = isState
    ? picomatch$2.compileRe(glob, options)
    : picomatch$2.makeRe(glob, options, false, true);

  const state = regex.state;
  delete regex.state;

  let isIgnored = () => false;
  if (opts.ignore) {
    const ignoreOpts = { ...options, ignore: null, onMatch: null, onResult: null };
    isIgnored = picomatch$2(opts.ignore, ignoreOpts, returnState);
  }

  const matcher = (input, returnObject = false) => {
    const { isMatch, match, output } = picomatch$2.test(input, regex, options, { glob, posix });
    const result = { glob, state, regex, posix, input, output, match, isMatch };

    if (typeof opts.onResult === 'function') {
      opts.onResult(result);
    }

    if (isMatch === false) {
      result.isMatch = false;
      return returnObject ? result : false;
    }

    if (isIgnored(input)) {
      if (typeof opts.onIgnore === 'function') {
        opts.onIgnore(result);
      }
      result.isMatch = false;
      return returnObject ? result : false;
    }

    if (typeof opts.onMatch === 'function') {
      opts.onMatch(result);
    }
    return returnObject ? result : true;
  };

  if (returnState) {
    matcher.state = state;
  }

  return matcher;
};

/**
 * Test `input` with the given `regex`. This is used by the main
 * `picomatch()` function to test the input string.
 *
 * ```js
 * const picomatch = require('picomatch');
 * // picomatch.test(input, regex[, options]);
 *
 * console.log(picomatch.test('foo/bar', /^(?:([^/]*?)\/([^/]*?))$/));
 * // { isMatch: true, match: [ 'foo/', 'foo', 'bar' ], output: 'foo/bar' }
 * ```
 * @param {String} `input` String to test.
 * @param {RegExp} `regex`
 * @return {Object} Returns an object with matching info.
 * @api public
 */

picomatch$2.test = (input, regex, options, { glob, posix } = {}) => {
  if (typeof input !== 'string') {
    throw new TypeError('Expected input to be a string');
  }

  if (input === '') {
    return { isMatch: false, output: '' };
  }

  const opts = options || {};
  const format = opts.format || (posix ? utils$5.toPosixSlashes : null);
  let match = input === glob;
  let output = (match && format) ? format(input) : input;

  if (match === false) {
    output = format ? format(input) : input;
    match = output === glob;
  }

  if (match === false || opts.capture === true) {
    if (opts.matchBase === true || opts.basename === true) {
      match = picomatch$2.matchBase(input, regex, options, posix);
    } else {
      match = regex.exec(output);
    }
  }

  return { isMatch: Boolean(match), match, output };
};

/**
 * Match the basename of a filepath.
 *
 * ```js
 * const picomatch = require('picomatch');
 * // picomatch.matchBase(input, glob[, options]);
 * console.log(picomatch.matchBase('foo/bar.js', '*.js'); // true
 * ```
 * @param {String} `input` String to test.
 * @param {RegExp|String} `glob` Glob pattern or regex created by [.makeRe](#makeRe).
 * @return {Boolean}
 * @api public
 */

picomatch$2.matchBase = (input, glob, options) => {
  const regex = glob instanceof RegExp ? glob : picomatch$2.makeRe(glob, options);
  return regex.test(utils$5.basename(input));
};

/**
 * Returns true if **any** of the given glob `patterns` match the specified `string`.
 *
 * ```js
 * const picomatch = require('picomatch');
 * // picomatch.isMatch(string, patterns[, options]);
 *
 * console.log(picomatch.isMatch('a.a', ['b.*', '*.a'])); //=> true
 * console.log(picomatch.isMatch('a.a', 'b.*')); //=> false
 * ```
 * @param {String|Array} str The string to test.
 * @param {String|Array} patterns One or more glob patterns to use for matching.
 * @param {Object} [options] See available [options](#options).
 * @return {Boolean} Returns true if any patterns match `str`
 * @api public
 */

picomatch$2.isMatch = (str, patterns, options) => picomatch$2(patterns, options)(str);

/**
 * Parse a glob pattern to create the source string for a regular
 * expression.
 *
 * ```js
 * const picomatch = require('picomatch');
 * const result = picomatch.parse(pattern[, options]);
 * ```
 * @param {String} `pattern`
 * @param {Object} `options`
 * @return {Object} Returns an object with useful properties and output to be used as a regex source string.
 * @api public
 */

picomatch$2.parse = (pattern, options) => {
  if (Array.isArray(pattern)) return pattern.map(p => picomatch$2.parse(p, options));
  return parse$2(pattern, { ...options, fastpaths: false });
};

/**
 * Scan a glob pattern to separate the pattern into segments.
 *
 * ```js
 * const picomatch = require('picomatch');
 * // picomatch.scan(input[, options]);
 *
 * const result = picomatch.scan('!./foo/*.js');
 * console.log(result);
 * { prefix: '!./',
 *   input: '!./foo/*.js',
 *   start: 3,
 *   base: 'foo',
 *   glob: '*.js',
 *   isBrace: false,
 *   isBracket: false,
 *   isGlob: true,
 *   isExtglob: false,
 *   isGlobstar: false,
 *   negated: true }
 * ```
 * @param {String} `input` Glob pattern to scan.
 * @param {Object} `options`
 * @return {Object} Returns an object with
 * @api public
 */

picomatch$2.scan = (input, options) => scan(input, options);

/**
 * Compile a regular expression from the `state` object returned by the
 * [parse()](#parse) method.
 *
 * @param {Object} `state`
 * @param {Object} `options`
 * @param {Boolean} `returnOutput` Intended for implementors, this argument allows you to return the raw output from the parser.
 * @param {Boolean} `returnState` Adds the state to a `state` property on the returned regex. Useful for implementors and debugging.
 * @return {RegExp}
 * @api public
 */

picomatch$2.compileRe = (state, options, returnOutput = false, returnState = false) => {
  if (returnOutput === true) {
    return state.output;
  }

  const opts = options || {};
  const prepend = opts.contains ? '' : '^';
  const append = opts.contains ? '' : '$';

  let source = `${prepend}(?:${state.output})${append}`;
  if (state && state.negated === true) {
    source = `^(?!${source}).*$`;
  }

  const regex = picomatch$2.toRegex(source, options);
  if (returnState === true) {
    regex.state = state;
  }

  return regex;
};

/**
 * Create a regular expression from a parsed glob pattern.
 *
 * ```js
 * const picomatch = require('picomatch');
 * const state = picomatch.parse('*.js');
 * // picomatch.compileRe(state[, options]);
 *
 * console.log(picomatch.compileRe(state));
 * //=> /^(?:(?!\.)(?=.)[^/]*?\.js)$/
 * ```
 * @param {String} `state` The object returned from the `.parse` method.
 * @param {Object} `options`
 * @param {Boolean} `returnOutput` Implementors may use this argument to return the compiled output, instead of a regular expression. This is not exposed on the options to prevent end-users from mutating the result.
 * @param {Boolean} `returnState` Implementors may use this argument to return the state from the parsed glob with the returned regular expression.
 * @return {RegExp} Returns a regex created from the given pattern.
 * @api public
 */

picomatch$2.makeRe = (input, options = {}, returnOutput = false, returnState = false) => {
  if (!input || typeof input !== 'string') {
    throw new TypeError('Expected a non-empty string');
  }

  let parsed = { negated: false, fastpaths: true };

  if (options.fastpaths !== false && (input[0] === '.' || input[0] === '*')) {
    parsed.output = parse$2.fastpaths(input, options);
  }

  if (!parsed.output) {
    parsed = parse$2(input, options);
  }

  return picomatch$2.compileRe(parsed, options, returnOutput, returnState);
};

/**
 * Create a regular expression from the given regex source string.
 *
 * ```js
 * const picomatch = require('picomatch');
 * // picomatch.toRegex(source[, options]);
 *
 * const { output } = picomatch.parse('*.js');
 * console.log(picomatch.toRegex(output));
 * //=> /^(?:(?!\.)(?=.)[^/]*?\.js)$/
 * ```
 * @param {String} `source` Regular expression source string.
 * @param {Object} `options`
 * @return {RegExp}
 * @api public
 */

picomatch$2.toRegex = (source, options) => {
  try {
    const opts = options || {};
    return new RegExp(source, opts.flags || (opts.nocase ? 'i' : ''));
  } catch (err) {
    if (options && options.debug === true) throw err;
    return /$^/;
  }
};

/**
 * Picomatch constants.
 * @return {Object}
 */

picomatch$2.constants = constants;

/**
 * Expose "picomatch"
 */

var picomatch_1$1 = picomatch$2;

const pico = picomatch_1$1;
const utils$4 = utils$8;

function picomatch(glob, options, returnState = false) {
  // default to os.platform()
  if (options && (options.windows === null || options.windows === undefined)) {
    // don't mutate the original options object
    options = { ...options, windows: utils$4.isWindows() };
  }

  return pico(glob, options, returnState);
}

Object.assign(picomatch, pico);
var picomatch_1 = picomatch;

var picomatch$1 = /*@__PURE__*/getDefaultExportFromCjs(picomatch_1);

var _nodeResolve_empty = {};

var _nodeResolve_empty$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  default: _nodeResolve_empty
});

var require$$0 = /*@__PURE__*/getAugmentedNamespace(_nodeResolve_empty$1);

var toString = Object.prototype.toString;

var kindOf = function kindOf(val) {
  if (val === void 0) return 'undefined';
  if (val === null) return 'null';

  var type = typeof val;
  if (type === 'boolean') return 'boolean';
  if (type === 'string') return 'string';
  if (type === 'number') return 'number';
  if (type === 'symbol') return 'symbol';
  if (type === 'function') {
    return isGeneratorFn(val) ? 'generatorfunction' : 'function';
  }

  if (isArray(val)) return 'array';
  if (isBuffer$1(val)) return 'buffer';
  if (isArguments(val)) return 'arguments';
  if (isDate(val)) return 'date';
  if (isError(val)) return 'error';
  if (isRegexp(val)) return 'regexp';

  switch (ctorName(val)) {
    case 'Symbol': return 'symbol';
    case 'Promise': return 'promise';

    // Set, Map, WeakSet, WeakMap
    case 'WeakMap': return 'weakmap';
    case 'WeakSet': return 'weakset';
    case 'Map': return 'map';
    case 'Set': return 'set';

    // 8-bit typed arrays
    case 'Int8Array': return 'int8array';
    case 'Uint8Array': return 'uint8array';
    case 'Uint8ClampedArray': return 'uint8clampedarray';

    // 16-bit typed arrays
    case 'Int16Array': return 'int16array';
    case 'Uint16Array': return 'uint16array';

    // 32-bit typed arrays
    case 'Int32Array': return 'int32array';
    case 'Uint32Array': return 'uint32array';
    case 'Float32Array': return 'float32array';
    case 'Float64Array': return 'float64array';
  }

  if (isGeneratorObj(val)) {
    return 'generator';
  }

  // Non-plain objects
  type = toString.call(val);
  switch (type) {
    case '[object Object]': return 'object';
    // iterators
    case '[object Map Iterator]': return 'mapiterator';
    case '[object Set Iterator]': return 'setiterator';
    case '[object String Iterator]': return 'stringiterator';
    case '[object Array Iterator]': return 'arrayiterator';
  }

  // other
  return type.slice(8, -1).toLowerCase().replace(/\s/g, '');
};

function ctorName(val) {
  return typeof val.constructor === 'function' ? val.constructor.name : null;
}

function isArray(val) {
  if (Array.isArray) return Array.isArray(val);
  return val instanceof Array;
}

function isError(val) {
  return val instanceof Error || (typeof val.message === 'string' && val.constructor && typeof val.constructor.stackTraceLimit === 'number');
}

function isDate(val) {
  if (val instanceof Date) return true;
  return typeof val.toDateString === 'function'
    && typeof val.getDate === 'function'
    && typeof val.setDate === 'function';
}

function isRegexp(val) {
  if (val instanceof RegExp) return true;
  return typeof val.flags === 'string'
    && typeof val.ignoreCase === 'boolean'
    && typeof val.multiline === 'boolean'
    && typeof val.global === 'boolean';
}

function isGeneratorFn(name, val) {
  return ctorName(name) === 'GeneratorFunction';
}

function isGeneratorObj(val) {
  return typeof val.throw === 'function'
    && typeof val.return === 'function'
    && typeof val.next === 'function';
}

function isArguments(val) {
  try {
    if (typeof val.length === 'number' && typeof val.callee === 'function') {
      return true;
    }
  } catch (err) {
    if (err.message.indexOf('callee') !== -1) {
      return true;
    }
  }
  return false;
}

/**
 * If you need to support Safari 5-7 (8-10 yr-old browser),
 * take a look at https://github.com/feross/is-buffer
 */

function isBuffer$1(val) {
  if (val.constructor && typeof val.constructor.isBuffer === 'function') {
    return val.constructor.isBuffer(val);
  }
  return false;
}

/*!
 * is-extendable <https://github.com/jonschlinkert/is-extendable>
 *
 * Copyright (c) 2015, Jon Schlinkert.
 * Licensed under the MIT License.
 */

var isExtendable = function isExtendable(val) {
  return typeof val !== 'undefined' && val !== null
    && (typeof val === 'object' || typeof val === 'function');
};

var isObject$1 = isExtendable;

var extendShallow = function extend(o/*, objects*/) {
  if (!isObject$1(o)) { o = {}; }

  var len = arguments.length;
  for (var i = 1; i < len; i++) {
    var obj = arguments[i];

    if (isObject$1(obj)) {
      assign(o, obj);
    }
  }
  return o;
};

function assign(a, b) {
  for (var key in b) {
    if (hasOwn(b, key)) {
      a[key] = b[key];
    }
  }
}

/**
 * Returns true if the given `key` is an own property of `obj`.
 */

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

var typeOf$2 = kindOf;
var extend$1 = extendShallow;

/**
 * Parse sections in `input` with the given `options`.
 *
 * ```js
 * var sections = require('{%= name %}');
 * var result = sections(input, options);
 * // { content: 'Content before sections', sections: [] }
 * ```
 * @param {String|Buffer|Object} `input` If input is an object, it's `content` property must be a string or buffer.
 * @param {Object} options
 * @return {Object} Returns an object with a `content` string and an array of `sections` objects.
 * @api public
 */

var sectionMatter = function(input, options) {
  if (typeof options === 'function') {
    options = { parse: options };
  }

  var file = toObject(input);
  var defaults = {section_delimiter: '---', parse: identity};
  var opts = extend$1({}, defaults, options);
  var delim = opts.section_delimiter;
  var lines = file.content.split(/\r?\n/);
  var sections = null;
  var section = createSection();
  var content = [];
  var stack = [];

  function initSections(val) {
    file.content = val;
    sections = [];
    content = [];
  }

  function closeSection(val) {
    if (stack.length) {
      section.key = getKey(stack[0], delim);
      section.content = val;
      opts.parse(section, sections);
      sections.push(section);
      section = createSection();
      content = [];
      stack = [];
    }
  }

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var len = stack.length;
    var ln = line.trim();

    if (isDelimiter(ln, delim)) {
      if (ln.length === 3 && i !== 0) {
        if (len === 0 || len === 2) {
          content.push(line);
          continue;
        }
        stack.push(ln);
        section.data = content.join('\n');
        content = [];
        continue;
      }

      if (sections === null) {
        initSections(content.join('\n'));
      }

      if (len === 2) {
        closeSection(content.join('\n'));
      }

      stack.push(ln);
      continue;
    }

    content.push(line);
  }

  if (sections === null) {
    initSections(content.join('\n'));
  } else {
    closeSection(content.join('\n'));
  }

  file.sections = sections;
  return file;
};

function isDelimiter(line, delim) {
  if (line.slice(0, delim.length) !== delim) {
    return false;
  }
  if (line.charAt(delim.length + 1) === delim.slice(-1)) {
    return false;
  }
  return true;
}

function toObject(input) {
  if (typeOf$2(input) !== 'object') {
    input = { content: input };
  }

  if (typeof input.content !== 'string' && !isBuffer(input.content)) {
    throw new TypeError('expected a buffer or string');
  }

  input.content = input.content.toString();
  input.sections = [];
  return input;
}

function getKey(val, delim) {
  return val ? val.slice(delim.length).trim() : '';
}

function createSection() {
  return { key: '', data: '', content: '' };
}

function identity(val) {
  return val;
}

function isBuffer(val) {
  if (val && val.constructor && typeof val.constructor.isBuffer === 'function') {
    return val.constructor.isBuffer(val);
  }
  return false;
}

var engines$2 = {exports: {}};

var jsYaml$1 = {};

var loader$1 = {};

var common$6 = {};

function isNothing(subject) {
  return (typeof subject === 'undefined') || (subject === null);
}


function isObject(subject) {
  return (typeof subject === 'object') && (subject !== null);
}


function toArray(sequence) {
  if (Array.isArray(sequence)) return sequence;
  else if (isNothing(sequence)) return [];

  return [ sequence ];
}


function extend(target, source) {
  var index, length, key, sourceKeys;

  if (source) {
    sourceKeys = Object.keys(source);

    for (index = 0, length = sourceKeys.length; index < length; index += 1) {
      key = sourceKeys[index];
      target[key] = source[key];
    }
  }

  return target;
}


function repeat(string, count) {
  var result = '', cycle;

  for (cycle = 0; cycle < count; cycle += 1) {
    result += string;
  }

  return result;
}


function isNegativeZero(number) {
  return (number === 0) && (Number.NEGATIVE_INFINITY === 1 / number);
}


common$6.isNothing      = isNothing;
common$6.isObject       = isObject;
common$6.toArray        = toArray;
common$6.repeat         = repeat;
common$6.isNegativeZero = isNegativeZero;
common$6.extend         = extend;

function YAMLException$4(reason, mark) {
  // Super constructor
  Error.call(this);

  this.name = 'YAMLException';
  this.reason = reason;
  this.mark = mark;
  this.message = (this.reason || '(unknown reason)') + (this.mark ? ' ' + this.mark.toString() : '');

  // Include stack trace in error object
  if (Error.captureStackTrace) {
    // Chrome and NodeJS
    Error.captureStackTrace(this, this.constructor);
  } else {
    // FF, IE 10+ and Safari 6+. Fallback for others
    this.stack = (new Error()).stack || '';
  }
}


// Inherit from Error
YAMLException$4.prototype = Object.create(Error.prototype);
YAMLException$4.prototype.constructor = YAMLException$4;


YAMLException$4.prototype.toString = function toString(compact) {
  var result = this.name + ': ';

  result += this.reason || '(unknown reason)';

  if (!compact && this.mark) {
    result += ' ' + this.mark.toString();
  }

  return result;
};


var exception = YAMLException$4;

var common$5 = common$6;


function Mark$1(name, buffer, position, line, column) {
  this.name     = name;
  this.buffer   = buffer;
  this.position = position;
  this.line     = line;
  this.column   = column;
}


Mark$1.prototype.getSnippet = function getSnippet(indent, maxLength) {
  var head, start, tail, end, snippet;

  if (!this.buffer) return null;

  indent = indent || 4;
  maxLength = maxLength || 75;

  head = '';
  start = this.position;

  while (start > 0 && '\x00\r\n\x85\u2028\u2029'.indexOf(this.buffer.charAt(start - 1)) === -1) {
    start -= 1;
    if (this.position - start > (maxLength / 2 - 1)) {
      head = ' ... ';
      start += 5;
      break;
    }
  }

  tail = '';
  end = this.position;

  while (end < this.buffer.length && '\x00\r\n\x85\u2028\u2029'.indexOf(this.buffer.charAt(end)) === -1) {
    end += 1;
    if (end - this.position > (maxLength / 2 - 1)) {
      tail = ' ... ';
      end -= 5;
      break;
    }
  }

  snippet = this.buffer.slice(start, end);

  return common$5.repeat(' ', indent) + head + snippet + tail + '\n' +
         common$5.repeat(' ', indent + this.position - start + head.length) + '^';
};


Mark$1.prototype.toString = function toString(compact) {
  var snippet, where = '';

  if (this.name) {
    where += 'in "' + this.name + '" ';
  }

  where += 'at line ' + (this.line + 1) + ', column ' + (this.column + 1);

  if (!compact) {
    snippet = this.getSnippet();

    if (snippet) {
      where += ':\n' + snippet;
    }
  }

  return where;
};


var mark = Mark$1;

var YAMLException$3 = exception;

var TYPE_CONSTRUCTOR_OPTIONS = [
  'kind',
  'resolve',
  'construct',
  'instanceOf',
  'predicate',
  'represent',
  'defaultStyle',
  'styleAliases'
];

var YAML_NODE_KINDS = [
  'scalar',
  'sequence',
  'mapping'
];

function compileStyleAliases(map) {
  var result = {};

  if (map !== null) {
    Object.keys(map).forEach(function (style) {
      map[style].forEach(function (alias) {
        result[String(alias)] = style;
      });
    });
  }

  return result;
}

function Type$h(tag, options) {
  options = options || {};

  Object.keys(options).forEach(function (name) {
    if (TYPE_CONSTRUCTOR_OPTIONS.indexOf(name) === -1) {
      throw new YAMLException$3('Unknown option "' + name + '" is met in definition of "' + tag + '" YAML type.');
    }
  });

  // TODO: Add tag format check.
  this.tag          = tag;
  this.kind         = options['kind']         || null;
  this.resolve      = options['resolve']      || function () { return true; };
  this.construct    = options['construct']    || function (data) { return data; };
  this.instanceOf   = options['instanceOf']   || null;
  this.predicate    = options['predicate']    || null;
  this.represent    = options['represent']    || null;
  this.defaultStyle = options['defaultStyle'] || null;
  this.styleAliases = compileStyleAliases(options['styleAliases'] || null);

  if (YAML_NODE_KINDS.indexOf(this.kind) === -1) {
    throw new YAMLException$3('Unknown kind "' + this.kind + '" is specified for "' + tag + '" YAML type.');
  }
}

var type = Type$h;

/*eslint-disable max-len*/

var common$4        = common$6;
var YAMLException$2 = exception;
var Type$g          = type;


function compileList(schema, name, result) {
  var exclude = [];

  schema.include.forEach(function (includedSchema) {
    result = compileList(includedSchema, name, result);
  });

  schema[name].forEach(function (currentType) {
    result.forEach(function (previousType, previousIndex) {
      if (previousType.tag === currentType.tag && previousType.kind === currentType.kind) {
        exclude.push(previousIndex);
      }
    });

    result.push(currentType);
  });

  return result.filter(function (type, index) {
    return exclude.indexOf(index) === -1;
  });
}


function compileMap(/* lists... */) {
  var result = {
        scalar: {},
        sequence: {},
        mapping: {},
        fallback: {}
      }, index, length;

  function collectType(type) {
    result[type.kind][type.tag] = result['fallback'][type.tag] = type;
  }

  for (index = 0, length = arguments.length; index < length; index += 1) {
    arguments[index].forEach(collectType);
  }
  return result;
}


function Schema$5(definition) {
  this.include  = definition.include  || [];
  this.implicit = definition.implicit || [];
  this.explicit = definition.explicit || [];

  this.implicit.forEach(function (type) {
    if (type.loadKind && type.loadKind !== 'scalar') {
      throw new YAMLException$2('There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.');
    }
  });

  this.compiledImplicit = compileList(this, 'implicit', []);
  this.compiledExplicit = compileList(this, 'explicit', []);
  this.compiledTypeMap  = compileMap(this.compiledImplicit, this.compiledExplicit);
}


Schema$5.DEFAULT = null;


Schema$5.create = function createSchema() {
  var schemas, types;

  switch (arguments.length) {
    case 1:
      schemas = Schema$5.DEFAULT;
      types = arguments[0];
      break;

    case 2:
      schemas = arguments[0];
      types = arguments[1];
      break;

    default:
      throw new YAMLException$2('Wrong number of arguments for Schema.create function');
  }

  schemas = common$4.toArray(schemas);
  types = common$4.toArray(types);

  if (!schemas.every(function (schema) { return schema instanceof Schema$5; })) {
    throw new YAMLException$2('Specified list of super schemas (or a single Schema object) contains a non-Schema object.');
  }

  if (!types.every(function (type) { return type instanceof Type$g; })) {
    throw new YAMLException$2('Specified list of YAML types (or a single Type object) contains a non-Type object.');
  }

  return new Schema$5({
    include: schemas,
    explicit: types
  });
};


var schema = Schema$5;

var Type$f = type;

var str = new Type$f('tag:yaml.org,2002:str', {
  kind: 'scalar',
  construct: function (data) { return data !== null ? data : ''; }
});

var Type$e = type;

var seq = new Type$e('tag:yaml.org,2002:seq', {
  kind: 'sequence',
  construct: function (data) { return data !== null ? data : []; }
});

var Type$d = type;

var map = new Type$d('tag:yaml.org,2002:map', {
  kind: 'mapping',
  construct: function (data) { return data !== null ? data : {}; }
});

var Schema$4 = schema;


var failsafe = new Schema$4({
  explicit: [
    str,
    seq,
    map
  ]
});

var Type$c = type;

function resolveYamlNull(data) {
  if (data === null) return true;

  var max = data.length;

  return (max === 1 && data === '~') ||
         (max === 4 && (data === 'null' || data === 'Null' || data === 'NULL'));
}

function constructYamlNull() {
  return null;
}

function isNull(object) {
  return object === null;
}

var _null = new Type$c('tag:yaml.org,2002:null', {
  kind: 'scalar',
  resolve: resolveYamlNull,
  construct: constructYamlNull,
  predicate: isNull,
  represent: {
    canonical: function () { return '~';    },
    lowercase: function () { return 'null'; },
    uppercase: function () { return 'NULL'; },
    camelcase: function () { return 'Null'; }
  },
  defaultStyle: 'lowercase'
});

var Type$b = type;

function resolveYamlBoolean(data) {
  if (data === null) return false;

  var max = data.length;

  return (max === 4 && (data === 'true' || data === 'True' || data === 'TRUE')) ||
         (max === 5 && (data === 'false' || data === 'False' || data === 'FALSE'));
}

function constructYamlBoolean(data) {
  return data === 'true' ||
         data === 'True' ||
         data === 'TRUE';
}

function isBoolean(object) {
  return Object.prototype.toString.call(object) === '[object Boolean]';
}

var bool = new Type$b('tag:yaml.org,2002:bool', {
  kind: 'scalar',
  resolve: resolveYamlBoolean,
  construct: constructYamlBoolean,
  predicate: isBoolean,
  represent: {
    lowercase: function (object) { return object ? 'true' : 'false'; },
    uppercase: function (object) { return object ? 'TRUE' : 'FALSE'; },
    camelcase: function (object) { return object ? 'True' : 'False'; }
  },
  defaultStyle: 'lowercase'
});

var common$3 = common$6;
var Type$a   = type;

function isHexCode(c) {
  return ((0x30/* 0 */ <= c) && (c <= 0x39/* 9 */)) ||
         ((0x41/* A */ <= c) && (c <= 0x46/* F */)) ||
         ((0x61/* a */ <= c) && (c <= 0x66/* f */));
}

function isOctCode(c) {
  return ((0x30/* 0 */ <= c) && (c <= 0x37/* 7 */));
}

function isDecCode(c) {
  return ((0x30/* 0 */ <= c) && (c <= 0x39/* 9 */));
}

function resolveYamlInteger(data) {
  if (data === null) return false;

  var max = data.length,
      index = 0,
      hasDigits = false,
      ch;

  if (!max) return false;

  ch = data[index];

  // sign
  if (ch === '-' || ch === '+') {
    ch = data[++index];
  }

  if (ch === '0') {
    // 0
    if (index + 1 === max) return true;
    ch = data[++index];

    // base 2, base 8, base 16

    if (ch === 'b') {
      // base 2
      index++;

      for (; index < max; index++) {
        ch = data[index];
        if (ch === '_') continue;
        if (ch !== '0' && ch !== '1') return false;
        hasDigits = true;
      }
      return hasDigits && ch !== '_';
    }


    if (ch === 'x') {
      // base 16
      index++;

      for (; index < max; index++) {
        ch = data[index];
        if (ch === '_') continue;
        if (!isHexCode(data.charCodeAt(index))) return false;
        hasDigits = true;
      }
      return hasDigits && ch !== '_';
    }

    // base 8
    for (; index < max; index++) {
      ch = data[index];
      if (ch === '_') continue;
      if (!isOctCode(data.charCodeAt(index))) return false;
      hasDigits = true;
    }
    return hasDigits && ch !== '_';
  }

  // base 10 (except 0) or base 60

  // value should not start with `_`;
  if (ch === '_') return false;

  for (; index < max; index++) {
    ch = data[index];
    if (ch === '_') continue;
    if (ch === ':') break;
    if (!isDecCode(data.charCodeAt(index))) {
      return false;
    }
    hasDigits = true;
  }

  // Should have digits and should not end with `_`
  if (!hasDigits || ch === '_') return false;

  // if !base60 - done;
  if (ch !== ':') return true;

  // base60 almost not used, no needs to optimize
  return /^(:[0-5]?[0-9])+$/.test(data.slice(index));
}

function constructYamlInteger(data) {
  var value = data, sign = 1, ch, base, digits = [];

  if (value.indexOf('_') !== -1) {
    value = value.replace(/_/g, '');
  }

  ch = value[0];

  if (ch === '-' || ch === '+') {
    if (ch === '-') sign = -1;
    value = value.slice(1);
    ch = value[0];
  }

  if (value === '0') return 0;

  if (ch === '0') {
    if (value[1] === 'b') return sign * parseInt(value.slice(2), 2);
    if (value[1] === 'x') return sign * parseInt(value, 16);
    return sign * parseInt(value, 8);
  }

  if (value.indexOf(':') !== -1) {
    value.split(':').forEach(function (v) {
      digits.unshift(parseInt(v, 10));
    });

    value = 0;
    base = 1;

    digits.forEach(function (d) {
      value += (d * base);
      base *= 60;
    });

    return sign * value;

  }

  return sign * parseInt(value, 10);
}

function isInteger(object) {
  return (Object.prototype.toString.call(object)) === '[object Number]' &&
         (object % 1 === 0 && !common$3.isNegativeZero(object));
}

var int = new Type$a('tag:yaml.org,2002:int', {
  kind: 'scalar',
  resolve: resolveYamlInteger,
  construct: constructYamlInteger,
  predicate: isInteger,
  represent: {
    binary:      function (obj) { return obj >= 0 ? '0b' + obj.toString(2) : '-0b' + obj.toString(2).slice(1); },
    octal:       function (obj) { return obj >= 0 ? '0'  + obj.toString(8) : '-0'  + obj.toString(8).slice(1); },
    decimal:     function (obj) { return obj.toString(10); },
    /* eslint-disable max-len */
    hexadecimal: function (obj) { return obj >= 0 ? '0x' + obj.toString(16).toUpperCase() :  '-0x' + obj.toString(16).toUpperCase().slice(1); }
  },
  defaultStyle: 'decimal',
  styleAliases: {
    binary:      [ 2,  'bin' ],
    octal:       [ 8,  'oct' ],
    decimal:     [ 10, 'dec' ],
    hexadecimal: [ 16, 'hex' ]
  }
});

var common$2 = common$6;
var Type$9   = type;

var YAML_FLOAT_PATTERN = new RegExp(
  // 2.5e4, 2.5 and integers
  '^(?:[-+]?(?:0|[1-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?' +
  // .2e4, .2
  // special case, seems not from spec
  '|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?' +
  // 20:59
  '|[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\\.[0-9_]*' +
  // .inf
  '|[-+]?\\.(?:inf|Inf|INF)' +
  // .nan
  '|\\.(?:nan|NaN|NAN))$');

function resolveYamlFloat(data) {
  if (data === null) return false;

  if (!YAML_FLOAT_PATTERN.test(data) ||
      // Quick hack to not allow integers end with `_`
      // Probably should update regexp & check speed
      data[data.length - 1] === '_') {
    return false;
  }

  return true;
}

function constructYamlFloat(data) {
  var value, sign, base, digits;

  value  = data.replace(/_/g, '').toLowerCase();
  sign   = value[0] === '-' ? -1 : 1;
  digits = [];

  if ('+-'.indexOf(value[0]) >= 0) {
    value = value.slice(1);
  }

  if (value === '.inf') {
    return (sign === 1) ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;

  } else if (value === '.nan') {
    return NaN;

  } else if (value.indexOf(':') >= 0) {
    value.split(':').forEach(function (v) {
      digits.unshift(parseFloat(v, 10));
    });

    value = 0.0;
    base = 1;

    digits.forEach(function (d) {
      value += d * base;
      base *= 60;
    });

    return sign * value;

  }
  return sign * parseFloat(value, 10);
}


var SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;

function representYamlFloat(object, style) {
  var res;

  if (isNaN(object)) {
    switch (style) {
      case 'lowercase': return '.nan';
      case 'uppercase': return '.NAN';
      case 'camelcase': return '.NaN';
    }
  } else if (Number.POSITIVE_INFINITY === object) {
    switch (style) {
      case 'lowercase': return '.inf';
      case 'uppercase': return '.INF';
      case 'camelcase': return '.Inf';
    }
  } else if (Number.NEGATIVE_INFINITY === object) {
    switch (style) {
      case 'lowercase': return '-.inf';
      case 'uppercase': return '-.INF';
      case 'camelcase': return '-.Inf';
    }
  } else if (common$2.isNegativeZero(object)) {
    return '-0.0';
  }

  res = object.toString(10);

  // JS stringifier can build scientific format without dots: 5e-100,
  // while YAML requres dot: 5.e-100. Fix it with simple hack

  return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace('e', '.e') : res;
}

function isFloat(object) {
  return (Object.prototype.toString.call(object) === '[object Number]') &&
         (object % 1 !== 0 || common$2.isNegativeZero(object));
}

var float = new Type$9('tag:yaml.org,2002:float', {
  kind: 'scalar',
  resolve: resolveYamlFloat,
  construct: constructYamlFloat,
  predicate: isFloat,
  represent: representYamlFloat,
  defaultStyle: 'lowercase'
});

var Schema$3 = schema;


var json = new Schema$3({
  include: [
    failsafe
  ],
  implicit: [
    _null,
    bool,
    int,
    float
  ]
});

var Schema$2 = schema;


var core = new Schema$2({
  include: [
    json
  ]
});

var Type$8 = type;

var YAML_DATE_REGEXP = new RegExp(
  '^([0-9][0-9][0-9][0-9])'          + // [1] year
  '-([0-9][0-9])'                    + // [2] month
  '-([0-9][0-9])$');                   // [3] day

var YAML_TIMESTAMP_REGEXP = new RegExp(
  '^([0-9][0-9][0-9][0-9])'          + // [1] year
  '-([0-9][0-9]?)'                   + // [2] month
  '-([0-9][0-9]?)'                   + // [3] day
  '(?:[Tt]|[ \\t]+)'                 + // ...
  '([0-9][0-9]?)'                    + // [4] hour
  ':([0-9][0-9])'                    + // [5] minute
  ':([0-9][0-9])'                    + // [6] second
  '(?:\\.([0-9]*))?'                 + // [7] fraction
  '(?:[ \\t]*(Z|([-+])([0-9][0-9]?)' + // [8] tz [9] tz_sign [10] tz_hour
  '(?::([0-9][0-9]))?))?$');           // [11] tz_minute

function resolveYamlTimestamp(data) {
  if (data === null) return false;
  if (YAML_DATE_REGEXP.exec(data) !== null) return true;
  if (YAML_TIMESTAMP_REGEXP.exec(data) !== null) return true;
  return false;
}

function constructYamlTimestamp(data) {
  var match, year, month, day, hour, minute, second, fraction = 0,
      delta = null, tz_hour, tz_minute, date;

  match = YAML_DATE_REGEXP.exec(data);
  if (match === null) match = YAML_TIMESTAMP_REGEXP.exec(data);

  if (match === null) throw new Error('Date resolve error');

  // match: [1] year [2] month [3] day

  year = +(match[1]);
  month = +(match[2]) - 1; // JS month starts with 0
  day = +(match[3]);

  if (!match[4]) { // no hour
    return new Date(Date.UTC(year, month, day));
  }

  // match: [4] hour [5] minute [6] second [7] fraction

  hour = +(match[4]);
  minute = +(match[5]);
  second = +(match[6]);

  if (match[7]) {
    fraction = match[7].slice(0, 3);
    while (fraction.length < 3) { // milli-seconds
      fraction += '0';
    }
    fraction = +fraction;
  }

  // match: [8] tz [9] tz_sign [10] tz_hour [11] tz_minute

  if (match[9]) {
    tz_hour = +(match[10]);
    tz_minute = +(match[11] || 0);
    delta = (tz_hour * 60 + tz_minute) * 60000; // delta in mili-seconds
    if (match[9] === '-') delta = -delta;
  }

  date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));

  if (delta) date.setTime(date.getTime() - delta);

  return date;
}

function representYamlTimestamp(object /*, style*/) {
  return object.toISOString();
}

var timestamp = new Type$8('tag:yaml.org,2002:timestamp', {
  kind: 'scalar',
  resolve: resolveYamlTimestamp,
  construct: constructYamlTimestamp,
  instanceOf: Date,
  represent: representYamlTimestamp
});

var Type$7 = type;

function resolveYamlMerge(data) {
  return data === '<<' || data === null;
}

var merge = new Type$7('tag:yaml.org,2002:merge', {
  kind: 'scalar',
  resolve: resolveYamlMerge
});

/*eslint-disable no-bitwise*/

var NodeBuffer;

try {
  // A trick for browserified version, to not include `Buffer` shim
  var _require$1 = commonjsRequire;
  NodeBuffer = _require$1('buffer').Buffer;
} catch (__) {}

var Type$6       = type;


// [ 64, 65, 66 ] -> [ padding, CR, LF ]
var BASE64_MAP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r';


function resolveYamlBinary(data) {
  if (data === null) return false;

  var code, idx, bitlen = 0, max = data.length, map = BASE64_MAP;

  // Convert one by one.
  for (idx = 0; idx < max; idx++) {
    code = map.indexOf(data.charAt(idx));

    // Skip CR/LF
    if (code > 64) continue;

    // Fail on illegal characters
    if (code < 0) return false;

    bitlen += 6;
  }

  // If there are any bits left, source was corrupted
  return (bitlen % 8) === 0;
}

function constructYamlBinary(data) {
  var idx, tailbits,
      input = data.replace(/[\r\n=]/g, ''), // remove CR/LF & padding to simplify scan
      max = input.length,
      map = BASE64_MAP,
      bits = 0,
      result = [];

  // Collect by 6*4 bits (3 bytes)

  for (idx = 0; idx < max; idx++) {
    if ((idx % 4 === 0) && idx) {
      result.push((bits >> 16) & 0xFF);
      result.push((bits >> 8) & 0xFF);
      result.push(bits & 0xFF);
    }

    bits = (bits << 6) | map.indexOf(input.charAt(idx));
  }

  // Dump tail

  tailbits = (max % 4) * 6;

  if (tailbits === 0) {
    result.push((bits >> 16) & 0xFF);
    result.push((bits >> 8) & 0xFF);
    result.push(bits & 0xFF);
  } else if (tailbits === 18) {
    result.push((bits >> 10) & 0xFF);
    result.push((bits >> 2) & 0xFF);
  } else if (tailbits === 12) {
    result.push((bits >> 4) & 0xFF);
  }

  // Wrap into Buffer for NodeJS and leave Array for browser
  if (NodeBuffer) {
    // Support node 6.+ Buffer API when available
    return NodeBuffer.from ? NodeBuffer.from(result) : new NodeBuffer(result);
  }

  return result;
}

function representYamlBinary(object /*, style*/) {
  var result = '', bits = 0, idx, tail,
      max = object.length,
      map = BASE64_MAP;

  // Convert every three bytes to 4 ASCII characters.

  for (idx = 0; idx < max; idx++) {
    if ((idx % 3 === 0) && idx) {
      result += map[(bits >> 18) & 0x3F];
      result += map[(bits >> 12) & 0x3F];
      result += map[(bits >> 6) & 0x3F];
      result += map[bits & 0x3F];
    }

    bits = (bits << 8) + object[idx];
  }

  // Dump tail

  tail = max % 3;

  if (tail === 0) {
    result += map[(bits >> 18) & 0x3F];
    result += map[(bits >> 12) & 0x3F];
    result += map[(bits >> 6) & 0x3F];
    result += map[bits & 0x3F];
  } else if (tail === 2) {
    result += map[(bits >> 10) & 0x3F];
    result += map[(bits >> 4) & 0x3F];
    result += map[(bits << 2) & 0x3F];
    result += map[64];
  } else if (tail === 1) {
    result += map[(bits >> 2) & 0x3F];
    result += map[(bits << 4) & 0x3F];
    result += map[64];
    result += map[64];
  }

  return result;
}

function isBinary(object) {
  return NodeBuffer && NodeBuffer.isBuffer(object);
}

var binary = new Type$6('tag:yaml.org,2002:binary', {
  kind: 'scalar',
  resolve: resolveYamlBinary,
  construct: constructYamlBinary,
  predicate: isBinary,
  represent: representYamlBinary
});

var Type$5 = type;

var _hasOwnProperty$3 = Object.prototype.hasOwnProperty;
var _toString$2       = Object.prototype.toString;

function resolveYamlOmap(data) {
  if (data === null) return true;

  var objectKeys = [], index, length, pair, pairKey, pairHasKey,
      object = data;

  for (index = 0, length = object.length; index < length; index += 1) {
    pair = object[index];
    pairHasKey = false;

    if (_toString$2.call(pair) !== '[object Object]') return false;

    for (pairKey in pair) {
      if (_hasOwnProperty$3.call(pair, pairKey)) {
        if (!pairHasKey) pairHasKey = true;
        else return false;
      }
    }

    if (!pairHasKey) return false;

    if (objectKeys.indexOf(pairKey) === -1) objectKeys.push(pairKey);
    else return false;
  }

  return true;
}

function constructYamlOmap(data) {
  return data !== null ? data : [];
}

var omap = new Type$5('tag:yaml.org,2002:omap', {
  kind: 'sequence',
  resolve: resolveYamlOmap,
  construct: constructYamlOmap
});

var Type$4 = type;

var _toString$1 = Object.prototype.toString;

function resolveYamlPairs(data) {
  if (data === null) return true;

  var index, length, pair, keys, result,
      object = data;

  result = new Array(object.length);

  for (index = 0, length = object.length; index < length; index += 1) {
    pair = object[index];

    if (_toString$1.call(pair) !== '[object Object]') return false;

    keys = Object.keys(pair);

    if (keys.length !== 1) return false;

    result[index] = [ keys[0], pair[keys[0]] ];
  }

  return true;
}

function constructYamlPairs(data) {
  if (data === null) return [];

  var index, length, pair, keys, result,
      object = data;

  result = new Array(object.length);

  for (index = 0, length = object.length; index < length; index += 1) {
    pair = object[index];

    keys = Object.keys(pair);

    result[index] = [ keys[0], pair[keys[0]] ];
  }

  return result;
}

var pairs = new Type$4('tag:yaml.org,2002:pairs', {
  kind: 'sequence',
  resolve: resolveYamlPairs,
  construct: constructYamlPairs
});

var Type$3 = type;

var _hasOwnProperty$2 = Object.prototype.hasOwnProperty;

function resolveYamlSet(data) {
  if (data === null) return true;

  var key, object = data;

  for (key in object) {
    if (_hasOwnProperty$2.call(object, key)) {
      if (object[key] !== null) return false;
    }
  }

  return true;
}

function constructYamlSet(data) {
  return data !== null ? data : {};
}

var set = new Type$3('tag:yaml.org,2002:set', {
  kind: 'mapping',
  resolve: resolveYamlSet,
  construct: constructYamlSet
});

var Schema$1 = schema;


var default_safe = new Schema$1({
  include: [
    core
  ],
  implicit: [
    timestamp,
    merge
  ],
  explicit: [
    binary,
    omap,
    pairs,
    set
  ]
});

var Type$2 = type;

function resolveJavascriptUndefined() {
  return true;
}

function constructJavascriptUndefined() {
  /*eslint-disable no-undefined*/
  return undefined;
}

function representJavascriptUndefined() {
  return '';
}

function isUndefined(object) {
  return typeof object === 'undefined';
}

var _undefined = new Type$2('tag:yaml.org,2002:js/undefined', {
  kind: 'scalar',
  resolve: resolveJavascriptUndefined,
  construct: constructJavascriptUndefined,
  predicate: isUndefined,
  represent: representJavascriptUndefined
});

var Type$1 = type;

function resolveJavascriptRegExp(data) {
  if (data === null) return false;
  if (data.length === 0) return false;

  var regexp = data,
      tail   = /\/([gim]*)$/.exec(data),
      modifiers = '';

  // if regexp starts with '/' it can have modifiers and must be properly closed
  // `/foo/gim` - modifiers tail can be maximum 3 chars
  if (regexp[0] === '/') {
    if (tail) modifiers = tail[1];

    if (modifiers.length > 3) return false;
    // if expression starts with /, is should be properly terminated
    if (regexp[regexp.length - modifiers.length - 1] !== '/') return false;
  }

  return true;
}

function constructJavascriptRegExp(data) {
  var regexp = data,
      tail   = /\/([gim]*)$/.exec(data),
      modifiers = '';

  // `/foo/gim` - tail can be maximum 4 chars
  if (regexp[0] === '/') {
    if (tail) modifiers = tail[1];
    regexp = regexp.slice(1, regexp.length - modifiers.length - 1);
  }

  return new RegExp(regexp, modifiers);
}

function representJavascriptRegExp(object /*, style*/) {
  var result = '/' + object.source + '/';

  if (object.global) result += 'g';
  if (object.multiline) result += 'm';
  if (object.ignoreCase) result += 'i';

  return result;
}

function isRegExp(object) {
  return Object.prototype.toString.call(object) === '[object RegExp]';
}

var regexp = new Type$1('tag:yaml.org,2002:js/regexp', {
  kind: 'scalar',
  resolve: resolveJavascriptRegExp,
  construct: constructJavascriptRegExp,
  predicate: isRegExp,
  represent: representJavascriptRegExp
});

var esprima;

// Browserified version does not have esprima
//
// 1. For node.js just require module as deps
// 2. For browser try to require mudule via external AMD system.
//    If not found - try to fallback to window.esprima. If not
//    found too - then fail to parse.
//
try {
  // workaround to exclude package from browserify list.
  var _require = commonjsRequire;
  esprima = _require('esprima');
} catch (_) {
  /* eslint-disable no-redeclare */
  /* global window */
  if (typeof window !== 'undefined') esprima = window.esprima;
}

var Type = type;

function resolveJavascriptFunction(data) {
  if (data === null) return false;

  try {
    var source = '(' + data + ')',
        ast    = esprima.parse(source, { range: true });

    if (ast.type                    !== 'Program'             ||
        ast.body.length             !== 1                     ||
        ast.body[0].type            !== 'ExpressionStatement' ||
        (ast.body[0].expression.type !== 'ArrowFunctionExpression' &&
          ast.body[0].expression.type !== 'FunctionExpression')) {
      return false;
    }

    return true;
  } catch (err) {
    return false;
  }
}

function constructJavascriptFunction(data) {
  /*jslint evil:true*/

  var source = '(' + data + ')',
      ast    = esprima.parse(source, { range: true }),
      params = [],
      body;

  if (ast.type                    !== 'Program'             ||
      ast.body.length             !== 1                     ||
      ast.body[0].type            !== 'ExpressionStatement' ||
      (ast.body[0].expression.type !== 'ArrowFunctionExpression' &&
        ast.body[0].expression.type !== 'FunctionExpression')) {
    throw new Error('Failed to resolve function');
  }

  ast.body[0].expression.params.forEach(function (param) {
    params.push(param.name);
  });

  body = ast.body[0].expression.body.range;

  // Esprima's ranges include the first '{' and the last '}' characters on
  // function expressions. So cut them out.
  if (ast.body[0].expression.body.type === 'BlockStatement') {
    /*eslint-disable no-new-func*/
    return new Function(params, source.slice(body[0] + 1, body[1] - 1));
  }
  // ES6 arrow functions can omit the BlockStatement. In that case, just return
  // the body.
  /*eslint-disable no-new-func*/
  return new Function(params, 'return ' + source.slice(body[0], body[1]));
}

function representJavascriptFunction(object /*, style*/) {
  return object.toString();
}

function isFunction(object) {
  return Object.prototype.toString.call(object) === '[object Function]';
}

var _function = new Type('tag:yaml.org,2002:js/function', {
  kind: 'scalar',
  resolve: resolveJavascriptFunction,
  construct: constructJavascriptFunction,
  predicate: isFunction,
  represent: representJavascriptFunction
});

var Schema = schema;


var default_full = Schema.DEFAULT = new Schema({
  include: [
    default_safe
  ],
  explicit: [
    _undefined,
    regexp,
    _function
  ]
});

/*eslint-disable max-len,no-use-before-define*/

var common$1              = common$6;
var YAMLException$1       = exception;
var Mark                = mark;
var DEFAULT_SAFE_SCHEMA$1 = default_safe;
var DEFAULT_FULL_SCHEMA$1 = default_full;


var _hasOwnProperty$1 = Object.prototype.hasOwnProperty;


var CONTEXT_FLOW_IN   = 1;
var CONTEXT_FLOW_OUT  = 2;
var CONTEXT_BLOCK_IN  = 3;
var CONTEXT_BLOCK_OUT = 4;


var CHOMPING_CLIP  = 1;
var CHOMPING_STRIP = 2;
var CHOMPING_KEEP  = 3;


var PATTERN_NON_PRINTABLE         = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
var PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
var PATTERN_FLOW_INDICATORS       = /[,\[\]\{\}]/;
var PATTERN_TAG_HANDLE            = /^(?:!|!!|![a-z\-]+!)$/i;
var PATTERN_TAG_URI               = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;


function _class(obj) { return Object.prototype.toString.call(obj); }

function is_EOL(c) {
  return (c === 0x0A/* LF */) || (c === 0x0D/* CR */);
}

function is_WHITE_SPACE(c) {
  return (c === 0x09/* Tab */) || (c === 0x20/* Space */);
}

function is_WS_OR_EOL(c) {
  return (c === 0x09/* Tab */) ||
         (c === 0x20/* Space */) ||
         (c === 0x0A/* LF */) ||
         (c === 0x0D/* CR */);
}

function is_FLOW_INDICATOR(c) {
  return c === 0x2C/* , */ ||
         c === 0x5B/* [ */ ||
         c === 0x5D/* ] */ ||
         c === 0x7B/* { */ ||
         c === 0x7D/* } */;
}

function fromHexCode(c) {
  var lc;

  if ((0x30/* 0 */ <= c) && (c <= 0x39/* 9 */)) {
    return c - 0x30;
  }

  /*eslint-disable no-bitwise*/
  lc = c | 0x20;

  if ((0x61/* a */ <= lc) && (lc <= 0x66/* f */)) {
    return lc - 0x61 + 10;
  }

  return -1;
}

function escapedHexLen(c) {
  if (c === 0x78/* x */) { return 2; }
  if (c === 0x75/* u */) { return 4; }
  if (c === 0x55/* U */) { return 8; }
  return 0;
}

function fromDecimalCode(c) {
  if ((0x30/* 0 */ <= c) && (c <= 0x39/* 9 */)) {
    return c - 0x30;
  }

  return -1;
}

function simpleEscapeSequence(c) {
  /* eslint-disable indent */
  return (c === 0x30/* 0 */) ? '\x00' :
        (c === 0x61/* a */) ? '\x07' :
        (c === 0x62/* b */) ? '\x08' :
        (c === 0x74/* t */) ? '\x09' :
        (c === 0x09/* Tab */) ? '\x09' :
        (c === 0x6E/* n */) ? '\x0A' :
        (c === 0x76/* v */) ? '\x0B' :
        (c === 0x66/* f */) ? '\x0C' :
        (c === 0x72/* r */) ? '\x0D' :
        (c === 0x65/* e */) ? '\x1B' :
        (c === 0x20/* Space */) ? ' ' :
        (c === 0x22/* " */) ? '\x22' :
        (c === 0x2F/* / */) ? '/' :
        (c === 0x5C/* \ */) ? '\x5C' :
        (c === 0x4E/* N */) ? '\x85' :
        (c === 0x5F/* _ */) ? '\xA0' :
        (c === 0x4C/* L */) ? '\u2028' :
        (c === 0x50/* P */) ? '\u2029' : '';
}

function charFromCodepoint(c) {
  if (c <= 0xFFFF) {
    return String.fromCharCode(c);
  }
  // Encode UTF-16 surrogate pair
  // https://en.wikipedia.org/wiki/UTF-16#Code_points_U.2B010000_to_U.2B10FFFF
  return String.fromCharCode(
    ((c - 0x010000) >> 10) + 0xD800,
    ((c - 0x010000) & 0x03FF) + 0xDC00
  );
}

// set a property of a literal object, while protecting against prototype pollution,
// see https://github.com/nodeca/js-yaml/issues/164 for more details
function setProperty(object, key, value) {
  // used for this specific key only because Object.defineProperty is slow
  if (key === '__proto__') {
    Object.defineProperty(object, key, {
      configurable: true,
      enumerable: true,
      writable: true,
      value: value
    });
  } else {
    object[key] = value;
  }
}

var simpleEscapeCheck = new Array(256); // integer, for fast access
var simpleEscapeMap = new Array(256);
for (var i = 0; i < 256; i++) {
  simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
  simpleEscapeMap[i] = simpleEscapeSequence(i);
}


function State$1(input, options) {
  this.input = input;

  this.filename  = options['filename']  || null;
  this.schema    = options['schema']    || DEFAULT_FULL_SCHEMA$1;
  this.onWarning = options['onWarning'] || null;
  this.legacy    = options['legacy']    || false;
  this.json      = options['json']      || false;
  this.listener  = options['listener']  || null;

  this.implicitTypes = this.schema.compiledImplicit;
  this.typeMap       = this.schema.compiledTypeMap;

  this.length     = input.length;
  this.position   = 0;
  this.line       = 0;
  this.lineStart  = 0;
  this.lineIndent = 0;

  this.documents = [];

  /*
  this.version;
  this.checkLineBreaks;
  this.tagMap;
  this.anchorMap;
  this.tag;
  this.anchor;
  this.kind;
  this.result;*/

}


function generateError(state, message) {
  return new YAMLException$1(
    message,
    new Mark(state.filename, state.input, state.position, state.line, (state.position - state.lineStart)));
}

function throwError(state, message) {
  throw generateError(state, message);
}

function throwWarning(state, message) {
  if (state.onWarning) {
    state.onWarning.call(null, generateError(state, message));
  }
}


var directiveHandlers = {

  YAML: function handleYamlDirective(state, name, args) {

    var match, major, minor;

    if (state.version !== null) {
      throwError(state, 'duplication of %YAML directive');
    }

    if (args.length !== 1) {
      throwError(state, 'YAML directive accepts exactly one argument');
    }

    match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);

    if (match === null) {
      throwError(state, 'ill-formed argument of the YAML directive');
    }

    major = parseInt(match[1], 10);
    minor = parseInt(match[2], 10);

    if (major !== 1) {
      throwError(state, 'unacceptable YAML version of the document');
    }

    state.version = args[0];
    state.checkLineBreaks = (minor < 2);

    if (minor !== 1 && minor !== 2) {
      throwWarning(state, 'unsupported YAML version of the document');
    }
  },

  TAG: function handleTagDirective(state, name, args) {

    var handle, prefix;

    if (args.length !== 2) {
      throwError(state, 'TAG directive accepts exactly two arguments');
    }

    handle = args[0];
    prefix = args[1];

    if (!PATTERN_TAG_HANDLE.test(handle)) {
      throwError(state, 'ill-formed tag handle (first argument) of the TAG directive');
    }

    if (_hasOwnProperty$1.call(state.tagMap, handle)) {
      throwError(state, 'there is a previously declared suffix for "' + handle + '" tag handle');
    }

    if (!PATTERN_TAG_URI.test(prefix)) {
      throwError(state, 'ill-formed tag prefix (second argument) of the TAG directive');
    }

    state.tagMap[handle] = prefix;
  }
};


function captureSegment(state, start, end, checkJson) {
  var _position, _length, _character, _result;

  if (start < end) {
    _result = state.input.slice(start, end);

    if (checkJson) {
      for (_position = 0, _length = _result.length; _position < _length; _position += 1) {
        _character = _result.charCodeAt(_position);
        if (!(_character === 0x09 ||
              (0x20 <= _character && _character <= 0x10FFFF))) {
          throwError(state, 'expected valid JSON character');
        }
      }
    } else if (PATTERN_NON_PRINTABLE.test(_result)) {
      throwError(state, 'the stream contains non-printable characters');
    }

    state.result += _result;
  }
}

function mergeMappings(state, destination, source, overridableKeys) {
  var sourceKeys, key, index, quantity;

  if (!common$1.isObject(source)) {
    throwError(state, 'cannot merge mappings; the provided source object is unacceptable');
  }

  sourceKeys = Object.keys(source);

  for (index = 0, quantity = sourceKeys.length; index < quantity; index += 1) {
    key = sourceKeys[index];

    if (!_hasOwnProperty$1.call(destination, key)) {
      setProperty(destination, key, source[key]);
      overridableKeys[key] = true;
    }
  }
}

function storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, startLine, startPos) {
  var index, quantity;

  // The output is a plain object here, so keys can only be strings.
  // We need to convert keyNode to a string, but doing so can hang the process
  // (deeply nested arrays that explode exponentially using aliases).
  if (Array.isArray(keyNode)) {
    keyNode = Array.prototype.slice.call(keyNode);

    for (index = 0, quantity = keyNode.length; index < quantity; index += 1) {
      if (Array.isArray(keyNode[index])) {
        throwError(state, 'nested arrays are not supported inside keys');
      }

      if (typeof keyNode === 'object' && _class(keyNode[index]) === '[object Object]') {
        keyNode[index] = '[object Object]';
      }
    }
  }

  // Avoid code execution in load() via toString property
  // (still use its own toString for arrays, timestamps,
  // and whatever user schema extensions happen to have @@toStringTag)
  if (typeof keyNode === 'object' && _class(keyNode) === '[object Object]') {
    keyNode = '[object Object]';
  }


  keyNode = String(keyNode);

  if (_result === null) {
    _result = {};
  }

  if (keyTag === 'tag:yaml.org,2002:merge') {
    if (Array.isArray(valueNode)) {
      for (index = 0, quantity = valueNode.length; index < quantity; index += 1) {
        mergeMappings(state, _result, valueNode[index], overridableKeys);
      }
    } else {
      mergeMappings(state, _result, valueNode, overridableKeys);
    }
  } else {
    if (!state.json &&
        !_hasOwnProperty$1.call(overridableKeys, keyNode) &&
        _hasOwnProperty$1.call(_result, keyNode)) {
      state.line = startLine || state.line;
      state.position = startPos || state.position;
      throwError(state, 'duplicated mapping key');
    }
    setProperty(_result, keyNode, valueNode);
    delete overridableKeys[keyNode];
  }

  return _result;
}

function readLineBreak(state) {
  var ch;

  ch = state.input.charCodeAt(state.position);

  if (ch === 0x0A/* LF */) {
    state.position++;
  } else if (ch === 0x0D/* CR */) {
    state.position++;
    if (state.input.charCodeAt(state.position) === 0x0A/* LF */) {
      state.position++;
    }
  } else {
    throwError(state, 'a line break is expected');
  }

  state.line += 1;
  state.lineStart = state.position;
}

function skipSeparationSpace(state, allowComments, checkIndent) {
  var lineBreaks = 0,
      ch = state.input.charCodeAt(state.position);

  while (ch !== 0) {
    while (is_WHITE_SPACE(ch)) {
      ch = state.input.charCodeAt(++state.position);
    }

    if (allowComments && ch === 0x23/* # */) {
      do {
        ch = state.input.charCodeAt(++state.position);
      } while (ch !== 0x0A/* LF */ && ch !== 0x0D/* CR */ && ch !== 0);
    }

    if (is_EOL(ch)) {
      readLineBreak(state);

      ch = state.input.charCodeAt(state.position);
      lineBreaks++;
      state.lineIndent = 0;

      while (ch === 0x20/* Space */) {
        state.lineIndent++;
        ch = state.input.charCodeAt(++state.position);
      }
    } else {
      break;
    }
  }

  if (checkIndent !== -1 && lineBreaks !== 0 && state.lineIndent < checkIndent) {
    throwWarning(state, 'deficient indentation');
  }

  return lineBreaks;
}

function testDocumentSeparator(state) {
  var _position = state.position,
      ch;

  ch = state.input.charCodeAt(_position);

  // Condition state.position === state.lineStart is tested
  // in parent on each call, for efficiency. No needs to test here again.
  if ((ch === 0x2D/* - */ || ch === 0x2E/* . */) &&
      ch === state.input.charCodeAt(_position + 1) &&
      ch === state.input.charCodeAt(_position + 2)) {

    _position += 3;

    ch = state.input.charCodeAt(_position);

    if (ch === 0 || is_WS_OR_EOL(ch)) {
      return true;
    }
  }

  return false;
}

function writeFoldedLines(state, count) {
  if (count === 1) {
    state.result += ' ';
  } else if (count > 1) {
    state.result += common$1.repeat('\n', count - 1);
  }
}


function readPlainScalar(state, nodeIndent, withinFlowCollection) {
  var preceding,
      following,
      captureStart,
      captureEnd,
      hasPendingContent,
      _line,
      _lineStart,
      _lineIndent,
      _kind = state.kind,
      _result = state.result,
      ch;

  ch = state.input.charCodeAt(state.position);

  if (is_WS_OR_EOL(ch)      ||
      is_FLOW_INDICATOR(ch) ||
      ch === 0x23/* # */    ||
      ch === 0x26/* & */    ||
      ch === 0x2A/* * */    ||
      ch === 0x21/* ! */    ||
      ch === 0x7C/* | */    ||
      ch === 0x3E/* > */    ||
      ch === 0x27/* ' */    ||
      ch === 0x22/* " */    ||
      ch === 0x25/* % */    ||
      ch === 0x40/* @ */    ||
      ch === 0x60/* ` */) {
    return false;
  }

  if (ch === 0x3F/* ? */ || ch === 0x2D/* - */) {
    following = state.input.charCodeAt(state.position + 1);

    if (is_WS_OR_EOL(following) ||
        withinFlowCollection && is_FLOW_INDICATOR(following)) {
      return false;
    }
  }

  state.kind = 'scalar';
  state.result = '';
  captureStart = captureEnd = state.position;
  hasPendingContent = false;

  while (ch !== 0) {
    if (ch === 0x3A/* : */) {
      following = state.input.charCodeAt(state.position + 1);

      if (is_WS_OR_EOL(following) ||
          withinFlowCollection && is_FLOW_INDICATOR(following)) {
        break;
      }

    } else if (ch === 0x23/* # */) {
      preceding = state.input.charCodeAt(state.position - 1);

      if (is_WS_OR_EOL(preceding)) {
        break;
      }

    } else if ((state.position === state.lineStart && testDocumentSeparator(state)) ||
               withinFlowCollection && is_FLOW_INDICATOR(ch)) {
      break;

    } else if (is_EOL(ch)) {
      _line = state.line;
      _lineStart = state.lineStart;
      _lineIndent = state.lineIndent;
      skipSeparationSpace(state, false, -1);

      if (state.lineIndent >= nodeIndent) {
        hasPendingContent = true;
        ch = state.input.charCodeAt(state.position);
        continue;
      } else {
        state.position = captureEnd;
        state.line = _line;
        state.lineStart = _lineStart;
        state.lineIndent = _lineIndent;
        break;
      }
    }

    if (hasPendingContent) {
      captureSegment(state, captureStart, captureEnd, false);
      writeFoldedLines(state, state.line - _line);
      captureStart = captureEnd = state.position;
      hasPendingContent = false;
    }

    if (!is_WHITE_SPACE(ch)) {
      captureEnd = state.position + 1;
    }

    ch = state.input.charCodeAt(++state.position);
  }

  captureSegment(state, captureStart, captureEnd, false);

  if (state.result) {
    return true;
  }

  state.kind = _kind;
  state.result = _result;
  return false;
}

function readSingleQuotedScalar(state, nodeIndent) {
  var ch,
      captureStart, captureEnd;

  ch = state.input.charCodeAt(state.position);

  if (ch !== 0x27/* ' */) {
    return false;
  }

  state.kind = 'scalar';
  state.result = '';
  state.position++;
  captureStart = captureEnd = state.position;

  while ((ch = state.input.charCodeAt(state.position)) !== 0) {
    if (ch === 0x27/* ' */) {
      captureSegment(state, captureStart, state.position, true);
      ch = state.input.charCodeAt(++state.position);

      if (ch === 0x27/* ' */) {
        captureStart = state.position;
        state.position++;
        captureEnd = state.position;
      } else {
        return true;
      }

    } else if (is_EOL(ch)) {
      captureSegment(state, captureStart, captureEnd, true);
      writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
      captureStart = captureEnd = state.position;

    } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
      throwError(state, 'unexpected end of the document within a single quoted scalar');

    } else {
      state.position++;
      captureEnd = state.position;
    }
  }

  throwError(state, 'unexpected end of the stream within a single quoted scalar');
}

function readDoubleQuotedScalar(state, nodeIndent) {
  var captureStart,
      captureEnd,
      hexLength,
      hexResult,
      tmp,
      ch;

  ch = state.input.charCodeAt(state.position);

  if (ch !== 0x22/* " */) {
    return false;
  }

  state.kind = 'scalar';
  state.result = '';
  state.position++;
  captureStart = captureEnd = state.position;

  while ((ch = state.input.charCodeAt(state.position)) !== 0) {
    if (ch === 0x22/* " */) {
      captureSegment(state, captureStart, state.position, true);
      state.position++;
      return true;

    } else if (ch === 0x5C/* \ */) {
      captureSegment(state, captureStart, state.position, true);
      ch = state.input.charCodeAt(++state.position);

      if (is_EOL(ch)) {
        skipSeparationSpace(state, false, nodeIndent);

        // TODO: rework to inline fn with no type cast?
      } else if (ch < 256 && simpleEscapeCheck[ch]) {
        state.result += simpleEscapeMap[ch];
        state.position++;

      } else if ((tmp = escapedHexLen(ch)) > 0) {
        hexLength = tmp;
        hexResult = 0;

        for (; hexLength > 0; hexLength--) {
          ch = state.input.charCodeAt(++state.position);

          if ((tmp = fromHexCode(ch)) >= 0) {
            hexResult = (hexResult << 4) + tmp;

          } else {
            throwError(state, 'expected hexadecimal character');
          }
        }

        state.result += charFromCodepoint(hexResult);

        state.position++;

      } else {
        throwError(state, 'unknown escape sequence');
      }

      captureStart = captureEnd = state.position;

    } else if (is_EOL(ch)) {
      captureSegment(state, captureStart, captureEnd, true);
      writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
      captureStart = captureEnd = state.position;

    } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
      throwError(state, 'unexpected end of the document within a double quoted scalar');

    } else {
      state.position++;
      captureEnd = state.position;
    }
  }

  throwError(state, 'unexpected end of the stream within a double quoted scalar');
}

function readFlowCollection(state, nodeIndent) {
  var readNext = true,
      _line,
      _tag     = state.tag,
      _result,
      _anchor  = state.anchor,
      following,
      terminator,
      isPair,
      isExplicitPair,
      isMapping,
      overridableKeys = {},
      keyNode,
      keyTag,
      valueNode,
      ch;

  ch = state.input.charCodeAt(state.position);

  if (ch === 0x5B/* [ */) {
    terminator = 0x5D;/* ] */
    isMapping = false;
    _result = [];
  } else if (ch === 0x7B/* { */) {
    terminator = 0x7D;/* } */
    isMapping = true;
    _result = {};
  } else {
    return false;
  }

  if (state.anchor !== null) {
    state.anchorMap[state.anchor] = _result;
  }

  ch = state.input.charCodeAt(++state.position);

  while (ch !== 0) {
    skipSeparationSpace(state, true, nodeIndent);

    ch = state.input.charCodeAt(state.position);

    if (ch === terminator) {
      state.position++;
      state.tag = _tag;
      state.anchor = _anchor;
      state.kind = isMapping ? 'mapping' : 'sequence';
      state.result = _result;
      return true;
    } else if (!readNext) {
      throwError(state, 'missed comma between flow collection entries');
    }

    keyTag = keyNode = valueNode = null;
    isPair = isExplicitPair = false;

    if (ch === 0x3F/* ? */) {
      following = state.input.charCodeAt(state.position + 1);

      if (is_WS_OR_EOL(following)) {
        isPair = isExplicitPair = true;
        state.position++;
        skipSeparationSpace(state, true, nodeIndent);
      }
    }

    _line = state.line;
    composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
    keyTag = state.tag;
    keyNode = state.result;
    skipSeparationSpace(state, true, nodeIndent);

    ch = state.input.charCodeAt(state.position);

    if ((isExplicitPair || state.line === _line) && ch === 0x3A/* : */) {
      isPair = true;
      ch = state.input.charCodeAt(++state.position);
      skipSeparationSpace(state, true, nodeIndent);
      composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
      valueNode = state.result;
    }

    if (isMapping) {
      storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode);
    } else if (isPair) {
      _result.push(storeMappingPair(state, null, overridableKeys, keyTag, keyNode, valueNode));
    } else {
      _result.push(keyNode);
    }

    skipSeparationSpace(state, true, nodeIndent);

    ch = state.input.charCodeAt(state.position);

    if (ch === 0x2C/* , */) {
      readNext = true;
      ch = state.input.charCodeAt(++state.position);
    } else {
      readNext = false;
    }
  }

  throwError(state, 'unexpected end of the stream within a flow collection');
}

function readBlockScalar(state, nodeIndent) {
  var captureStart,
      folding,
      chomping       = CHOMPING_CLIP,
      didReadContent = false,
      detectedIndent = false,
      textIndent     = nodeIndent,
      emptyLines     = 0,
      atMoreIndented = false,
      tmp,
      ch;

  ch = state.input.charCodeAt(state.position);

  if (ch === 0x7C/* | */) {
    folding = false;
  } else if (ch === 0x3E/* > */) {
    folding = true;
  } else {
    return false;
  }

  state.kind = 'scalar';
  state.result = '';

  while (ch !== 0) {
    ch = state.input.charCodeAt(++state.position);

    if (ch === 0x2B/* + */ || ch === 0x2D/* - */) {
      if (CHOMPING_CLIP === chomping) {
        chomping = (ch === 0x2B/* + */) ? CHOMPING_KEEP : CHOMPING_STRIP;
      } else {
        throwError(state, 'repeat of a chomping mode identifier');
      }

    } else if ((tmp = fromDecimalCode(ch)) >= 0) {
      if (tmp === 0) {
        throwError(state, 'bad explicit indentation width of a block scalar; it cannot be less than one');
      } else if (!detectedIndent) {
        textIndent = nodeIndent + tmp - 1;
        detectedIndent = true;
      } else {
        throwError(state, 'repeat of an indentation width identifier');
      }

    } else {
      break;
    }
  }

  if (is_WHITE_SPACE(ch)) {
    do { ch = state.input.charCodeAt(++state.position); }
    while (is_WHITE_SPACE(ch));

    if (ch === 0x23/* # */) {
      do { ch = state.input.charCodeAt(++state.position); }
      while (!is_EOL(ch) && (ch !== 0));
    }
  }

  while (ch !== 0) {
    readLineBreak(state);
    state.lineIndent = 0;

    ch = state.input.charCodeAt(state.position);

    while ((!detectedIndent || state.lineIndent < textIndent) &&
           (ch === 0x20/* Space */)) {
      state.lineIndent++;
      ch = state.input.charCodeAt(++state.position);
    }

    if (!detectedIndent && state.lineIndent > textIndent) {
      textIndent = state.lineIndent;
    }

    if (is_EOL(ch)) {
      emptyLines++;
      continue;
    }

    // End of the scalar.
    if (state.lineIndent < textIndent) {

      // Perform the chomping.
      if (chomping === CHOMPING_KEEP) {
        state.result += common$1.repeat('\n', didReadContent ? 1 + emptyLines : emptyLines);
      } else if (chomping === CHOMPING_CLIP) {
        if (didReadContent) { // i.e. only if the scalar is not empty.
          state.result += '\n';
        }
      }

      // Break this `while` cycle and go to the funciton's epilogue.
      break;
    }

    // Folded style: use fancy rules to handle line breaks.
    if (folding) {

      // Lines starting with white space characters (more-indented lines) are not folded.
      if (is_WHITE_SPACE(ch)) {
        atMoreIndented = true;
        // except for the first content line (cf. Example 8.1)
        state.result += common$1.repeat('\n', didReadContent ? 1 + emptyLines : emptyLines);

      // End of more-indented block.
      } else if (atMoreIndented) {
        atMoreIndented = false;
        state.result += common$1.repeat('\n', emptyLines + 1);

      // Just one line break - perceive as the same line.
      } else if (emptyLines === 0) {
        if (didReadContent) { // i.e. only if we have already read some scalar content.
          state.result += ' ';
        }

      // Several line breaks - perceive as different lines.
      } else {
        state.result += common$1.repeat('\n', emptyLines);
      }

    // Literal style: just add exact number of line breaks between content lines.
    } else {
      // Keep all line breaks except the header line break.
      state.result += common$1.repeat('\n', didReadContent ? 1 + emptyLines : emptyLines);
    }

    didReadContent = true;
    detectedIndent = true;
    emptyLines = 0;
    captureStart = state.position;

    while (!is_EOL(ch) && (ch !== 0)) {
      ch = state.input.charCodeAt(++state.position);
    }

    captureSegment(state, captureStart, state.position, false);
  }

  return true;
}

function readBlockSequence(state, nodeIndent) {
  var _line,
      _tag      = state.tag,
      _anchor   = state.anchor,
      _result   = [],
      following,
      detected  = false,
      ch;

  if (state.anchor !== null) {
    state.anchorMap[state.anchor] = _result;
  }

  ch = state.input.charCodeAt(state.position);

  while (ch !== 0) {

    if (ch !== 0x2D/* - */) {
      break;
    }

    following = state.input.charCodeAt(state.position + 1);

    if (!is_WS_OR_EOL(following)) {
      break;
    }

    detected = true;
    state.position++;

    if (skipSeparationSpace(state, true, -1)) {
      if (state.lineIndent <= nodeIndent) {
        _result.push(null);
        ch = state.input.charCodeAt(state.position);
        continue;
      }
    }

    _line = state.line;
    composeNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
    _result.push(state.result);
    skipSeparationSpace(state, true, -1);

    ch = state.input.charCodeAt(state.position);

    if ((state.line === _line || state.lineIndent > nodeIndent) && (ch !== 0)) {
      throwError(state, 'bad indentation of a sequence entry');
    } else if (state.lineIndent < nodeIndent) {
      break;
    }
  }

  if (detected) {
    state.tag = _tag;
    state.anchor = _anchor;
    state.kind = 'sequence';
    state.result = _result;
    return true;
  }
  return false;
}

function readBlockMapping(state, nodeIndent, flowIndent) {
  var following,
      allowCompact,
      _line,
      _pos,
      _tag          = state.tag,
      _anchor       = state.anchor,
      _result       = {},
      overridableKeys = {},
      keyTag        = null,
      keyNode       = null,
      valueNode     = null,
      atExplicitKey = false,
      detected      = false,
      ch;

  if (state.anchor !== null) {
    state.anchorMap[state.anchor] = _result;
  }

  ch = state.input.charCodeAt(state.position);

  while (ch !== 0) {
    following = state.input.charCodeAt(state.position + 1);
    _line = state.line; // Save the current line.
    _pos = state.position;

    //
    // Explicit notation case. There are two separate blocks:
    // first for the key (denoted by "?") and second for the value (denoted by ":")
    //
    if ((ch === 0x3F/* ? */ || ch === 0x3A/* : */) && is_WS_OR_EOL(following)) {

      if (ch === 0x3F/* ? */) {
        if (atExplicitKey) {
          storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null);
          keyTag = keyNode = valueNode = null;
        }

        detected = true;
        atExplicitKey = true;
        allowCompact = true;

      } else if (atExplicitKey) {
        // i.e. 0x3A/* : */ === character after the explicit key.
        atExplicitKey = false;
        allowCompact = true;

      } else {
        throwError(state, 'incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line');
      }

      state.position += 1;
      ch = following;

    //
    // Implicit notation case. Flow-style node as the key first, then ":", and the value.
    //
    } else if (composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) {

      if (state.line === _line) {
        ch = state.input.charCodeAt(state.position);

        while (is_WHITE_SPACE(ch)) {
          ch = state.input.charCodeAt(++state.position);
        }

        if (ch === 0x3A/* : */) {
          ch = state.input.charCodeAt(++state.position);

          if (!is_WS_OR_EOL(ch)) {
            throwError(state, 'a whitespace character is expected after the key-value separator within a block mapping');
          }

          if (atExplicitKey) {
            storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null);
            keyTag = keyNode = valueNode = null;
          }

          detected = true;
          atExplicitKey = false;
          allowCompact = false;
          keyTag = state.tag;
          keyNode = state.result;

        } else if (detected) {
          throwError(state, 'can not read an implicit mapping pair; a colon is missed');

        } else {
          state.tag = _tag;
          state.anchor = _anchor;
          return true; // Keep the result of `composeNode`.
        }

      } else if (detected) {
        throwError(state, 'can not read a block mapping entry; a multiline key may not be an implicit key');

      } else {
        state.tag = _tag;
        state.anchor = _anchor;
        return true; // Keep the result of `composeNode`.
      }

    } else {
      break; // Reading is done. Go to the epilogue.
    }

    //
    // Common reading code for both explicit and implicit notations.
    //
    if (state.line === _line || state.lineIndent > nodeIndent) {
      if (composeNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, allowCompact)) {
        if (atExplicitKey) {
          keyNode = state.result;
        } else {
          valueNode = state.result;
        }
      }

      if (!atExplicitKey) {
        storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _line, _pos);
        keyTag = keyNode = valueNode = null;
      }

      skipSeparationSpace(state, true, -1);
      ch = state.input.charCodeAt(state.position);
    }

    if (state.lineIndent > nodeIndent && (ch !== 0)) {
      throwError(state, 'bad indentation of a mapping entry');
    } else if (state.lineIndent < nodeIndent) {
      break;
    }
  }

  //
  // Epilogue.
  //

  // Special case: last mapping's node contains only the key in explicit notation.
  if (atExplicitKey) {
    storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null);
  }

  // Expose the resulting mapping.
  if (detected) {
    state.tag = _tag;
    state.anchor = _anchor;
    state.kind = 'mapping';
    state.result = _result;
  }

  return detected;
}

function readTagProperty(state) {
  var _position,
      isVerbatim = false,
      isNamed    = false,
      tagHandle,
      tagName,
      ch;

  ch = state.input.charCodeAt(state.position);

  if (ch !== 0x21/* ! */) return false;

  if (state.tag !== null) {
    throwError(state, 'duplication of a tag property');
  }

  ch = state.input.charCodeAt(++state.position);

  if (ch === 0x3C/* < */) {
    isVerbatim = true;
    ch = state.input.charCodeAt(++state.position);

  } else if (ch === 0x21/* ! */) {
    isNamed = true;
    tagHandle = '!!';
    ch = state.input.charCodeAt(++state.position);

  } else {
    tagHandle = '!';
  }

  _position = state.position;

  if (isVerbatim) {
    do { ch = state.input.charCodeAt(++state.position); }
    while (ch !== 0 && ch !== 0x3E/* > */);

    if (state.position < state.length) {
      tagName = state.input.slice(_position, state.position);
      ch = state.input.charCodeAt(++state.position);
    } else {
      throwError(state, 'unexpected end of the stream within a verbatim tag');
    }
  } else {
    while (ch !== 0 && !is_WS_OR_EOL(ch)) {

      if (ch === 0x21/* ! */) {
        if (!isNamed) {
          tagHandle = state.input.slice(_position - 1, state.position + 1);

          if (!PATTERN_TAG_HANDLE.test(tagHandle)) {
            throwError(state, 'named tag handle cannot contain such characters');
          }

          isNamed = true;
          _position = state.position + 1;
        } else {
          throwError(state, 'tag suffix cannot contain exclamation marks');
        }
      }

      ch = state.input.charCodeAt(++state.position);
    }

    tagName = state.input.slice(_position, state.position);

    if (PATTERN_FLOW_INDICATORS.test(tagName)) {
      throwError(state, 'tag suffix cannot contain flow indicator characters');
    }
  }

  if (tagName && !PATTERN_TAG_URI.test(tagName)) {
    throwError(state, 'tag name cannot contain such characters: ' + tagName);
  }

  if (isVerbatim) {
    state.tag = tagName;

  } else if (_hasOwnProperty$1.call(state.tagMap, tagHandle)) {
    state.tag = state.tagMap[tagHandle] + tagName;

  } else if (tagHandle === '!') {
    state.tag = '!' + tagName;

  } else if (tagHandle === '!!') {
    state.tag = 'tag:yaml.org,2002:' + tagName;

  } else {
    throwError(state, 'undeclared tag handle "' + tagHandle + '"');
  }

  return true;
}

function readAnchorProperty(state) {
  var _position,
      ch;

  ch = state.input.charCodeAt(state.position);

  if (ch !== 0x26/* & */) return false;

  if (state.anchor !== null) {
    throwError(state, 'duplication of an anchor property');
  }

  ch = state.input.charCodeAt(++state.position);
  _position = state.position;

  while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
    ch = state.input.charCodeAt(++state.position);
  }

  if (state.position === _position) {
    throwError(state, 'name of an anchor node must contain at least one character');
  }

  state.anchor = state.input.slice(_position, state.position);
  return true;
}

function readAlias(state) {
  var _position, alias,
      ch;

  ch = state.input.charCodeAt(state.position);

  if (ch !== 0x2A/* * */) return false;

  ch = state.input.charCodeAt(++state.position);
  _position = state.position;

  while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
    ch = state.input.charCodeAt(++state.position);
  }

  if (state.position === _position) {
    throwError(state, 'name of an alias node must contain at least one character');
  }

  alias = state.input.slice(_position, state.position);

  if (!_hasOwnProperty$1.call(state.anchorMap, alias)) {
    throwError(state, 'unidentified alias "' + alias + '"');
  }

  state.result = state.anchorMap[alias];
  skipSeparationSpace(state, true, -1);
  return true;
}

function composeNode(state, parentIndent, nodeContext, allowToSeek, allowCompact) {
  var allowBlockStyles,
      allowBlockScalars,
      allowBlockCollections,
      indentStatus = 1, // 1: this>parent, 0: this=parent, -1: this<parent
      atNewLine  = false,
      hasContent = false,
      typeIndex,
      typeQuantity,
      type,
      flowIndent,
      blockIndent;

  if (state.listener !== null) {
    state.listener('open', state);
  }

  state.tag    = null;
  state.anchor = null;
  state.kind   = null;
  state.result = null;

  allowBlockStyles = allowBlockScalars = allowBlockCollections =
    CONTEXT_BLOCK_OUT === nodeContext ||
    CONTEXT_BLOCK_IN  === nodeContext;

  if (allowToSeek) {
    if (skipSeparationSpace(state, true, -1)) {
      atNewLine = true;

      if (state.lineIndent > parentIndent) {
        indentStatus = 1;
      } else if (state.lineIndent === parentIndent) {
        indentStatus = 0;
      } else if (state.lineIndent < parentIndent) {
        indentStatus = -1;
      }
    }
  }

  if (indentStatus === 1) {
    while (readTagProperty(state) || readAnchorProperty(state)) {
      if (skipSeparationSpace(state, true, -1)) {
        atNewLine = true;
        allowBlockCollections = allowBlockStyles;

        if (state.lineIndent > parentIndent) {
          indentStatus = 1;
        } else if (state.lineIndent === parentIndent) {
          indentStatus = 0;
        } else if (state.lineIndent < parentIndent) {
          indentStatus = -1;
        }
      } else {
        allowBlockCollections = false;
      }
    }
  }

  if (allowBlockCollections) {
    allowBlockCollections = atNewLine || allowCompact;
  }

  if (indentStatus === 1 || CONTEXT_BLOCK_OUT === nodeContext) {
    if (CONTEXT_FLOW_IN === nodeContext || CONTEXT_FLOW_OUT === nodeContext) {
      flowIndent = parentIndent;
    } else {
      flowIndent = parentIndent + 1;
    }

    blockIndent = state.position - state.lineStart;

    if (indentStatus === 1) {
      if (allowBlockCollections &&
          (readBlockSequence(state, blockIndent) ||
           readBlockMapping(state, blockIndent, flowIndent)) ||
          readFlowCollection(state, flowIndent)) {
        hasContent = true;
      } else {
        if ((allowBlockScalars && readBlockScalar(state, flowIndent)) ||
            readSingleQuotedScalar(state, flowIndent) ||
            readDoubleQuotedScalar(state, flowIndent)) {
          hasContent = true;

        } else if (readAlias(state)) {
          hasContent = true;

          if (state.tag !== null || state.anchor !== null) {
            throwError(state, 'alias node should not have any properties');
          }

        } else if (readPlainScalar(state, flowIndent, CONTEXT_FLOW_IN === nodeContext)) {
          hasContent = true;

          if (state.tag === null) {
            state.tag = '?';
          }
        }

        if (state.anchor !== null) {
          state.anchorMap[state.anchor] = state.result;
        }
      }
    } else if (indentStatus === 0) {
      // Special case: block sequences are allowed to have same indentation level as the parent.
      // http://www.yaml.org/spec/1.2/spec.html#id2799784
      hasContent = allowBlockCollections && readBlockSequence(state, blockIndent);
    }
  }

  if (state.tag !== null && state.tag !== '!') {
    if (state.tag === '?') {
      // Implicit resolving is not allowed for non-scalar types, and '?'
      // non-specific tag is only automatically assigned to plain scalars.
      //
      // We only need to check kind conformity in case user explicitly assigns '?'
      // tag, for example like this: "!<?> [0]"
      //
      if (state.result !== null && state.kind !== 'scalar') {
        throwError(state, 'unacceptable node kind for !<?> tag; it should be "scalar", not "' + state.kind + '"');
      }

      for (typeIndex = 0, typeQuantity = state.implicitTypes.length; typeIndex < typeQuantity; typeIndex += 1) {
        type = state.implicitTypes[typeIndex];

        if (type.resolve(state.result)) { // `state.result` updated in resolver if matched
          state.result = type.construct(state.result);
          state.tag = type.tag;
          if (state.anchor !== null) {
            state.anchorMap[state.anchor] = state.result;
          }
          break;
        }
      }
    } else if (_hasOwnProperty$1.call(state.typeMap[state.kind || 'fallback'], state.tag)) {
      type = state.typeMap[state.kind || 'fallback'][state.tag];

      if (state.result !== null && type.kind !== state.kind) {
        throwError(state, 'unacceptable node kind for !<' + state.tag + '> tag; it should be "' + type.kind + '", not "' + state.kind + '"');
      }

      if (!type.resolve(state.result)) { // `state.result` updated in resolver if matched
        throwError(state, 'cannot resolve a node with !<' + state.tag + '> explicit tag');
      } else {
        state.result = type.construct(state.result);
        if (state.anchor !== null) {
          state.anchorMap[state.anchor] = state.result;
        }
      }
    } else {
      throwError(state, 'unknown tag !<' + state.tag + '>');
    }
  }

  if (state.listener !== null) {
    state.listener('close', state);
  }
  return state.tag !== null ||  state.anchor !== null || hasContent;
}

function readDocument(state) {
  var documentStart = state.position,
      _position,
      directiveName,
      directiveArgs,
      hasDirectives = false,
      ch;

  state.version = null;
  state.checkLineBreaks = state.legacy;
  state.tagMap = {};
  state.anchorMap = {};

  while ((ch = state.input.charCodeAt(state.position)) !== 0) {
    skipSeparationSpace(state, true, -1);

    ch = state.input.charCodeAt(state.position);

    if (state.lineIndent > 0 || ch !== 0x25/* % */) {
      break;
    }

    hasDirectives = true;
    ch = state.input.charCodeAt(++state.position);
    _position = state.position;

    while (ch !== 0 && !is_WS_OR_EOL(ch)) {
      ch = state.input.charCodeAt(++state.position);
    }

    directiveName = state.input.slice(_position, state.position);
    directiveArgs = [];

    if (directiveName.length < 1) {
      throwError(state, 'directive name must not be less than one character in length');
    }

    while (ch !== 0) {
      while (is_WHITE_SPACE(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }

      if (ch === 0x23/* # */) {
        do { ch = state.input.charCodeAt(++state.position); }
        while (ch !== 0 && !is_EOL(ch));
        break;
      }

      if (is_EOL(ch)) break;

      _position = state.position;

      while (ch !== 0 && !is_WS_OR_EOL(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }

      directiveArgs.push(state.input.slice(_position, state.position));
    }

    if (ch !== 0) readLineBreak(state);

    if (_hasOwnProperty$1.call(directiveHandlers, directiveName)) {
      directiveHandlers[directiveName](state, directiveName, directiveArgs);
    } else {
      throwWarning(state, 'unknown document directive "' + directiveName + '"');
    }
  }

  skipSeparationSpace(state, true, -1);

  if (state.lineIndent === 0 &&
      state.input.charCodeAt(state.position)     === 0x2D/* - */ &&
      state.input.charCodeAt(state.position + 1) === 0x2D/* - */ &&
      state.input.charCodeAt(state.position + 2) === 0x2D/* - */) {
    state.position += 3;
    skipSeparationSpace(state, true, -1);

  } else if (hasDirectives) {
    throwError(state, 'directives end mark is expected');
  }

  composeNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
  skipSeparationSpace(state, true, -1);

  if (state.checkLineBreaks &&
      PATTERN_NON_ASCII_LINE_BREAKS.test(state.input.slice(documentStart, state.position))) {
    throwWarning(state, 'non-ASCII line breaks are interpreted as content');
  }

  state.documents.push(state.result);

  if (state.position === state.lineStart && testDocumentSeparator(state)) {

    if (state.input.charCodeAt(state.position) === 0x2E/* . */) {
      state.position += 3;
      skipSeparationSpace(state, true, -1);
    }
    return;
  }

  if (state.position < (state.length - 1)) {
    throwError(state, 'end of the stream or a document separator is expected');
  } else {
    return;
  }
}


function loadDocuments(input, options) {
  input = String(input);
  options = options || {};

  if (input.length !== 0) {

    // Add tailing `\n` if not exists
    if (input.charCodeAt(input.length - 1) !== 0x0A/* LF */ &&
        input.charCodeAt(input.length - 1) !== 0x0D/* CR */) {
      input += '\n';
    }

    // Strip BOM
    if (input.charCodeAt(0) === 0xFEFF) {
      input = input.slice(1);
    }
  }

  var state = new State$1(input, options);

  var nullpos = input.indexOf('\0');

  if (nullpos !== -1) {
    state.position = nullpos;
    throwError(state, 'null byte is not allowed in input');
  }

  // Use 0 as string terminator. That significantly simplifies bounds check.
  state.input += '\0';

  while (state.input.charCodeAt(state.position) === 0x20/* Space */) {
    state.lineIndent += 1;
    state.position += 1;
  }

  while (state.position < (state.length - 1)) {
    readDocument(state);
  }

  return state.documents;
}


function loadAll(input, iterator, options) {
  if (iterator !== null && typeof iterator === 'object' && typeof options === 'undefined') {
    options = iterator;
    iterator = null;
  }

  var documents = loadDocuments(input, options);

  if (typeof iterator !== 'function') {
    return documents;
  }

  for (var index = 0, length = documents.length; index < length; index += 1) {
    iterator(documents[index]);
  }
}


function load(input, options) {
  var documents = loadDocuments(input, options);

  if (documents.length === 0) {
    /*eslint-disable no-undefined*/
    return undefined;
  } else if (documents.length === 1) {
    return documents[0];
  }
  throw new YAMLException$1('expected a single document in the stream, but found more');
}


function safeLoadAll(input, iterator, options) {
  if (typeof iterator === 'object' && iterator !== null && typeof options === 'undefined') {
    options = iterator;
    iterator = null;
  }

  return loadAll(input, iterator, common$1.extend({ schema: DEFAULT_SAFE_SCHEMA$1 }, options));
}


function safeLoad(input, options) {
  return load(input, common$1.extend({ schema: DEFAULT_SAFE_SCHEMA$1 }, options));
}


loader$1.loadAll     = loadAll;
loader$1.load        = load;
loader$1.safeLoadAll = safeLoadAll;
loader$1.safeLoad    = safeLoad;

var dumper$1 = {};

/*eslint-disable no-use-before-define*/

var common              = common$6;
var YAMLException       = exception;
var DEFAULT_FULL_SCHEMA = default_full;
var DEFAULT_SAFE_SCHEMA = default_safe;

var _toString       = Object.prototype.toString;
var _hasOwnProperty = Object.prototype.hasOwnProperty;

var CHAR_TAB                  = 0x09; /* Tab */
var CHAR_LINE_FEED            = 0x0A; /* LF */
var CHAR_CARRIAGE_RETURN      = 0x0D; /* CR */
var CHAR_SPACE                = 0x20; /* Space */
var CHAR_EXCLAMATION          = 0x21; /* ! */
var CHAR_DOUBLE_QUOTE         = 0x22; /* " */
var CHAR_SHARP                = 0x23; /* # */
var CHAR_PERCENT              = 0x25; /* % */
var CHAR_AMPERSAND            = 0x26; /* & */
var CHAR_SINGLE_QUOTE         = 0x27; /* ' */
var CHAR_ASTERISK             = 0x2A; /* * */
var CHAR_COMMA                = 0x2C; /* , */
var CHAR_MINUS                = 0x2D; /* - */
var CHAR_COLON                = 0x3A; /* : */
var CHAR_EQUALS               = 0x3D; /* = */
var CHAR_GREATER_THAN         = 0x3E; /* > */
var CHAR_QUESTION             = 0x3F; /* ? */
var CHAR_COMMERCIAL_AT        = 0x40; /* @ */
var CHAR_LEFT_SQUARE_BRACKET  = 0x5B; /* [ */
var CHAR_RIGHT_SQUARE_BRACKET = 0x5D; /* ] */
var CHAR_GRAVE_ACCENT         = 0x60; /* ` */
var CHAR_LEFT_CURLY_BRACKET   = 0x7B; /* { */
var CHAR_VERTICAL_LINE        = 0x7C; /* | */
var CHAR_RIGHT_CURLY_BRACKET  = 0x7D; /* } */

var ESCAPE_SEQUENCES = {};

ESCAPE_SEQUENCES[0x00]   = '\\0';
ESCAPE_SEQUENCES[0x07]   = '\\a';
ESCAPE_SEQUENCES[0x08]   = '\\b';
ESCAPE_SEQUENCES[0x09]   = '\\t';
ESCAPE_SEQUENCES[0x0A]   = '\\n';
ESCAPE_SEQUENCES[0x0B]   = '\\v';
ESCAPE_SEQUENCES[0x0C]   = '\\f';
ESCAPE_SEQUENCES[0x0D]   = '\\r';
ESCAPE_SEQUENCES[0x1B]   = '\\e';
ESCAPE_SEQUENCES[0x22]   = '\\"';
ESCAPE_SEQUENCES[0x5C]   = '\\\\';
ESCAPE_SEQUENCES[0x85]   = '\\N';
ESCAPE_SEQUENCES[0xA0]   = '\\_';
ESCAPE_SEQUENCES[0x2028] = '\\L';
ESCAPE_SEQUENCES[0x2029] = '\\P';

var DEPRECATED_BOOLEANS_SYNTAX = [
  'y', 'Y', 'yes', 'Yes', 'YES', 'on', 'On', 'ON',
  'n', 'N', 'no', 'No', 'NO', 'off', 'Off', 'OFF'
];

function compileStyleMap(schema, map) {
  var result, keys, index, length, tag, style, type;

  if (map === null) return {};

  result = {};
  keys = Object.keys(map);

  for (index = 0, length = keys.length; index < length; index += 1) {
    tag = keys[index];
    style = String(map[tag]);

    if (tag.slice(0, 2) === '!!') {
      tag = 'tag:yaml.org,2002:' + tag.slice(2);
    }
    type = schema.compiledTypeMap['fallback'][tag];

    if (type && _hasOwnProperty.call(type.styleAliases, style)) {
      style = type.styleAliases[style];
    }

    result[tag] = style;
  }

  return result;
}

function encodeHex(character) {
  var string, handle, length;

  string = character.toString(16).toUpperCase();

  if (character <= 0xFF) {
    handle = 'x';
    length = 2;
  } else if (character <= 0xFFFF) {
    handle = 'u';
    length = 4;
  } else if (character <= 0xFFFFFFFF) {
    handle = 'U';
    length = 8;
  } else {
    throw new YAMLException('code point within a string may not be greater than 0xFFFFFFFF');
  }

  return '\\' + handle + common.repeat('0', length - string.length) + string;
}

function State(options) {
  this.schema        = options['schema'] || DEFAULT_FULL_SCHEMA;
  this.indent        = Math.max(1, (options['indent'] || 2));
  this.noArrayIndent = options['noArrayIndent'] || false;
  this.skipInvalid   = options['skipInvalid'] || false;
  this.flowLevel     = (common.isNothing(options['flowLevel']) ? -1 : options['flowLevel']);
  this.styleMap      = compileStyleMap(this.schema, options['styles'] || null);
  this.sortKeys      = options['sortKeys'] || false;
  this.lineWidth     = options['lineWidth'] || 80;
  this.noRefs        = options['noRefs'] || false;
  this.noCompatMode  = options['noCompatMode'] || false;
  this.condenseFlow  = options['condenseFlow'] || false;

  this.implicitTypes = this.schema.compiledImplicit;
  this.explicitTypes = this.schema.compiledExplicit;

  this.tag = null;
  this.result = '';

  this.duplicates = [];
  this.usedDuplicates = null;
}

// Indents every line in a string. Empty lines (\n only) are not indented.
function indentString(string, spaces) {
  var ind = common.repeat(' ', spaces),
      position = 0,
      next = -1,
      result = '',
      line,
      length = string.length;

  while (position < length) {
    next = string.indexOf('\n', position);
    if (next === -1) {
      line = string.slice(position);
      position = length;
    } else {
      line = string.slice(position, next + 1);
      position = next + 1;
    }

    if (line.length && line !== '\n') result += ind;

    result += line;
  }

  return result;
}

function generateNextLine(state, level) {
  return '\n' + common.repeat(' ', state.indent * level);
}

function testImplicitResolving(state, str) {
  var index, length, type;

  for (index = 0, length = state.implicitTypes.length; index < length; index += 1) {
    type = state.implicitTypes[index];

    if (type.resolve(str)) {
      return true;
    }
  }

  return false;
}

// [33] s-white ::= s-space | s-tab
function isWhitespace(c) {
  return c === CHAR_SPACE || c === CHAR_TAB;
}

// Returns true if the character can be printed without escaping.
// From YAML 1.2: "any allowed characters known to be non-printable
// should also be escaped. [However,] This isn’t mandatory"
// Derived from nb-char - \t - #x85 - #xA0 - #x2028 - #x2029.
function isPrintable(c) {
  return  (0x00020 <= c && c <= 0x00007E)
      || ((0x000A1 <= c && c <= 0x00D7FF) && c !== 0x2028 && c !== 0x2029)
      || ((0x0E000 <= c && c <= 0x00FFFD) && c !== 0xFEFF /* BOM */)
      ||  (0x10000 <= c && c <= 0x10FFFF);
}

// [34] ns-char ::= nb-char - s-white
// [27] nb-char ::= c-printable - b-char - c-byte-order-mark
// [26] b-char  ::= b-line-feed | b-carriage-return
// [24] b-line-feed       ::=     #xA    /* LF */
// [25] b-carriage-return ::=     #xD    /* CR */
// [3]  c-byte-order-mark ::=     #xFEFF
function isNsChar(c) {
  return isPrintable(c) && !isWhitespace(c)
    // byte-order-mark
    && c !== 0xFEFF
    // b-char
    && c !== CHAR_CARRIAGE_RETURN
    && c !== CHAR_LINE_FEED;
}

// Simplified test for values allowed after the first character in plain style.
function isPlainSafe(c, prev) {
  // Uses a subset of nb-char - c-flow-indicator - ":" - "#"
  // where nb-char ::= c-printable - b-char - c-byte-order-mark.
  return isPrintable(c) && c !== 0xFEFF
    // - c-flow-indicator
    && c !== CHAR_COMMA
    && c !== CHAR_LEFT_SQUARE_BRACKET
    && c !== CHAR_RIGHT_SQUARE_BRACKET
    && c !== CHAR_LEFT_CURLY_BRACKET
    && c !== CHAR_RIGHT_CURLY_BRACKET
    // - ":" - "#"
    // /* An ns-char preceding */ "#"
    && c !== CHAR_COLON
    && ((c !== CHAR_SHARP) || (prev && isNsChar(prev)));
}

// Simplified test for values allowed as the first character in plain style.
function isPlainSafeFirst(c) {
  // Uses a subset of ns-char - c-indicator
  // where ns-char = nb-char - s-white.
  return isPrintable(c) && c !== 0xFEFF
    && !isWhitespace(c) // - s-white
    // - (c-indicator ::=
    // “-” | “?” | “:” | “,” | “[” | “]” | “{” | “}”
    && c !== CHAR_MINUS
    && c !== CHAR_QUESTION
    && c !== CHAR_COLON
    && c !== CHAR_COMMA
    && c !== CHAR_LEFT_SQUARE_BRACKET
    && c !== CHAR_RIGHT_SQUARE_BRACKET
    && c !== CHAR_LEFT_CURLY_BRACKET
    && c !== CHAR_RIGHT_CURLY_BRACKET
    // | “#” | “&” | “*” | “!” | “|” | “=” | “>” | “'” | “"”
    && c !== CHAR_SHARP
    && c !== CHAR_AMPERSAND
    && c !== CHAR_ASTERISK
    && c !== CHAR_EXCLAMATION
    && c !== CHAR_VERTICAL_LINE
    && c !== CHAR_EQUALS
    && c !== CHAR_GREATER_THAN
    && c !== CHAR_SINGLE_QUOTE
    && c !== CHAR_DOUBLE_QUOTE
    // | “%” | “@” | “`”)
    && c !== CHAR_PERCENT
    && c !== CHAR_COMMERCIAL_AT
    && c !== CHAR_GRAVE_ACCENT;
}

// Determines whether block indentation indicator is required.
function needIndentIndicator(string) {
  var leadingSpaceRe = /^\n* /;
  return leadingSpaceRe.test(string);
}

var STYLE_PLAIN   = 1,
    STYLE_SINGLE  = 2,
    STYLE_LITERAL = 3,
    STYLE_FOLDED  = 4,
    STYLE_DOUBLE  = 5;

// Determines which scalar styles are possible and returns the preferred style.
// lineWidth = -1 => no limit.
// Pre-conditions: str.length > 0.
// Post-conditions:
//    STYLE_PLAIN or STYLE_SINGLE => no \n are in the string.
//    STYLE_LITERAL => no lines are suitable for folding (or lineWidth is -1).
//    STYLE_FOLDED => a line > lineWidth and can be folded (and lineWidth != -1).
function chooseScalarStyle(string, singleLineOnly, indentPerLevel, lineWidth, testAmbiguousType) {
  var i;
  var char, prev_char;
  var hasLineBreak = false;
  var hasFoldableLine = false; // only checked if shouldTrackWidth
  var shouldTrackWidth = lineWidth !== -1;
  var previousLineBreak = -1; // count the first line correctly
  var plain = isPlainSafeFirst(string.charCodeAt(0))
          && !isWhitespace(string.charCodeAt(string.length - 1));

  if (singleLineOnly) {
    // Case: no block styles.
    // Check for disallowed characters to rule out plain and single.
    for (i = 0; i < string.length; i++) {
      char = string.charCodeAt(i);
      if (!isPrintable(char)) {
        return STYLE_DOUBLE;
      }
      prev_char = i > 0 ? string.charCodeAt(i - 1) : null;
      plain = plain && isPlainSafe(char, prev_char);
    }
  } else {
    // Case: block styles permitted.
    for (i = 0; i < string.length; i++) {
      char = string.charCodeAt(i);
      if (char === CHAR_LINE_FEED) {
        hasLineBreak = true;
        // Check if any line can be folded.
        if (shouldTrackWidth) {
          hasFoldableLine = hasFoldableLine ||
            // Foldable line = too long, and not more-indented.
            (i - previousLineBreak - 1 > lineWidth &&
             string[previousLineBreak + 1] !== ' ');
          previousLineBreak = i;
        }
      } else if (!isPrintable(char)) {
        return STYLE_DOUBLE;
      }
      prev_char = i > 0 ? string.charCodeAt(i - 1) : null;
      plain = plain && isPlainSafe(char, prev_char);
    }
    // in case the end is missing a \n
    hasFoldableLine = hasFoldableLine || (shouldTrackWidth &&
      (i - previousLineBreak - 1 > lineWidth &&
       string[previousLineBreak + 1] !== ' '));
  }
  // Although every style can represent \n without escaping, prefer block styles
  // for multiline, since they're more readable and they don't add empty lines.
  // Also prefer folding a super-long line.
  if (!hasLineBreak && !hasFoldableLine) {
    // Strings interpretable as another type have to be quoted;
    // e.g. the string 'true' vs. the boolean true.
    return plain && !testAmbiguousType(string)
      ? STYLE_PLAIN : STYLE_SINGLE;
  }
  // Edge case: block indentation indicator can only have one digit.
  if (indentPerLevel > 9 && needIndentIndicator(string)) {
    return STYLE_DOUBLE;
  }
  // At this point we know block styles are valid.
  // Prefer literal style unless we want to fold.
  return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
}

// Note: line breaking/folding is implemented for only the folded style.
// NB. We drop the last trailing newline (if any) of a returned block scalar
//  since the dumper adds its own newline. This always works:
//    • No ending newline => unaffected; already using strip "-" chomping.
//    • Ending newline    => removed then restored.
//  Importantly, this keeps the "+" chomp indicator from gaining an extra line.
function writeScalar(state, string, level, iskey) {
  state.dump = (function () {
    if (string.length === 0) {
      return "''";
    }
    if (!state.noCompatMode &&
        DEPRECATED_BOOLEANS_SYNTAX.indexOf(string) !== -1) {
      return "'" + string + "'";
    }

    var indent = state.indent * Math.max(1, level); // no 0-indent scalars
    // As indentation gets deeper, let the width decrease monotonically
    // to the lower bound min(state.lineWidth, 40).
    // Note that this implies
    //  state.lineWidth ≤ 40 + state.indent: width is fixed at the lower bound.
    //  state.lineWidth > 40 + state.indent: width decreases until the lower bound.
    // This behaves better than a constant minimum width which disallows narrower options,
    // or an indent threshold which causes the width to suddenly increase.
    var lineWidth = state.lineWidth === -1
      ? -1 : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent);

    // Without knowing if keys are implicit/explicit, assume implicit for safety.
    var singleLineOnly = iskey
      // No block styles in flow mode.
      || (state.flowLevel > -1 && level >= state.flowLevel);
    function testAmbiguity(string) {
      return testImplicitResolving(state, string);
    }

    switch (chooseScalarStyle(string, singleLineOnly, state.indent, lineWidth, testAmbiguity)) {
      case STYLE_PLAIN:
        return string;
      case STYLE_SINGLE:
        return "'" + string.replace(/'/g, "''") + "'";
      case STYLE_LITERAL:
        return '|' + blockHeader(string, state.indent)
          + dropEndingNewline(indentString(string, indent));
      case STYLE_FOLDED:
        return '>' + blockHeader(string, state.indent)
          + dropEndingNewline(indentString(foldString(string, lineWidth), indent));
      case STYLE_DOUBLE:
        return '"' + escapeString(string) + '"';
      default:
        throw new YAMLException('impossible error: invalid scalar style');
    }
  }());
}

// Pre-conditions: string is valid for a block scalar, 1 <= indentPerLevel <= 9.
function blockHeader(string, indentPerLevel) {
  var indentIndicator = needIndentIndicator(string) ? String(indentPerLevel) : '';

  // note the special case: the string '\n' counts as a "trailing" empty line.
  var clip =          string[string.length - 1] === '\n';
  var keep = clip && (string[string.length - 2] === '\n' || string === '\n');
  var chomp = keep ? '+' : (clip ? '' : '-');

  return indentIndicator + chomp + '\n';
}

// (See the note for writeScalar.)
function dropEndingNewline(string) {
  return string[string.length - 1] === '\n' ? string.slice(0, -1) : string;
}

// Note: a long line without a suitable break point will exceed the width limit.
// Pre-conditions: every char in str isPrintable, str.length > 0, width > 0.
function foldString(string, width) {
  // In folded style, $k$ consecutive newlines output as $k+1$ newlines—
  // unless they're before or after a more-indented line, or at the very
  // beginning or end, in which case $k$ maps to $k$.
  // Therefore, parse each chunk as newline(s) followed by a content line.
  var lineRe = /(\n+)([^\n]*)/g;

  // first line (possibly an empty line)
  var result = (function () {
    var nextLF = string.indexOf('\n');
    nextLF = nextLF !== -1 ? nextLF : string.length;
    lineRe.lastIndex = nextLF;
    return foldLine(string.slice(0, nextLF), width);
  }());
  // If we haven't reached the first content line yet, don't add an extra \n.
  var prevMoreIndented = string[0] === '\n' || string[0] === ' ';
  var moreIndented;

  // rest of the lines
  var match;
  while ((match = lineRe.exec(string))) {
    var prefix = match[1], line = match[2];
    moreIndented = (line[0] === ' ');
    result += prefix
      + (!prevMoreIndented && !moreIndented && line !== ''
        ? '\n' : '')
      + foldLine(line, width);
    prevMoreIndented = moreIndented;
  }

  return result;
}

// Greedy line breaking.
// Picks the longest line under the limit each time,
// otherwise settles for the shortest line over the limit.
// NB. More-indented lines *cannot* be folded, as that would add an extra \n.
function foldLine(line, width) {
  if (line === '' || line[0] === ' ') return line;

  // Since a more-indented line adds a \n, breaks can't be followed by a space.
  var breakRe = / [^ ]/g; // note: the match index will always be <= length-2.
  var match;
  // start is an inclusive index. end, curr, and next are exclusive.
  var start = 0, end, curr = 0, next = 0;
  var result = '';

  // Invariants: 0 <= start <= length-1.
  //   0 <= curr <= next <= max(0, length-2). curr - start <= width.
  // Inside the loop:
  //   A match implies length >= 2, so curr and next are <= length-2.
  while ((match = breakRe.exec(line))) {
    next = match.index;
    // maintain invariant: curr - start <= width
    if (next - start > width) {
      end = (curr > start) ? curr : next; // derive end <= length-2
      result += '\n' + line.slice(start, end);
      // skip the space that was output as \n
      start = end + 1;                    // derive start <= length-1
    }
    curr = next;
  }

  // By the invariants, start <= length-1, so there is something left over.
  // It is either the whole string or a part starting from non-whitespace.
  result += '\n';
  // Insert a break if the remainder is too long and there is a break available.
  if (line.length - start > width && curr > start) {
    result += line.slice(start, curr) + '\n' + line.slice(curr + 1);
  } else {
    result += line.slice(start);
  }

  return result.slice(1); // drop extra \n joiner
}

// Escapes a double-quoted string.
function escapeString(string) {
  var result = '';
  var char, nextChar;
  var escapeSeq;

  for (var i = 0; i < string.length; i++) {
    char = string.charCodeAt(i);
    // Check for surrogate pairs (reference Unicode 3.0 section "3.7 Surrogates").
    if (char >= 0xD800 && char <= 0xDBFF/* high surrogate */) {
      nextChar = string.charCodeAt(i + 1);
      if (nextChar >= 0xDC00 && nextChar <= 0xDFFF/* low surrogate */) {
        // Combine the surrogate pair and store it escaped.
        result += encodeHex((char - 0xD800) * 0x400 + nextChar - 0xDC00 + 0x10000);
        // Advance index one extra since we already used that char here.
        i++; continue;
      }
    }
    escapeSeq = ESCAPE_SEQUENCES[char];
    result += !escapeSeq && isPrintable(char)
      ? string[i]
      : escapeSeq || encodeHex(char);
  }

  return result;
}

function writeFlowSequence(state, level, object) {
  var _result = '',
      _tag    = state.tag,
      index,
      length;

  for (index = 0, length = object.length; index < length; index += 1) {
    // Write only valid elements.
    if (writeNode(state, level, object[index], false, false)) {
      if (index !== 0) _result += ',' + (!state.condenseFlow ? ' ' : '');
      _result += state.dump;
    }
  }

  state.tag = _tag;
  state.dump = '[' + _result + ']';
}

function writeBlockSequence(state, level, object, compact) {
  var _result = '',
      _tag    = state.tag,
      index,
      length;

  for (index = 0, length = object.length; index < length; index += 1) {
    // Write only valid elements.
    if (writeNode(state, level + 1, object[index], true, true)) {
      if (!compact || index !== 0) {
        _result += generateNextLine(state, level);
      }

      if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
        _result += '-';
      } else {
        _result += '- ';
      }

      _result += state.dump;
    }
  }

  state.tag = _tag;
  state.dump = _result || '[]'; // Empty sequence if no valid values.
}

function writeFlowMapping(state, level, object) {
  var _result       = '',
      _tag          = state.tag,
      objectKeyList = Object.keys(object),
      index,
      length,
      objectKey,
      objectValue,
      pairBuffer;

  for (index = 0, length = objectKeyList.length; index < length; index += 1) {

    pairBuffer = '';
    if (index !== 0) pairBuffer += ', ';

    if (state.condenseFlow) pairBuffer += '"';

    objectKey = objectKeyList[index];
    objectValue = object[objectKey];

    if (!writeNode(state, level, objectKey, false, false)) {
      continue; // Skip this pair because of invalid key;
    }

    if (state.dump.length > 1024) pairBuffer += '? ';

    pairBuffer += state.dump + (state.condenseFlow ? '"' : '') + ':' + (state.condenseFlow ? '' : ' ');

    if (!writeNode(state, level, objectValue, false, false)) {
      continue; // Skip this pair because of invalid value.
    }

    pairBuffer += state.dump;

    // Both key and value are valid.
    _result += pairBuffer;
  }

  state.tag = _tag;
  state.dump = '{' + _result + '}';
}

function writeBlockMapping(state, level, object, compact) {
  var _result       = '',
      _tag          = state.tag,
      objectKeyList = Object.keys(object),
      index,
      length,
      objectKey,
      objectValue,
      explicitPair,
      pairBuffer;

  // Allow sorting keys so that the output file is deterministic
  if (state.sortKeys === true) {
    // Default sorting
    objectKeyList.sort();
  } else if (typeof state.sortKeys === 'function') {
    // Custom sort function
    objectKeyList.sort(state.sortKeys);
  } else if (state.sortKeys) {
    // Something is wrong
    throw new YAMLException('sortKeys must be a boolean or a function');
  }

  for (index = 0, length = objectKeyList.length; index < length; index += 1) {
    pairBuffer = '';

    if (!compact || index !== 0) {
      pairBuffer += generateNextLine(state, level);
    }

    objectKey = objectKeyList[index];
    objectValue = object[objectKey];

    if (!writeNode(state, level + 1, objectKey, true, true, true)) {
      continue; // Skip this pair because of invalid key.
    }

    explicitPair = (state.tag !== null && state.tag !== '?') ||
                   (state.dump && state.dump.length > 1024);

    if (explicitPair) {
      if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
        pairBuffer += '?';
      } else {
        pairBuffer += '? ';
      }
    }

    pairBuffer += state.dump;

    if (explicitPair) {
      pairBuffer += generateNextLine(state, level);
    }

    if (!writeNode(state, level + 1, objectValue, true, explicitPair)) {
      continue; // Skip this pair because of invalid value.
    }

    if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
      pairBuffer += ':';
    } else {
      pairBuffer += ': ';
    }

    pairBuffer += state.dump;

    // Both key and value are valid.
    _result += pairBuffer;
  }

  state.tag = _tag;
  state.dump = _result || '{}'; // Empty mapping if no valid pairs.
}

function detectType(state, object, explicit) {
  var _result, typeList, index, length, type, style;

  typeList = explicit ? state.explicitTypes : state.implicitTypes;

  for (index = 0, length = typeList.length; index < length; index += 1) {
    type = typeList[index];

    if ((type.instanceOf  || type.predicate) &&
        (!type.instanceOf || ((typeof object === 'object') && (object instanceof type.instanceOf))) &&
        (!type.predicate  || type.predicate(object))) {

      state.tag = explicit ? type.tag : '?';

      if (type.represent) {
        style = state.styleMap[type.tag] || type.defaultStyle;

        if (_toString.call(type.represent) === '[object Function]') {
          _result = type.represent(object, style);
        } else if (_hasOwnProperty.call(type.represent, style)) {
          _result = type.represent[style](object, style);
        } else {
          throw new YAMLException('!<' + type.tag + '> tag resolver accepts not "' + style + '" style');
        }

        state.dump = _result;
      }

      return true;
    }
  }

  return false;
}

// Serializes `object` and writes it to global `result`.
// Returns true on success, or false on invalid object.
//
function writeNode(state, level, object, block, compact, iskey) {
  state.tag = null;
  state.dump = object;

  if (!detectType(state, object, false)) {
    detectType(state, object, true);
  }

  var type = _toString.call(state.dump);

  if (block) {
    block = (state.flowLevel < 0 || state.flowLevel > level);
  }

  var objectOrArray = type === '[object Object]' || type === '[object Array]',
      duplicateIndex,
      duplicate;

  if (objectOrArray) {
    duplicateIndex = state.duplicates.indexOf(object);
    duplicate = duplicateIndex !== -1;
  }

  if ((state.tag !== null && state.tag !== '?') || duplicate || (state.indent !== 2 && level > 0)) {
    compact = false;
  }

  if (duplicate && state.usedDuplicates[duplicateIndex]) {
    state.dump = '*ref_' + duplicateIndex;
  } else {
    if (objectOrArray && duplicate && !state.usedDuplicates[duplicateIndex]) {
      state.usedDuplicates[duplicateIndex] = true;
    }
    if (type === '[object Object]') {
      if (block && (Object.keys(state.dump).length !== 0)) {
        writeBlockMapping(state, level, state.dump, compact);
        if (duplicate) {
          state.dump = '&ref_' + duplicateIndex + state.dump;
        }
      } else {
        writeFlowMapping(state, level, state.dump);
        if (duplicate) {
          state.dump = '&ref_' + duplicateIndex + ' ' + state.dump;
        }
      }
    } else if (type === '[object Array]') {
      var arrayLevel = (state.noArrayIndent && (level > 0)) ? level - 1 : level;
      if (block && (state.dump.length !== 0)) {
        writeBlockSequence(state, arrayLevel, state.dump, compact);
        if (duplicate) {
          state.dump = '&ref_' + duplicateIndex + state.dump;
        }
      } else {
        writeFlowSequence(state, arrayLevel, state.dump);
        if (duplicate) {
          state.dump = '&ref_' + duplicateIndex + ' ' + state.dump;
        }
      }
    } else if (type === '[object String]') {
      if (state.tag !== '?') {
        writeScalar(state, state.dump, level, iskey);
      }
    } else {
      if (state.skipInvalid) return false;
      throw new YAMLException('unacceptable kind of an object to dump ' + type);
    }

    if (state.tag !== null && state.tag !== '?') {
      state.dump = '!<' + state.tag + '> ' + state.dump;
    }
  }

  return true;
}

function getDuplicateReferences(object, state) {
  var objects = [],
      duplicatesIndexes = [],
      index,
      length;

  inspectNode(object, objects, duplicatesIndexes);

  for (index = 0, length = duplicatesIndexes.length; index < length; index += 1) {
    state.duplicates.push(objects[duplicatesIndexes[index]]);
  }
  state.usedDuplicates = new Array(length);
}

function inspectNode(object, objects, duplicatesIndexes) {
  var objectKeyList,
      index,
      length;

  if (object !== null && typeof object === 'object') {
    index = objects.indexOf(object);
    if (index !== -1) {
      if (duplicatesIndexes.indexOf(index) === -1) {
        duplicatesIndexes.push(index);
      }
    } else {
      objects.push(object);

      if (Array.isArray(object)) {
        for (index = 0, length = object.length; index < length; index += 1) {
          inspectNode(object[index], objects, duplicatesIndexes);
        }
      } else {
        objectKeyList = Object.keys(object);

        for (index = 0, length = objectKeyList.length; index < length; index += 1) {
          inspectNode(object[objectKeyList[index]], objects, duplicatesIndexes);
        }
      }
    }
  }
}

function dump(input, options) {
  options = options || {};

  var state = new State(options);

  if (!state.noRefs) getDuplicateReferences(input, state);

  if (writeNode(state, 0, input, true, true)) return state.dump + '\n';

  return '';
}

function safeDump(input, options) {
  return dump(input, common.extend({ schema: DEFAULT_SAFE_SCHEMA }, options));
}

dumper$1.dump     = dump;
dumper$1.safeDump = safeDump;

var loader = loader$1;
var dumper = dumper$1;


function deprecated(name) {
  return function () {
    throw new Error('Function ' + name + ' is deprecated and cannot be used.');
  };
}


jsYaml$1.Type                = type;
jsYaml$1.Schema              = schema;
jsYaml$1.FAILSAFE_SCHEMA     = failsafe;
jsYaml$1.JSON_SCHEMA         = json;
jsYaml$1.CORE_SCHEMA         = core;
jsYaml$1.DEFAULT_SAFE_SCHEMA = default_safe;
jsYaml$1.DEFAULT_FULL_SCHEMA = default_full;
jsYaml$1.load                = loader.load;
jsYaml$1.loadAll             = loader.loadAll;
jsYaml$1.safeLoad            = loader.safeLoad;
jsYaml$1.safeLoadAll         = loader.safeLoadAll;
jsYaml$1.dump                = dumper.dump;
jsYaml$1.safeDump            = dumper.safeDump;
jsYaml$1.YAMLException       = exception;

// Deprecated schema names from JS-YAML 2.0.x
jsYaml$1.MINIMAL_SCHEMA = failsafe;
jsYaml$1.SAFE_SCHEMA    = default_safe;
jsYaml$1.DEFAULT_SCHEMA = default_full;

// Deprecated functions from JS-YAML 1.x.x
jsYaml$1.scan           = deprecated('scan');
jsYaml$1.parse          = deprecated('parse');
jsYaml$1.compose        = deprecated('compose');
jsYaml$1.addConstructor = deprecated('addConstructor');

var yaml = jsYaml$1;


var jsYaml = yaml;

engines$2.exports;

(function (module, exports$1) {

	const yaml = jsYaml;

	/**
	 * Default engines
	 */

	const engines = module.exports;

	/**
	 * YAML
	 */

	engines.yaml = {
	  parse: yaml.safeLoad.bind(yaml),
	  stringify: yaml.safeDump.bind(yaml)
	};

	/**
	 * JSON
	 */

	engines.json = {
	  parse: JSON.parse.bind(JSON),
	  stringify: function(obj, options) {
	    const opts = Object.assign({replacer: null, space: 2}, options);
	    return JSON.stringify(obj, opts.replacer, opts.space);
	  }
	};

	/**
	 * JavaScript
	 */

	engines.javascript = {
	  parse: function parse(str, options, wrap) {
	    /* eslint no-eval: 0 */
	    try {
	      if (wrap !== false) {
	        str = '(function() {\nreturn ' + str.trim() + ';\n}());';
	      }
	      return eval(str) || {};
	    } catch (err) {
	      if (wrap !== false && /(unexpected|identifier)/i.test(err.message)) {
	        return parse(str, options, false);
	      }
	      throw new SyntaxError(err);
	    }
	  },
	  stringify: function() {
	    throw new Error('stringifying JavaScript is not supported');
	  }
	}; 
} (engines$2, engines$2.exports));

var enginesExports = engines$2.exports;

var utils$3 = {};

/*!
 * strip-bom-string <https://github.com/jonschlinkert/strip-bom-string>
 *
 * Copyright (c) 2015, 2017, Jon Schlinkert.
 * Released under the MIT License.
 */

var stripBomString = function(str) {
  if (typeof str === 'string' && str.charAt(0) === '\ufeff') {
    return str.slice(1);
  }
  return str;
};

(function (exports$1) {

	const stripBom = stripBomString;
	const typeOf = kindOf;

	exports$1.define = function(obj, key, val) {
	  Reflect.defineProperty(obj, key, {
	    enumerable: false,
	    configurable: true,
	    writable: true,
	    value: val
	  });
	};

	/**
	 * Returns true if `val` is a buffer
	 */

	exports$1.isBuffer = function(val) {
	  return typeOf(val) === 'buffer';
	};

	/**
	 * Returns true if `val` is an object
	 */

	exports$1.isObject = function(val) {
	  return typeOf(val) === 'object';
	};

	/**
	 * Cast `input` to a buffer
	 */

	exports$1.toBuffer = function(input) {
	  return typeof input === 'string' ? Buffer.from(input) : input;
	};

	/**
	 * Cast `val` to a string.
	 */

	exports$1.toString = function(input) {
	  if (exports$1.isBuffer(input)) return stripBom(String(input));
	  if (typeof input !== 'string') {
	    throw new TypeError('expected input to be a string or buffer');
	  }
	  return stripBom(input);
	};

	/**
	 * Cast `val` to an array.
	 */

	exports$1.arrayify = function(val) {
	  return val ? (Array.isArray(val) ? val : [val]) : [];
	};

	/**
	 * Returns true if `str` starts with `substr`.
	 */

	exports$1.startsWith = function(str, substr, len) {
	  if (typeof len !== 'number') len = substr.length;
	  return str.slice(0, len) === substr;
	}; 
} (utils$3));

const engines$1 = enginesExports;
const utils$2 = utils$3;

var defaults$4 = function(options) {
  const opts = Object.assign({}, options);

  // ensure that delimiters are an array
  opts.delimiters = utils$2.arrayify(opts.delims || opts.delimiters || '---');
  if (opts.delimiters.length === 1) {
    opts.delimiters.push(opts.delimiters[0]);
  }

  opts.language = (opts.language || opts.lang || 'yaml').toLowerCase();
  opts.engines = Object.assign({}, engines$1, opts.parsers, opts.engines);
  return opts;
};

var engine = function(name, options) {
  let engine = options.engines[name] || options.engines[aliase(name)];
  if (typeof engine === 'undefined') {
    throw new Error('gray-matter engine "' + name + '" is not registered');
  }
  if (typeof engine === 'function') {
    engine = { parse: engine };
  }
  return engine;
};

function aliase(name) {
  switch (name.toLowerCase()) {
    case 'js':
    case 'javascript':
      return 'javascript';
    case 'coffee':
    case 'coffeescript':
    case 'cson':
      return 'coffee';
    case 'yaml':
    case 'yml':
      return 'yaml';
    default: {
      return name;
    }
  }
}

const typeOf$1 = kindOf;
const getEngine$1 = engine;
const defaults$3 = defaults$4;

var stringify$2 = function(file, data, options) {
  if (data == null && options == null) {
    switch (typeOf$1(file)) {
      case 'object':
        data = file.data;
        options = {};
        break;
      case 'string':
        return file;
      default: {
        throw new TypeError('expected file to be a string or object');
      }
    }
  }

  const str = file.content;
  const opts = defaults$3(options);
  if (data == null) {
    if (!opts.data) return file;
    data = opts.data;
  }

  const language = file.language || opts.language;
  const engine = getEngine$1(language, opts);
  if (typeof engine.stringify !== 'function') {
    throw new TypeError('expected "' + language + '.stringify" to be a function');
  }

  data = Object.assign({}, file.data, data);
  const open = opts.delimiters[0];
  const close = opts.delimiters[1];
  const matter = engine.stringify(data, options).trim();
  let buf = '';

  if (matter !== '{}') {
    buf = newline(open) + newline(matter) + newline(close);
  }

  if (typeof file.excerpt === 'string' && file.excerpt !== '') {
    if (str.indexOf(file.excerpt.trim()) === -1) {
      buf += newline(file.excerpt) + newline(close);
    }
  }

  return buf + newline(str);
};

function newline(str) {
  return str.slice(-1) !== '\n' ? str + '\n' : str;
}

const defaults$2 = defaults$4;

var excerpt$1 = function(file, options) {
  const opts = defaults$2(options);

  if (file.data == null) {
    file.data = {};
  }

  if (typeof opts.excerpt === 'function') {
    return opts.excerpt(file, opts);
  }

  const sep = file.data.excerpt_separator || opts.excerpt_separator;
  if (sep == null && (opts.excerpt === false || opts.excerpt == null)) {
    return file;
  }

  const delimiter = typeof opts.excerpt === 'string'
    ? opts.excerpt
    : (sep || opts.delimiters[0]);

  // if enabled, get the excerpt defined after front-matter
  const idx = file.content.indexOf(delimiter);
  if (idx !== -1) {
    file.excerpt = file.content.slice(0, idx);
  }

  return file;
};

const typeOf = kindOf;
const stringify$1 = stringify$2;
const utils$1 = utils$3;

/**
 * Normalize the given value to ensure an object is returned
 * with the expected properties.
 */

var toFile$1 = function(file) {
  if (typeOf(file) !== 'object') {
    file = { content: file };
  }

  if (typeOf(file.data) !== 'object') {
    file.data = {};
  }

  // if file was passed as an object, ensure that
  // "file.content" is set
  if (file.contents && file.content == null) {
    file.content = file.contents;
  }

  // set non-enumerable properties on the file object
  utils$1.define(file, 'orig', utils$1.toBuffer(file.content));
  utils$1.define(file, 'language', file.language || '');
  utils$1.define(file, 'matter', file.matter || '');
  utils$1.define(file, 'stringify', function(data, options) {
    if (options && options.language) {
      file.language = options.language;
    }
    return stringify$1(file, data, options);
  });

  // strip BOM and ensure that "file.content" is a string
  file.content = utils$1.toString(file.content);
  file.isEmpty = false;
  file.excerpt = '';
  return file;
};

const getEngine = engine;
const defaults$1 = defaults$4;

var parse$1 = function(language, str, options) {
  const opts = defaults$1(options);
  const engine = getEngine(language, opts);
  if (typeof engine.parse !== 'function') {
    throw new TypeError('expected "' + language + '.parse" to be a function');
  }
  return engine.parse(str, opts);
};

const fs = require$$0;
const sections = sectionMatter;
const defaults = defaults$4;
const stringify = stringify$2;
const excerpt = excerpt$1;
const engines = enginesExports;
const toFile = toFile$1;
const parse = parse$1;
const utils = utils$3;

/**
 * Takes a string or object with `content` property, extracts
 * and parses front-matter from the string, then returns an object
 * with `data`, `content` and other [useful properties](#returned-object).
 *
 * ```js
 * const matter = require('gray-matter');
 * console.log(matter('---\ntitle: Home\n---\nOther stuff'));
 * //=> { data: { title: 'Home'}, content: 'Other stuff' }
 * ```
 * @param {Object|String} `input` String, or object with `content` string
 * @param {Object} `options`
 * @return {Object}
 * @api public
 */

function matter(input, options) {
  if (input === '') {
    return { data: {}, content: input, excerpt: '', orig: input };
  }

  let file = toFile(input);
  const cached = matter.cache[file.content];

  if (!options) {
    if (cached) {
      file = Object.assign({}, cached);
      file.orig = cached.orig;
      return file;
    }

    // only cache if there are no options passed. if we cache when options
    // are passed, we would need to also cache options values, which would
    // negate any performance benefits of caching
    matter.cache[file.content] = file;
  }

  return parseMatter(file, options);
}

/**
 * Parse front matter
 */

function parseMatter(file, options) {
  const opts = defaults(options);
  const open = opts.delimiters[0];
  const close = '\n' + opts.delimiters[1];
  let str = file.content;

  if (opts.language) {
    file.language = opts.language;
  }

  // get the length of the opening delimiter
  const openLen = open.length;
  if (!utils.startsWith(str, open, openLen)) {
    excerpt(file, opts);
    return file;
  }

  // if the next character after the opening delimiter is
  // a character from the delimiter, then it's not a front-
  // matter delimiter
  if (str.charAt(openLen) === open.slice(-1)) {
    return file;
  }

  // strip the opening delimiter
  str = str.slice(openLen);
  const len = str.length;

  // use the language defined after first delimiter, if it exists
  const language = matter.language(str, opts);
  if (language.name) {
    file.language = language.name;
    str = str.slice(language.raw.length);
  }

  // get the index of the closing delimiter
  let closeIndex = str.indexOf(close);
  if (closeIndex === -1) {
    closeIndex = len;
  }

  // get the raw front-matter block
  file.matter = str.slice(0, closeIndex);

  const block = file.matter.replace(/^\s*#[^\n]+/gm, '').trim();
  if (block === '') {
    file.isEmpty = true;
    file.empty = file.content;
    file.data = {};
  } else {

    // create file.data by parsing the raw file.matter block
    file.data = parse(file.language, file.matter, opts);
  }

  // update file.content
  if (closeIndex === len) {
    file.content = '';
  } else {
    file.content = str.slice(closeIndex + close.length);
    if (file.content[0] === '\r') {
      file.content = file.content.slice(1);
    }
    if (file.content[0] === '\n') {
      file.content = file.content.slice(1);
    }
  }

  excerpt(file, opts);

  if (opts.sections === true || typeof opts.section === 'function') {
    sections(file, opts.section);
  }
  return file;
}

/**
 * Expose engines
 */

matter.engines = engines;

/**
 * Stringify an object to YAML or the specified language, and
 * append it to the given string. By default, only YAML and JSON
 * can be stringified. See the [engines](#engines) section to learn
 * how to stringify other languages.
 *
 * ```js
 * console.log(matter.stringify('foo bar baz', {title: 'Home'}));
 * // results in:
 * // ---
 * // title: Home
 * // ---
 * // foo bar baz
 * ```
 * @param {String|Object} `file` The content string to append to stringified front-matter, or a file object with `file.content` string.
 * @param {Object} `data` Front matter to stringify.
 * @param {Object} `options` [Options](#options) to pass to gray-matter and [js-yaml].
 * @return {String} Returns a string created by wrapping stringified yaml with delimiters, and appending that to the given string.
 * @api public
 */

matter.stringify = function(file, data, options) {
  if (typeof file === 'string') file = matter(file, options);
  return stringify(file, data, options);
};

/**
 * Synchronously read a file from the file system and parse
 * front matter. Returns the same object as the [main function](#matter).
 *
 * ```js
 * const file = matter.read('./content/blog-post.md');
 * ```
 * @param {String} `filepath` file path of the file to read.
 * @param {Object} `options` [Options](#options) to pass to gray-matter.
 * @return {Object} Returns [an object](#returned-object) with `data` and `content`
 * @api public
 */

matter.read = function(filepath, options) {
  const str = fs.readFileSync(filepath, 'utf8');
  const file = matter(str, options);
  file.path = filepath;
  return file;
};

/**
 * Returns true if the given `string` has front matter.
 * @param  {String} `string`
 * @param  {Object} `options`
 * @return {Boolean} True if front matter exists.
 * @api public
 */

matter.test = function(str, options) {
  return utils.startsWith(str, defaults(options).delimiters[0]);
};

/**
 * Detect the language to use, if one is defined after the
 * first front-matter delimiter.
 * @param  {String} `string`
 * @param  {Object} `options`
 * @return {Object} Object with `raw` (actual language string), and `name`, the language with whitespace trimmed
 */

matter.language = function(str, options) {
  const opts = defaults(options);
  const open = opts.delimiters[0];

  if (matter.test(str)) {
    str = str.slice(open.length);
  }

  const language = str.slice(0, str.search(/\r?\n/));
  return {
    raw: language,
    name: language ? language.trim() : ''
  };
};

/**
 * Expose `matter`
 */

matter.cache = {};
matter.clearCache = function() {
  matter.cache = {};
};

var ignore$1 = {exports: {}};

ignore$1.exports;

(function (module) {
	// A simple implementation of make-array
	function makeArray (subject) {
	  return Array.isArray(subject)
	    ? subject
	    : [subject]
	}

	const UNDEFINED = undefined;
	const EMPTY = '';
	const SPACE = ' ';
	const ESCAPE = '\\';
	const REGEX_TEST_BLANK_LINE = /^\s+$/;
	const REGEX_INVALID_TRAILING_BACKSLASH = /(?:[^\\]|^)\\$/;
	const REGEX_REPLACE_LEADING_EXCAPED_EXCLAMATION = /^\\!/;
	const REGEX_REPLACE_LEADING_EXCAPED_HASH = /^\\#/;
	const REGEX_SPLITALL_CRLF = /\r?\n/g;

	// Invalid:
	// - /foo,
	// - ./foo,
	// - ../foo,
	// - .
	// - ..
	// Valid:
	// - .foo
	const REGEX_TEST_INVALID_PATH = /^\.{0,2}\/|^\.{1,2}$/;

	const REGEX_TEST_TRAILING_SLASH = /\/$/;

	const SLASH = '/';

	// Do not use ternary expression here, since "istanbul ignore next" is buggy
	let TMP_KEY_IGNORE = 'node-ignore';
	/* istanbul ignore else */
	if (typeof Symbol !== 'undefined') {
	  TMP_KEY_IGNORE = Symbol.for('node-ignore');
	}
	const KEY_IGNORE = TMP_KEY_IGNORE;

	const define = (object, key, value) => {
	  Object.defineProperty(object, key, {value});
	  return value
	};

	const REGEX_REGEXP_RANGE = /([0-z])-([0-z])/g;

	const RETURN_FALSE = () => false;

	// Sanitize the range of a regular expression
	// The cases are complicated, see test cases for details
	const sanitizeRange = range => range.replace(
	  REGEX_REGEXP_RANGE,
	  (match, from, to) => from.charCodeAt(0) <= to.charCodeAt(0)
	    ? match
	    // Invalid range (out of order) which is ok for gitignore rules but
	    //   fatal for JavaScript regular expression, so eliminate it.
	    : EMPTY
	);

	// See fixtures #59
	const cleanRangeBackSlash = slashes => {
	  const {length} = slashes;
	  return slashes.slice(0, length - length % 2)
	};

	// > If the pattern ends with a slash,
	// > it is removed for the purpose of the following description,
	// > but it would only find a match with a directory.
	// > In other words, foo/ will match a directory foo and paths underneath it,
	// > but will not match a regular file or a symbolic link foo
	// >  (this is consistent with the way how pathspec works in general in Git).
	// '`foo/`' will not match regular file '`foo`' or symbolic link '`foo`'
	// -> ignore-rules will not deal with it, because it costs extra `fs.stat` call
	//      you could use option `mark: true` with `glob`

	// '`foo/`' should not continue with the '`..`'
	const REPLACERS = [

	  [
	    // Remove BOM
	    // TODO:
	    // Other similar zero-width characters?
	    /^\uFEFF/,
	    () => EMPTY
	  ],

	  // > Trailing spaces are ignored unless they are quoted with backslash ("\")
	  [
	    // (a\ ) -> (a )
	    // (a  ) -> (a)
	    // (a ) -> (a)
	    // (a \ ) -> (a  )
	    /((?:\\\\)*?)(\\?\s+)$/,
	    (_, m1, m2) => m1 + (
	      m2.indexOf('\\') === 0
	        ? SPACE
	        : EMPTY
	    )
	  ],

	  // Replace (\ ) with ' '
	  // (\ ) -> ' '
	  // (\\ ) -> '\\ '
	  // (\\\ ) -> '\\ '
	  [
	    /(\\+?)\s/g,
	    (_, m1) => {
	      const {length} = m1;
	      return m1.slice(0, length - length % 2) + SPACE
	    }
	  ],

	  // Escape metacharacters
	  // which is written down by users but means special for regular expressions.

	  // > There are 12 characters with special meanings:
	  // > - the backslash \,
	  // > - the caret ^,
	  // > - the dollar sign $,
	  // > - the period or dot .,
	  // > - the vertical bar or pipe symbol |,
	  // > - the question mark ?,
	  // > - the asterisk or star *,
	  // > - the plus sign +,
	  // > - the opening parenthesis (,
	  // > - the closing parenthesis ),
	  // > - and the opening square bracket [,
	  // > - the opening curly brace {,
	  // > These special characters are often called "metacharacters".
	  [
	    /[\\$.|*+(){^]/g,
	    match => `\\${match}`
	  ],

	  [
	    // > a question mark (?) matches a single character
	    /(?!\\)\?/g,
	    () => '[^/]'
	  ],

	  // leading slash
	  [

	    // > A leading slash matches the beginning of the pathname.
	    // > For example, "/*.c" matches "cat-file.c" but not "mozilla-sha1/sha1.c".
	    // A leading slash matches the beginning of the pathname
	    /^\//,
	    () => '^'
	  ],

	  // replace special metacharacter slash after the leading slash
	  [
	    /\//g,
	    () => '\\/'
	  ],

	  [
	    // > A leading "**" followed by a slash means match in all directories.
	    // > For example, "**/foo" matches file or directory "foo" anywhere,
	    // > the same as pattern "foo".
	    // > "**/foo/bar" matches file or directory "bar" anywhere that is directly
	    // >   under directory "foo".
	    // Notice that the '*'s have been replaced as '\\*'
	    /^\^*\\\*\\\*\\\//,

	    // '**/foo' <-> 'foo'
	    () => '^(?:.*\\/)?'
	  ],

	  // starting
	  [
	    // there will be no leading '/'
	    //   (which has been replaced by section "leading slash")
	    // If starts with '**', adding a '^' to the regular expression also works
	    /^(?=[^^])/,
	    function startingReplacer () {
	      // If has a slash `/` at the beginning or middle
	      return !/\/(?!$)/.test(this)
	        // > Prior to 2.22.1
	        // > If the pattern does not contain a slash /,
	        // >   Git treats it as a shell glob pattern
	        // Actually, if there is only a trailing slash,
	        //   git also treats it as a shell glob pattern

	        // After 2.22.1 (compatible but clearer)
	        // > If there is a separator at the beginning or middle (or both)
	        // > of the pattern, then the pattern is relative to the directory
	        // > level of the particular .gitignore file itself.
	        // > Otherwise the pattern may also match at any level below
	        // > the .gitignore level.
	        ? '(?:^|\\/)'

	        // > Otherwise, Git treats the pattern as a shell glob suitable for
	        // >   consumption by fnmatch(3)
	        : '^'
	    }
	  ],

	  // two globstars
	  [
	    // Use lookahead assertions so that we could match more than one `'/**'`
	    /\\\/\\\*\\\*(?=\\\/|$)/g,

	    // Zero, one or several directories
	    // should not use '*', or it will be replaced by the next replacer

	    // Check if it is not the last `'/**'`
	    (_, index, str) => index + 6 < str.length

	      // case: /**/
	      // > A slash followed by two consecutive asterisks then a slash matches
	      // >   zero or more directories.
	      // > For example, "a/**/b" matches "a/b", "a/x/b", "a/x/y/b" and so on.
	      // '/**/'
	      ? '(?:\\/[^\\/]+)*'

	      // case: /**
	      // > A trailing `"/**"` matches everything inside.

	      // #21: everything inside but it should not include the current folder
	      : '\\/.+'
	  ],

	  // normal intermediate wildcards
	  [
	    // Never replace escaped '*'
	    // ignore rule '\*' will match the path '*'

	    // 'abc.*/' -> go
	    // 'abc.*'  -> skip this rule,
	    //    coz trailing single wildcard will be handed by [trailing wildcard]
	    /(^|[^\\]+)(\\\*)+(?=.+)/g,

	    // '*.js' matches '.js'
	    // '*.js' doesn't match 'abc'
	    (_, p1, p2) => {
	      // 1.
	      // > An asterisk "*" matches anything except a slash.
	      // 2.
	      // > Other consecutive asterisks are considered regular asterisks
	      // > and will match according to the previous rules.
	      const unescaped = p2.replace(/\\\*/g, '[^\\/]*');
	      return p1 + unescaped
	    }
	  ],

	  [
	    // unescape, revert step 3 except for back slash
	    // For example, if a user escape a '\\*',
	    // after step 3, the result will be '\\\\\\*'
	    /\\\\\\(?=[$.|*+(){^])/g,
	    () => ESCAPE
	  ],

	  [
	    // '\\\\' -> '\\'
	    /\\\\/g,
	    () => ESCAPE
	  ],

	  [
	    // > The range notation, e.g. [a-zA-Z],
	    // > can be used to match one of the characters in a range.

	    // `\` is escaped by step 3
	    /(\\)?\[([^\]/]*?)(\\*)($|\])/g,
	    (match, leadEscape, range, endEscape, close) => leadEscape === ESCAPE
	      // '\\[bar]' -> '\\\\[bar\\]'
	      ? `\\[${range}${cleanRangeBackSlash(endEscape)}${close}`
	      : close === ']'
	        ? endEscape.length % 2 === 0
	          // A normal case, and it is a range notation
	          // '[bar]'
	          // '[bar\\\\]'
	          ? `[${sanitizeRange(range)}${endEscape}]`
	          // Invalid range notaton
	          // '[bar\\]' -> '[bar\\\\]'
	          : '[]'
	        : '[]'
	  ],

	  // ending
	  [
	    // 'js' will not match 'js.'
	    // 'ab' will not match 'abc'
	    /(?:[^*])$/,

	    // WTF!
	    // https://git-scm.com/docs/gitignore
	    // changes in [2.22.1](https://git-scm.com/docs/gitignore/2.22.1)
	    // which re-fixes #24, #38

	    // > If there is a separator at the end of the pattern then the pattern
	    // > will only match directories, otherwise the pattern can match both
	    // > files and directories.

	    // 'js*' will not match 'a.js'
	    // 'js/' will not match 'a.js'
	    // 'js' will match 'a.js' and 'a.js/'
	    match => /\/$/.test(match)
	      // foo/ will not match 'foo'
	      ? `${match}$`
	      // foo matches 'foo' and 'foo/'
	      : `${match}(?=$|\\/$)`
	  ]
	];

	const REGEX_REPLACE_TRAILING_WILDCARD = /(^|\\\/)?\\\*$/;
	const MODE_IGNORE = 'regex';
	const MODE_CHECK_IGNORE = 'checkRegex';
	const UNDERSCORE = '_';

	const TRAILING_WILD_CARD_REPLACERS = {
	  [MODE_IGNORE] (_, p1) {
	    const prefix = p1
	      // '\^':
	      // '/*' does not match EMPTY
	      // '/*' does not match everything

	      // '\\\/':
	      // 'abc/*' does not match 'abc/'
	      ? `${p1}[^/]+`

	      // 'a*' matches 'a'
	      // 'a*' matches 'aa'
	      : '[^/]*';

	    return `${prefix}(?=$|\\/$)`
	  },

	  [MODE_CHECK_IGNORE] (_, p1) {
	    // When doing `git check-ignore`
	    const prefix = p1
	      // '\\\/':
	      // 'abc/*' DOES match 'abc/' !
	      ? `${p1}[^/]*`

	      // 'a*' matches 'a'
	      // 'a*' matches 'aa'
	      : '[^/]*';

	    return `${prefix}(?=$|\\/$)`
	  }
	};

	// @param {pattern}
	const makeRegexPrefix = pattern => REPLACERS.reduce(
	  (prev, [matcher, replacer]) =>
	    prev.replace(matcher, replacer.bind(pattern)),
	  pattern
	);

	const isString = subject => typeof subject === 'string';

	// > A blank line matches no files, so it can serve as a separator for readability.
	const checkPattern = pattern => pattern
	  && isString(pattern)
	  && !REGEX_TEST_BLANK_LINE.test(pattern)
	  && !REGEX_INVALID_TRAILING_BACKSLASH.test(pattern)

	  // > A line starting with # serves as a comment.
	  && pattern.indexOf('#') !== 0;

	const splitPattern = pattern => pattern
	.split(REGEX_SPLITALL_CRLF)
	.filter(Boolean);

	class IgnoreRule {
	  constructor (
	    pattern,
	    mark,
	    body,
	    ignoreCase,
	    negative,
	    prefix
	  ) {
	    this.pattern = pattern;
	    this.mark = mark;
	    this.negative = negative;

	    define(this, 'body', body);
	    define(this, 'ignoreCase', ignoreCase);
	    define(this, 'regexPrefix', prefix);
	  }

	  get regex () {
	    const key = UNDERSCORE + MODE_IGNORE;

	    if (this[key]) {
	      return this[key]
	    }

	    return this._make(MODE_IGNORE, key)
	  }

	  get checkRegex () {
	    const key = UNDERSCORE + MODE_CHECK_IGNORE;

	    if (this[key]) {
	      return this[key]
	    }

	    return this._make(MODE_CHECK_IGNORE, key)
	  }

	  _make (mode, key) {
	    const str = this.regexPrefix.replace(
	      REGEX_REPLACE_TRAILING_WILDCARD,

	      // It does not need to bind pattern
	      TRAILING_WILD_CARD_REPLACERS[mode]
	    );

	    const regex = this.ignoreCase
	      ? new RegExp(str, 'i')
	      : new RegExp(str);

	    return define(this, key, regex)
	  }
	}

	const createRule = ({
	  pattern,
	  mark
	}, ignoreCase) => {
	  let negative = false;
	  let body = pattern;

	  // > An optional prefix "!" which negates the pattern;
	  if (body.indexOf('!') === 0) {
	    negative = true;
	    body = body.substr(1);
	  }

	  body = body
	  // > Put a backslash ("\") in front of the first "!" for patterns that
	  // >   begin with a literal "!", for example, `"\!important!.txt"`.
	  .replace(REGEX_REPLACE_LEADING_EXCAPED_EXCLAMATION, '!')
	  // > Put a backslash ("\") in front of the first hash for patterns that
	  // >   begin with a hash.
	  .replace(REGEX_REPLACE_LEADING_EXCAPED_HASH, '#');

	  const regexPrefix = makeRegexPrefix(body);

	  return new IgnoreRule(
	    pattern,
	    mark,
	    body,
	    ignoreCase,
	    negative,
	    regexPrefix
	  )
	};

	class RuleManager {
	  constructor (ignoreCase) {
	    this._ignoreCase = ignoreCase;
	    this._rules = [];
	  }

	  _add (pattern) {
	    // #32
	    if (pattern && pattern[KEY_IGNORE]) {
	      this._rules = this._rules.concat(pattern._rules._rules);
	      this._added = true;
	      return
	    }

	    if (isString(pattern)) {
	      pattern = {
	        pattern
	      };
	    }

	    if (checkPattern(pattern.pattern)) {
	      const rule = createRule(pattern, this._ignoreCase);
	      this._added = true;
	      this._rules.push(rule);
	    }
	  }

	  // @param {Array<string> | string | Ignore} pattern
	  add (pattern) {
	    this._added = false;

	    makeArray(
	      isString(pattern)
	        ? splitPattern(pattern)
	        : pattern
	    ).forEach(this._add, this);

	    return this._added
	  }

	  // Test one single path without recursively checking parent directories
	  //
	  // - checkUnignored `boolean` whether should check if the path is unignored,
	  //   setting `checkUnignored` to `false` could reduce additional
	  //   path matching.
	  // - check `string` either `MODE_IGNORE` or `MODE_CHECK_IGNORE`

	  // @returns {TestResult} true if a file is ignored
	  test (path, checkUnignored, mode) {
	    let ignored = false;
	    let unignored = false;
	    let matchedRule;

	    this._rules.forEach(rule => {
	      const {negative} = rule;

	      //          |           ignored : unignored
	      // -------- | ---------------------------------------
	      // negative |   0:0   |   0:1   |   1:0   |   1:1
	      // -------- | ------- | ------- | ------- | --------
	      //     0    |  TEST   |  TEST   |  SKIP   |    X
	      //     1    |  TESTIF |  SKIP   |  TEST   |    X

	      // - SKIP: always skip
	      // - TEST: always test
	      // - TESTIF: only test if checkUnignored
	      // - X: that never happen
	      if (
	        unignored === negative && ignored !== unignored
	        || negative && !ignored && !unignored && !checkUnignored
	      ) {
	        return
	      }

	      const matched = rule[mode].test(path);

	      if (!matched) {
	        return
	      }

	      ignored = !negative;
	      unignored = negative;

	      matchedRule = negative
	        ? UNDEFINED
	        : rule;
	    });

	    const ret = {
	      ignored,
	      unignored
	    };

	    if (matchedRule) {
	      ret.rule = matchedRule;
	    }

	    return ret
	  }
	}

	const throwError = (message, Ctor) => {
	  throw new Ctor(message)
	};

	const checkPath = (path, originalPath, doThrow) => {
	  if (!isString(path)) {
	    return doThrow(
	      `path must be a string, but got \`${originalPath}\``,
	      TypeError
	    )
	  }

	  // We don't know if we should ignore EMPTY, so throw
	  if (!path) {
	    return doThrow(`path must not be empty`, TypeError)
	  }

	  // Check if it is a relative path
	  if (checkPath.isNotRelative(path)) {
	    const r = '`path.relative()`d';
	    return doThrow(
	      `path should be a ${r} string, but got "${originalPath}"`,
	      RangeError
	    )
	  }

	  return true
	};

	const isNotRelative = path => REGEX_TEST_INVALID_PATH.test(path);

	checkPath.isNotRelative = isNotRelative;

	// On windows, the following function will be replaced
	/* istanbul ignore next */
	checkPath.convert = p => p;


	class Ignore {
	  constructor ({
	    ignorecase = true,
	    ignoreCase = ignorecase,
	    allowRelativePaths = false
	  } = {}) {
	    define(this, KEY_IGNORE, true);

	    this._rules = new RuleManager(ignoreCase);
	    this._strictPathCheck = !allowRelativePaths;
	    this._initCache();
	  }

	  _initCache () {
	    // A cache for the result of `.ignores()`
	    this._ignoreCache = Object.create(null);

	    // A cache for the result of `.test()`
	    this._testCache = Object.create(null);
	  }

	  add (pattern) {
	    if (this._rules.add(pattern)) {
	      // Some rules have just added to the ignore,
	      //   making the behavior changed,
	      //   so we need to re-initialize the result cache
	      this._initCache();
	    }

	    return this
	  }

	  // legacy
	  addPattern (pattern) {
	    return this.add(pattern)
	  }

	  // @returns {TestResult}
	  _test (originalPath, cache, checkUnignored, slices) {
	    const path = originalPath
	      // Supports nullable path
	      && checkPath.convert(originalPath);

	    checkPath(
	      path,
	      originalPath,
	      this._strictPathCheck
	        ? throwError
	        : RETURN_FALSE
	    );

	    return this._t(path, cache, checkUnignored, slices)
	  }

	  checkIgnore (path) {
	    // If the path doest not end with a slash, `.ignores()` is much equivalent
	    //   to `git check-ignore`
	    if (!REGEX_TEST_TRAILING_SLASH.test(path)) {
	      return this.test(path)
	    }

	    const slices = path.split(SLASH).filter(Boolean);
	    slices.pop();

	    if (slices.length) {
	      const parent = this._t(
	        slices.join(SLASH) + SLASH,
	        this._testCache,
	        true,
	        slices
	      );

	      if (parent.ignored) {
	        return parent
	      }
	    }

	    return this._rules.test(path, false, MODE_CHECK_IGNORE)
	  }

	  _t (
	    // The path to be tested
	    path,

	    // The cache for the result of a certain checking
	    cache,

	    // Whether should check if the path is unignored
	    checkUnignored,

	    // The path slices
	    slices
	  ) {
	    if (path in cache) {
	      return cache[path]
	    }

	    if (!slices) {
	      // path/to/a.js
	      // ['path', 'to', 'a.js']
	      slices = path.split(SLASH).filter(Boolean);
	    }

	    slices.pop();

	    // If the path has no parent directory, just test it
	    if (!slices.length) {
	      return cache[path] = this._rules.test(path, checkUnignored, MODE_IGNORE)
	    }

	    const parent = this._t(
	      slices.join(SLASH) + SLASH,
	      cache,
	      checkUnignored,
	      slices
	    );

	    // If the path contains a parent directory, check the parent first
	    return cache[path] = parent.ignored
	      // > It is not possible to re-include a file if a parent directory of
	      // >   that file is excluded.
	      ? parent
	      : this._rules.test(path, checkUnignored, MODE_IGNORE)
	  }

	  ignores (path) {
	    return this._test(path, this._ignoreCache, false).ignored
	  }

	  createFilter () {
	    return path => !this.ignores(path)
	  }

	  filter (paths) {
	    return makeArray(paths).filter(this.createFilter())
	  }

	  // @returns {TestResult}
	  test (path) {
	    return this._test(path, this._testCache, true)
	  }
	}

	const factory = options => new Ignore(options);

	const isPathValid = path =>
	  checkPath(path && checkPath.convert(path), path, RETURN_FALSE);

	/* istanbul ignore next */
	const setupWindows = () => {
	  /* eslint no-control-regex: "off" */
	  const makePosix = str => /^\\\\\?\\/.test(str)
	  || /["<>|\u0000-\u001F]+/u.test(str)
	    ? str
	    : str.replace(/\\/g, '/');

	  checkPath.convert = makePosix;

	  // 'C:\\foo'     <- 'C:\\foo' has been converted to 'C:/'
	  // 'd:\\foo'
	  const REGEX_TEST_WINDOWS_PATH_ABSOLUTE = /^[a-z]:\//i;
	  checkPath.isNotRelative = path =>
	    REGEX_TEST_WINDOWS_PATH_ABSOLUTE.test(path)
	    || isNotRelative(path);
	};


	// Windows
	// --------------------------------------------------------------
	/* istanbul ignore next */
	if (
	  // Detect `process` so that it can run in browsers.
	  typeof process !== 'undefined'
	  && process.platform === 'win32'
	) {
	  setupWindows();
	}

	// COMMONJS_EXPORTS ////////////////////////////////////////////////////////////

	module.exports = factory;

	// Although it is an anti-pattern,
	//   it is still widely misused by a lot of libraries in github
	// Ref: https://github.com/search?q=ignore.default%28%29&type=code
	factory.default = factory;

	module.exports.isPathValid = isPathValid;

	// For testing purposes
	define(module.exports, Symbol.for('setupWindows'), setupWindows); 
} (ignore$1));

var ignoreExports = ignore$1.exports;
var ignore = /*@__PURE__*/getDefaultExportFromCjs(ignoreExports);

// src/workspace/errors.ts
var WorkspaceError = class extends Error {
  constructor(message, code, workspaceId) {
    super(message);
    this.code = code;
    this.workspaceId = workspaceId;
    this.name = "WorkspaceError";
  }
  code;
  workspaceId;
};
var WorkspaceNotAvailableError = class extends WorkspaceError {
  constructor() {
    super("Workspace not available. Ensure the agent has a workspace configured.", "NO_WORKSPACE");
    this.name = "WorkspaceNotAvailableError";
  }
};
var FilesystemNotAvailableError = class extends WorkspaceError {
  constructor() {
    super("Workspace does not have a filesystem configured", "NO_FILESYSTEM");
    this.name = "FilesystemNotAvailableError";
  }
};
var SandboxNotAvailableError = class extends WorkspaceError {
  constructor(message) {
    super(message ?? "Workspace does not have a sandbox configured", "NO_SANDBOX");
    this.name = "SandboxNotAvailableError";
  }
};
var SandboxFeatureNotSupportedError = class extends WorkspaceError {
  constructor(feature) {
    super(`Sandbox does not support ${feature}`, "FEATURE_NOT_SUPPORTED");
    this.name = "SandboxFeatureNotSupportedError";
  }
};
var WorkspaceReadOnlyError = class extends WorkspaceError {
  constructor(operation) {
    super(`Workspace is in read-only mode. Cannot perform: ${operation}`, "READ_ONLY");
    this.name = "WorkspaceReadOnlyError";
  }
};
var FilesystemError = class extends Error {
  constructor(message, code, path9) {
    super(message);
    this.code = code;
    this.path = path9;
    this.name = "FilesystemError";
  }
  code;
  path;
};
var FileNotFoundError = class extends FilesystemError {
  constructor(path9) {
    super(`File not found: ${path9}`, "ENOENT", path9);
    this.name = "FileNotFoundError";
  }
};
var FileReadRequiredError = class extends FilesystemError {
  constructor(path9, reason) {
    super(reason, "EREAD_REQUIRED", path9);
    this.name = "FileReadRequiredError";
  }
};
function isEnoentError(error) {
  return error !== null && typeof error === "object" && "code" in error && error.code === "ENOENT";
}
var MIME_TYPES = {
  // Text
  txt: "text/plain",
  html: "text/html",
  htm: "text/html",
  css: "text/css",
  csv: "text/csv",
  md: "text/markdown",
  // Code
  js: "application/javascript",
  mjs: "application/javascript",
  ts: "application/typescript",
  tsx: "application/typescript",
  jsx: "application/javascript",
  json: "application/json",
  xml: "application/xml",
  yaml: "text/yaml",
  yml: "text/yaml",
  // Programming languages
  py: "text/x-python",
  rb: "text/x-ruby",
  go: "text/x-go",
  rs: "text/x-rust",
  java: "text/x-java",
  c: "text/x-c",
  cpp: "text/x-c++",
  h: "text/x-c",
  hpp: "text/x-c++",
  sh: "text/x-sh",
  bash: "text/x-sh",
  zsh: "text/x-sh",
  // Config
  toml: "text/toml",
  ini: "text/plain",
  env: "text/plain",
  // Database/Query
  sql: "text/x-sql",
  graphql: "application/graphql",
  gql: "application/graphql",
  // Frameworks
  vue: "text/x-vue",
  // Images
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  webp: "image/webp",
  ico: "image/x-icon",
  // Documents
  pdf: "application/pdf"
};
function getMimeType(filename) {
  const ext = nodePath.extname(filename).slice(1).toLowerCase();
  return MIME_TYPES[ext] ?? "application/octet-stream";
}
var TEXT_EXTENSIONS = /* @__PURE__ */ new Set([
  ".md",
  ".txt",
  ".json",
  ".yaml",
  ".yml",
  ".js",
  ".mjs",
  ".ts",
  ".tsx",
  ".jsx",
  ".py",
  ".rb",
  ".go",
  ".rs",
  ".java",
  ".c",
  ".cpp",
  ".h",
  ".hpp",
  ".sh",
  ".bash",
  ".zsh",
  ".html",
  ".htm",
  ".css",
  ".xml",
  ".toml",
  ".ini",
  ".env",
  ".csv",
  ".sql",
  ".graphql",
  ".gql",
  ".vue",
  ".svg"
]);
function isTextFile(filename) {
  const ext = nodePath.extname(filename).toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}
async function fsExists(absolutePath) {
  try {
    await fs2.access(absolutePath);
    return true;
  } catch {
    return false;
  }
}
async function fsStat(absolutePath, userPath) {
  try {
    const stats = await fs2.stat(absolutePath);
    return {
      name: nodePath.basename(absolutePath),
      type: stats.isDirectory() ? "directory" : "file",
      size: stats.size,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      mimeType: stats.isFile() ? getMimeType(absolutePath) : void 0
    };
  } catch (error) {
    if (isEnoentError(error)) {
      throw new FileNotFoundError(userPath);
    }
    throw error;
  }
}
var InMemoryFileReadTracker = class {
  records = /* @__PURE__ */ new Map();
  recordRead(path9, modifiedAt) {
    const normalizedPath = this.normalizePath(path9);
    this.records.set(normalizedPath, {
      path: normalizedPath,
      readAt: /* @__PURE__ */ new Date(),
      modifiedAtRead: modifiedAt
    });
  }
  getReadRecord(path9) {
    return this.records.get(this.normalizePath(path9));
  }
  needsReRead(path9, currentModifiedAt) {
    const record = this.getReadRecord(path9);
    if (!record) {
      return {
        needsReRead: true,
        reason: `File "${path9}" has not been read. You must read a file before writing to it.`
      };
    }
    if (currentModifiedAt.getTime() > record.modifiedAtRead.getTime()) {
      return {
        needsReRead: true,
        reason: `File "${path9}" was modified since last read (read at: ${record.modifiedAtRead.toISOString()}, current: ${currentModifiedAt.toISOString()}). Please re-read the file to get the latest contents.`
      };
    }
    return { needsReRead: false };
  }
  clearReadRecord(path9) {
    this.records.delete(this.normalizePath(path9));
  }
  clear() {
    this.records.clear();
  }
  normalizePath(pathStr) {
    const normalized = nodePath.posix.normalize(pathStr.replace(/\\/g, "/"));
    return normalized.replace(/\/$/, "") || "/";
  }
};
var InMemoryFileWriteLock = class {
  queues = /* @__PURE__ */ new Map();
  timeoutMs;
  constructor(opts) {
    this.timeoutMs = opts?.timeoutMs ?? 3e4;
  }
  get size() {
    return this.queues.size;
  }
  withLock(filePath, fn) {
    const key = this.normalizePath(filePath);
    const currentQueue = this.queues.get(key) ?? Promise.resolve();
    let resolve6;
    let reject;
    const resultPromise = new Promise((res, rej) => {
      resolve6 = res;
      reject = rej;
    });
    const queuePromise = currentQueue.catch(() => {
    }).then(async () => {
      let timeoutId;
      try {
        const result = await Promise.race([
          fn(),
          new Promise((_, rej) => {
            timeoutId = setTimeout(
              () => rej(new Error(`write-lock timeout on "${key}" after ${this.timeoutMs}ms`)),
              this.timeoutMs
            );
          })
        ]);
        clearTimeout(timeoutId);
        resolve6(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
    this.queues.set(key, queuePromise);
    void queuePromise.finally(() => {
      if (this.queues.get(key) === queuePromise) {
        this.queues.delete(key);
      }
    });
    return resultPromise;
  }
  normalizePath(pathStr) {
    const normalized = nodePath.posix.normalize(pathStr.replace(/\\/g, "/").replace(/^\/\/+/, "/"));
    return normalized.replace(/\/+$/, "") || "/";
  }
};
var GLOB_CHARS = /[*?{}[\]]/;
function isGlobPattern(input) {
  return GLOB_CHARS.test(input);
}
function extractGlobBase(pattern) {
  const firstMeta = pattern.search(GLOB_CHARS);
  if (firstMeta === -1) {
    return pattern;
  }
  const prefix = pattern.slice(0, firstMeta);
  const lastSlash = prefix.lastIndexOf("/");
  if (lastSlash <= 0) {
    return ".";
  }
  return prefix.slice(0, lastSlash);
}
function normalizeForMatch(input) {
  if (input.startsWith("./")) return input.slice(2);
  if (input.startsWith("/")) return input.slice(1);
  return input;
}
function createGlobMatcher(patterns, options) {
  const patternArray = (Array.isArray(patterns) ? patterns : [patterns]).map(normalizeForMatch);
  const matcher = picomatch$1(patternArray, {
    posix: true,
    dot: options?.dot ?? false
  });
  return (path9) => matcher(normalizeForMatch(path9));
}

// src/workspace/sandbox/local-process-manager.ts
process.platform === "win32";

// src/workspace/sandbox/local-sandbox.ts
nodePath.join(os3.tmpdir(), ".mastra-mounts");

// src/workspace/line-utils.ts
function extractLines(content, startLine, endLine) {
  const allLines = content.split("\n");
  const totalLines = allLines.length;
  const start = Math.max(1, startLine ?? 1);
  const end = Math.min(totalLines, endLine ?? totalLines);
  const extractedLines = allLines.slice(start - 1, end);
  return {
    content: extractedLines.join("\n"),
    lines: { start, end },
    totalLines
  };
}
function extractLinesWithLimit(content, offset, limit) {
  const startLine = offset ?? 1;
  const endLine = limit ? startLine + limit - 1 : void 0;
  return extractLines(content, startLine, endLine);
}
function formatWithLineNumbers(content, startLineNumber = 1) {
  const lines = content.split("\n");
  const maxLineNum = startLineNumber + lines.length - 1;
  const padWidth = Math.max(6, String(maxLineNum).length + 1);
  return lines.map((line, i) => {
    const lineNum = startLineNumber + i;
    return `${String(lineNum).padStart(padWidth)}\u2192${line}`;
  }).join("\n");
}
function countOccurrences(content, searchString) {
  if (!searchString) return 0;
  let count = 0;
  let position = 0;
  while ((position = content.indexOf(searchString, position)) !== -1) {
    count++;
    position += searchString.length;
  }
  return count;
}
function replaceString(content, oldString, newString, replaceAll = false) {
  const count = countOccurrences(content, oldString);
  if (count === 0) {
    throw new StringNotFoundError(oldString);
  }
  if (!replaceAll && count > 1) {
    throw new StringNotUniqueError(oldString, count);
  }
  const escapedNewString = newString.replace(/\$/g, "$$$$");
  if (replaceAll) {
    const result = content.split(oldString).join(newString);
    return { content: result, replacements: count };
  } else {
    const result = content.replace(oldString, escapedNewString);
    return { content: result, replacements: 1 };
  }
}
var StringNotFoundError = class extends Error {
  constructor(searchString) {
    super(`The specified text was not found. Make sure you use the exact text from the file.`);
    this.searchString = searchString;
    this.name = "StringNotFoundError";
  }
  searchString;
};
var StringNotUniqueError = class extends Error {
  constructor(searchString, occurrences) {
    super(
      `The specified text appears ${occurrences} times. Provide more surrounding context to make the match unique, or use replace_all to replace all occurrences.`
    );
    this.searchString = searchString;
    this.occurrences = occurrences;
    this.name = "StringNotUniqueError";
  }
  searchString;
  occurrences;
};
var LocalSkillSource = class {
  #basePath;
  constructor(options = {}) {
    this.#basePath = options.basePath ?? process.cwd();
  }
  /**
   * Resolve a path relative to the base path.
   * Handles both absolute and relative paths.
   */
  #resolvePath(skillPath) {
    if (nodePath.isAbsolute(skillPath)) {
      return skillPath;
    }
    return nodePath.resolve(this.#basePath, skillPath);
  }
  async exists(skillPath) {
    return fsExists(this.#resolvePath(skillPath));
  }
  async stat(skillPath) {
    return fsStat(this.#resolvePath(skillPath), skillPath);
  }
  async readFile(skillPath) {
    const resolved = this.#resolvePath(skillPath);
    const content = await fs2.readFile(resolved);
    if (isTextFile(skillPath)) {
      return content.toString("utf-8");
    }
    return content;
  }
  async readdir(skillPath) {
    const resolved = this.#resolvePath(skillPath);
    const entries = await fs2.readdir(resolved, { withFileTypes: true });
    return Promise.all(
      entries.map(async (entry) => {
        const entryPath = nodePath.join(resolved, entry.name);
        const isSymlink = entry.isSymbolicLink();
        let type = entry.isDirectory() ? "directory" : "file";
        if (isSymlink) {
          try {
            const targetStat = await fs2.stat(entryPath);
            type = targetStat.isDirectory() ? "directory" : "file";
          } catch {
            type = "file";
          }
        }
        return {
          name: entry.name,
          type,
          isSymlink: isSymlink || void 0
        };
      })
    );
  }
  async realpath(skillPath) {
    return fs2.realpath(this.#resolvePath(skillPath));
  }
};

// src/workspace/tools/tracing.ts
function startWorkspaceSpan(context, workspace, options) {
  const currentSpan = context?.tracing?.currentSpan ?? context?.tracingContext?.currentSpan;
  if (!currentSpan) {
    return noOpHandle;
  }
  const { category, operation, input, attributes } = options;
  const span = currentSpan.createChildSpan({
    type: "workspace_action" /* WORKSPACE_ACTION */,
    name: `workspace:${category}:${operation}`,
    input,
    attributes: {
      category,
      workspaceId: workspace?.id,
      workspaceName: workspace?.name,
      ...attributes
    }
  });
  return {
    span,
    end(attrs, output) {
      span?.end({
        output,
        attributes: {
          ...attrs
        }
      });
    },
    error(err, attrs) {
      const error = err instanceof Error ? err : new Error(String(err));
      span?.error({
        error,
        attributes: {
          success: false,
          ...attrs
        }
      });
    }
  };
}
var noOpHandle = {
  span: void 0,
  end() {
  },
  error() {
  }
};

// src/workspace/skills/tools.ts
function createSkillTools(skills) {
  return {
    skill: createSkillTool(skills),
    skill_search: createSkillSearchTool(skills),
    skill_read: createSkillReadTool(skills)
  };
}
async function resolveSkill(skills, identifier) {
  const skill = await skills.get(identifier);
  if (skill) return { skill };
  const allSkills = await skills.list();
  const skillEntries = allSkills.map((s) => `${s.name} (${s.path})`);
  return { notFound: `Skill "${identifier}" not found. Available skills: ${skillEntries.join(", ")}` };
}
function createSkillTool(skills) {
  const tool = createTool({
    id: "skill",
    description: "Activate a skill to load its full instructions. You should activate skills proactively when they are relevant to the user's request without asking for permission first.",
    inputSchema: object({
      name: string().describe("The name or path of the skill to activate. Use the path when multiple skills share the same name.")
    }),
    execute: async ({ name }, context) => {
      const span = startWorkspaceSpan(context, context?.workspace, {
        category: "skill",
        operation: "activate",
        input: { name }
      });
      try {
        const result = await resolveSkill(skills, name);
        if ("notFound" in result) {
          span.end({ success: false });
          return result.notFound;
        }
        const { skill } = result;
        const parts = [skill.instructions];
        if (skill.references?.length) {
          parts.push(`

## References
${skill.references.map((r) => `- references/${r}`).join("\n")}`);
        }
        if (skill.scripts?.length) {
          parts.push(`

## Scripts
${skill.scripts.map((s) => `- scripts/${s}`).join("\n")}`);
        }
        if (skill.assets?.length) {
          parts.push(`

## Assets
${skill.assets.map((a) => `- assets/${a}`).join("\n")}`);
        }
        span.end({ success: true });
        return parts.join("");
      } catch (err) {
        span.error(err);
        throw err;
      }
    }
  });
  return tool;
}
function createSkillSearchTool(skills) {
  const tool = createTool({
    id: "skill_search",
    description: "Search across skill content to find relevant information. Useful when you need to find specific details within skills.",
    inputSchema: object({
      query: string().describe("The search query"),
      skillNames: array(string()).optional().describe("Optional list of skill names to search within"),
      topK: number().optional().describe("Maximum number of results to return (default: 5)")
    }),
    execute: async ({ query, skillNames, topK }, context) => {
      const span = startWorkspaceSpan(context, context?.workspace, {
        category: "skill",
        operation: "search",
        input: { query, skillNames, topK },
        attributes: {}
      });
      try {
        const results = await skills.search(query, { topK, skillNames });
        if (results.length === 0) {
          span.end({ success: true }, { resultCount: 0 });
          return "No results found.";
        }
        span.end({ success: true }, { resultCount: results.length });
        return results.map((r) => {
          const preview = r.content.substring(0, 200) + (r.content.length > 200 ? "..." : "");
          const location = r.lineRange ? ` (lines ${r.lineRange.start}-${r.lineRange.end})` : "";
          return `[${r.skillName}]${location} (score: ${r.score.toFixed(2)})
${preview}`;
        }).join("\n\n");
      } catch (err) {
        span.error(err);
        throw err;
      }
    }
  });
  return tool;
}
function createSkillReadTool(skills) {
  const tool = createTool({
    id: "skill_read",
    description: "Read a file from a skill directory (references, scripts, or assets). The path is relative to the skill root.",
    inputSchema: object({
      skillName: string().describe("The name or path of the skill. Use the path when multiple skills share the same name."),
      path: string().describe('Path to the file relative to the skill root (e.g. "references/colors.md", "scripts/run.sh")'),
      startLine: number().optional().describe("Starting line number (1-indexed). If omitted, starts from the beginning."),
      endLine: number().optional().describe("Ending line number (1-indexed, inclusive). If omitted, reads to the end.")
    }),
    execute: async ({ skillName, path: path9, startLine, endLine }, context) => {
      const span = startWorkspaceSpan(context, context?.workspace, {
        category: "skill",
        operation: "read",
        input: { skillName, path: path9, startLine, endLine },
        attributes: {}
      });
      try {
        const resolved = await resolveSkill(skills, skillName);
        if ("notFound" in resolved) {
          span.end({ success: false });
          return resolved.notFound;
        }
        const resolvedPath = resolved.skill.path;
        let content = null;
        content = await skills.getReference(resolvedPath, path9);
        if (content === null) content = await skills.getScript(resolvedPath, path9);
        if (content === null) content = await skills.getAsset(resolvedPath, path9);
        if (content === null) {
          const refs = (await skills.listReferences(resolvedPath)).map((f) => `references/${f}`);
          const scriptsList = (await skills.listScripts(resolvedPath)).map((f) => `scripts/${f}`);
          const assets = (await skills.listAssets(resolvedPath)).map((f) => `assets/${f}`);
          const allFiles = [...refs, ...scriptsList, ...assets];
          const fileList = allFiles.length > 0 ? `
Available files: ${allFiles.join(", ")}` : "";
          span.end({ success: false });
          return `File "${path9}" not found in skill "${skillName}".${fileList}`;
        }
        const textContent = typeof content === "string" ? content : content.toString("utf-8");
        if (textContent.slice(0, 1e3).includes("\0")) {
          const fullPath = `${resolved.skill.path}/${path9}`;
          const size = typeof content === "string" ? Buffer.byteLength(content) : content.length;
          span.end({ success: true }, { bytesTransferred: size });
          return `Binary file: ${fullPath} (${size} bytes)`;
        }
        content = textContent;
        const result = extractLines(content, startLine, endLine);
        span.end({ success: true }, { bytesTransferred: Buffer.byteLength(result.content, "utf-8") });
        return result.content;
      } catch (err) {
        span.error(err);
        throw err;
      }
    }
  });
  return tool;
}

// src/workspace/constants/index.ts
var WORKSPACE_TOOLS_PREFIX = "mastra_workspace";
var WORKSPACE_TOOLS = {
  FILESYSTEM: {
    READ_FILE: `${WORKSPACE_TOOLS_PREFIX}_read_file`,
    WRITE_FILE: `${WORKSPACE_TOOLS_PREFIX}_write_file`,
    EDIT_FILE: `${WORKSPACE_TOOLS_PREFIX}_edit_file`,
    LIST_FILES: `${WORKSPACE_TOOLS_PREFIX}_list_files`,
    DELETE: `${WORKSPACE_TOOLS_PREFIX}_delete`,
    FILE_STAT: `${WORKSPACE_TOOLS_PREFIX}_file_stat`,
    MKDIR: `${WORKSPACE_TOOLS_PREFIX}_mkdir`,
    GREP: `${WORKSPACE_TOOLS_PREFIX}_grep`,
    AST_EDIT: `${WORKSPACE_TOOLS_PREFIX}_ast_edit`
  },
  SANDBOX: {
    EXECUTE_COMMAND: `${WORKSPACE_TOOLS_PREFIX}_execute_command`,
    GET_PROCESS_OUTPUT: `${WORKSPACE_TOOLS_PREFIX}_get_process_output`,
    KILL_PROCESS: `${WORKSPACE_TOOLS_PREFIX}_kill_process`
  },
  SEARCH: {
    SEARCH: `${WORKSPACE_TOOLS_PREFIX}_search`,
    INDEX: `${WORKSPACE_TOOLS_PREFIX}_index`
  },
  LSP: {
    LSP_INSPECT: `${WORKSPACE_TOOLS_PREFIX}_lsp_inspect`
  }
};
function requireWorkspace(context) {
  if (!context?.workspace) {
    throw new WorkspaceNotAvailableError();
  }
  return context.workspace;
}
function requireFilesystem(context) {
  const workspace = requireWorkspace(context);
  if (!workspace.filesystem) {
    throw new FilesystemNotAvailableError();
  }
  return { workspace, filesystem: workspace.filesystem };
}
function requireSandbox(context) {
  const workspace = requireWorkspace(context);
  if (!workspace.sandbox) {
    throw new SandboxNotAvailableError();
  }
  return { workspace, sandbox: workspace.sandbox };
}
async function emitWorkspaceMetadata(context, toolName) {
  const workspace = requireWorkspace(context);
  const info = await workspace.getInfo();
  const toolCallId = context?.agent?.toolCallId;
  await context?.writer?.custom({
    type: "data-workspace-metadata",
    data: { toolName, toolCallId, ...info }
  });
}
async function getEditDiagnosticsText(workspace, filePath, content) {
  try {
    const lspManager = workspace.lsp;
    if (!lspManager) return "";
    const absolutePath = workspace.filesystem?.resolveAbsolutePath?.(filePath) ?? nodePath__default.resolve(lspManager.root, filePath.replace(/^\/+/, ""));
    const DIAG_TIMEOUT_MS = 1e4;
    let diagTimer;
    const diagnostics = await Promise.race([
      lspManager.getDiagnostics(absolutePath, content),
      new Promise((_, reject) => {
        diagTimer = setTimeout(() => reject(new Error("LSP diagnostics timeout")), DIAG_TIMEOUT_MS);
      })
    ]).finally(() => clearTimeout(diagTimer));
    if (diagnostics === null) return "";
    if (diagnostics.length === 0) return "";
    const seen = /* @__PURE__ */ new Set();
    const deduped = diagnostics.filter((d) => {
      const key = `${d.severity}:${d.line}:${d.character}:${d.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const groups = {
      error: [],
      warning: [],
      info: [],
      hint: []
    };
    for (const d of deduped) {
      groups[d.severity].push(d);
    }
    const lines = ["\n\nLSP Diagnostics:"];
    const severityLabels = [
      ["error", "Errors"],
      ["warning", "Warnings"],
      ["info", "Info"],
      ["hint", "Hints"]
    ];
    for (const [severity, label] of severityLabels) {
      const items = groups[severity];
      if (items.length === 0) continue;
      lines.push(`${label}:`);
      for (const d of items) {
        const source = d.source ? ` [${d.source}]` : "";
        lines.push(`  ${d.line}:${d.character} - ${d.message}${source}`);
      }
    }
    let result = lines.join("\n");
    const maxChars = 2e3;
    if (result.length > maxChars) {
      const cutoff = result.lastIndexOf("\n", maxChars);
      result = result.slice(0, cutoff > 0 ? cutoff : maxChars) + "\n  ... (truncated)";
    }
    return result;
  } catch {
    return "";
  }
}

// src/workspace/tools/ast-edit.ts
var astGrepModule;
var loadingPromise;
async function loadAstGrep() {
  if (astGrepModule !== void 0) {
    return astGrepModule;
  }
  if (!loadingPromise) {
    loadingPromise = (async () => {
      try {
        const moduleName = "@ast-grep/napi";
        const mod = await import(
          /* @vite-ignore */
          /* webpackIgnore: true */
          moduleName
        );
        astGrepModule = { parse: mod.parse, Lang: mod.Lang };
        return astGrepModule;
      } catch {
        astGrepModule = null;
        return null;
      }
    })();
  }
  return loadingPromise;
}
function isAstGrepAvailable() {
  if (astGrepModule !== void 0) {
    return astGrepModule !== null;
  }
  try {
    const req = createRequire(import.meta.url);
    req.resolve("@ast-grep/napi");
    return true;
  } catch {
    return false;
  }
}
function getLanguageFromPath(filePath, Lang) {
  const ext = filePath.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts":
      return Lang.TypeScript;
    case "tsx":
    case "jsx":
      return Lang.Tsx;
    case "js":
      return Lang.JavaScript;
    case "html":
      return Lang.Html;
    case "css":
      return Lang.Css;
    default:
      return null;
  }
}
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function renameIdentifiers(content, root, oldName, newName) {
  let modifiedContent = content;
  let count = 0;
  const identifiers = root.findAll({
    rule: {
      kind: "identifier",
      regex: `^${escapeRegex(oldName)}$`
    }
  });
  const replacements = [];
  const seen = /* @__PURE__ */ new Set();
  for (const id of identifiers) {
    const range = id.range();
    if (seen.has(range.start.index)) continue;
    seen.add(range.start.index);
    replacements.push({ start: range.start.index, end: range.end.index, text: newName });
    count++;
  }
  replacements.sort((a, b) => b.start - a.start);
  for (const { start, end, text } of replacements) {
    modifiedContent = modifiedContent.slice(0, start) + text + modifiedContent.slice(end);
  }
  return { content: modifiedContent, count };
}
function buildImportStatement(defaultName, namedImports, moduleStr) {
  if (defaultName && namedImports.length > 0) {
    return `import ${defaultName}, { ${namedImports.join(", ")} } from ${moduleStr};`;
  } else if (defaultName) {
    return `import ${defaultName} from ${moduleStr};`;
  } else {
    return `import { ${namedImports.join(", ")} } from ${moduleStr};`;
  }
}
function mergeIntoExistingImport(content, existingImport, names, isDefault) {
  const text = existingImport.text();
  if (/^import\s+\*\s+as\s+/.test(text)) return null;
  const defaultMatch = text.match(/^import\s+(?!type\s)(?!\{)(\w+)/);
  const namedMatch = text.match(/\{([^}]*)\}/);
  const moduleMatch = text.match(/(["'][^"']+["'])\s*;?\s*$/);
  if (!moduleMatch) return null;
  const moduleStr = moduleMatch[1] ?? "";
  let existingDefault = defaultMatch ? defaultMatch[1] ?? null : null;
  const existingNamed = namedMatch ? (namedMatch[1] ?? "").split(",").map((s) => s.trim()).filter(Boolean) : [];
  let newDefault = existingDefault;
  const newNamed = [...existingNamed];
  if (isDefault && names.length > 0) {
    if (!existingDefault) {
      newDefault = names[0] ?? null;
    }
    for (const name of names.slice(1)) {
      if (!newNamed.includes(name)) {
        newNamed.push(name);
      }
    }
  } else {
    for (const name of names) {
      if (!newNamed.includes(name)) {
        newNamed.push(name);
      }
    }
  }
  const defaultChanged = newDefault !== existingDefault;
  const namedChanged = newNamed.length !== existingNamed.length;
  if (!defaultChanged && !namedChanged) return null;
  const importStatement = buildImportStatement(newDefault, newNamed, moduleStr);
  const range = existingImport.range();
  return content.slice(0, range.start.index) + importStatement + content.slice(range.end.index);
}
function addImport(content, root, importSpec) {
  const { module, names, isDefault } = importSpec;
  const imports = root.findAll({ rule: { kind: "import_statement" } });
  const existingImport = imports.find((imp) => {
    const text = imp.text();
    if (/^import\s+type\s/.test(text)) return false;
    if (/^import\s+\*\s+as\s+/.test(text)) return false;
    return text.includes(`'${module}'`) || text.includes(`"${module}"`);
  });
  if (existingImport) {
    return mergeIntoExistingImport(content, existingImport, names, isDefault) ?? content;
  }
  const moduleStr = `'${module}'`;
  const importStatement = buildImportStatement(
    isDefault ? names[0] : null,
    isDefault ? names.slice(1) : names,
    moduleStr
  );
  const lastImport = imports.at(-1);
  if (lastImport) {
    const pos = lastImport.range().end.index;
    return content.slice(0, pos) + "\n" + importStatement + content.slice(pos);
  } else {
    return importStatement + "\n\n" + content;
  }
}
function removeImport(content, root, targetName) {
  const imports = root.findAll({ rule: { kind: "import_statement" } });
  for (const imp of imports) {
    const text = imp.text();
    const moduleMatch = text.match(/from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]/);
    const moduleName = moduleMatch?.[1] ?? moduleMatch?.[2];
    if (moduleName === targetName || moduleName?.startsWith(`${targetName}/`)) {
      const range = imp.range();
      const start = range.start.index;
      let end = range.end.index;
      if (content[end] === "\n") end++;
      return content.slice(0, start) + content.slice(end);
    }
  }
  return content;
}
function patternReplace(content, root, pattern, replacement) {
  let modifiedContent = content;
  let count = 0;
  try {
    const matches = root.findAll({ rule: { pattern } });
    const replacements = [];
    const metaVars = [...pattern.matchAll(/\$(\w+)/g)].map((m) => m[1]).filter((v) => v !== void 0);
    for (const match of matches) {
      const range = match.range();
      let replacementText = replacement;
      for (const varName of metaVars) {
        const matchedNode = match.getMatch(varName);
        if (matchedNode) {
          replacementText = replacementText.replace(new RegExp(`\\$${varName}`, "g"), matchedNode.text());
        }
      }
      replacements.push({ start: range.start.index, end: range.end.index, text: replacementText });
      count++;
    }
    replacements.sort((a, b) => b.start - a.start);
    for (const { start, end, text } of replacements) {
      modifiedContent = modifiedContent.slice(0, start) + text + modifiedContent.slice(end);
    }
  } catch (err) {
    return {
      content: modifiedContent,
      count: 0,
      error: err instanceof Error ? err.message : "Pattern matching failed"
    };
  }
  return { content: modifiedContent, count };
}
var astEditTool = createTool({
  id: WORKSPACE_TOOLS.FILESYSTEM.AST_EDIT,
  description: `Edit code using AST-based analysis for intelligent transformations.

Use \`transform\` for structured operations (imports, renames). Use \`pattern\`/\`replacement\` only for general find-and-replace.

Transforms:
- add-import: Add or merge imports. Skips duplicates. For default imports, put the default name first in \`names\`.
  { transform: "add-import", importSpec: { module: "react", names: ["useState", "useEffect"] } }
  { transform: "add-import", importSpec: { module: "express", names: ["express"], isDefault: true } }
  { transform: "add-import", importSpec: { module: "express", names: ["express", "Router"], isDefault: true } } \u2192 import express, { Router } from 'express'
- remove-import: Remove an import by module name.
  { transform: "remove-import", targetName: "lodash" }
- rename: Rename all occurrences of an identifier (not scope-aware).
  { transform: "rename", targetName: "oldName", newName: "newName" }

Pattern replace (for everything else):
  { pattern: "console.log($ARG)", replacement: "logger.debug($ARG)" }`,
  inputSchema: object({
    path: string().describe("The path to the file to edit"),
    pattern: string().optional().describe('AST pattern to search for (supports $VARIABLE placeholders, e.g., "console.log($ARG)")'),
    replacement: string().optional().describe('Replacement pattern (can use captured $VARIABLES, e.g., "logger.debug($ARG)")'),
    transform: _enum(["add-import", "remove-import", "rename"]).optional().describe("Structured transformation to apply"),
    targetName: string().optional().describe("Required for remove-import and rename transforms. The current name to target."),
    newName: string().optional().describe("Required for rename transform. The new name to replace targetName with."),
    importSpec: object({
      module: string().describe("Module to import from"),
      names: array(string()).min(1).describe("Names to import. For default imports, put the default name first."),
      isDefault: boolean().optional().describe("Whether the first name is a default import")
    }).optional().describe("Required for add-import transform. Specifies the module and names to import.")
  }),
  execute: async ({ path: path9, pattern, replacement, transform, targetName, newName, importSpec }, context) => {
    const { workspace, filesystem } = requireFilesystem(context);
    await emitWorkspaceMetadata(context, WORKSPACE_TOOLS.FILESYSTEM.AST_EDIT);
    const span = startWorkspaceSpan(context, workspace, {
      category: "filesystem",
      operation: "astEdit",
      input: { path: path9, transform, pattern },
      attributes: { filesystemProvider: filesystem.provider }
    });
    try {
      if (filesystem.readOnly) {
        throw new WorkspaceReadOnlyError("ast_edit");
      }
      const astGrep = await loadAstGrep();
      if (!astGrep) {
        span.end({ success: false });
        return "@ast-grep/napi is not available. Install it to use AST editing.";
      }
      const { parse: parse2, Lang } = astGrep;
      let content;
      try {
        content = await filesystem.readFile(path9, { encoding: "utf-8" });
      } catch (error) {
        if (error instanceof FileNotFoundError) {
          span.end({ success: false });
          return `File not found: ${path9}. Use the write file tool to create it first.`;
        }
        throw error;
      }
      if (typeof content !== "string") {
        span.end({ success: false });
        return `Cannot perform AST edits on binary files. Use the write file tool instead.`;
      }
      const lang = getLanguageFromPath(path9, Lang);
      if (!lang) {
        span.end({ success: false });
        return `Unsupported file type for AST editing: ${path9}`;
      }
      const ast = parse2(lang, content);
      const root = ast.root();
      let modifiedContent = content;
      const changes = [];
      if (transform) {
        switch (transform) {
          case "add-import": {
            if (!importSpec) {
              span.end({ success: false });
              return "Error: importSpec is required for add-import transform";
            }
            modifiedContent = addImport(content, root, importSpec);
            changes.push(`Added import from '${importSpec.module}'`);
            break;
          }
          case "remove-import": {
            if (!targetName) {
              span.end({ success: false });
              return "Error: targetName is required for remove-import transform";
            }
            modifiedContent = removeImport(content, root, targetName);
            changes.push(`Removed import '${targetName}'`);
            break;
          }
          case "rename": {
            if (!targetName || !newName) {
              span.end({ success: false });
              return "Error: targetName and newName are required for rename transform";
            }
            const renameResult = renameIdentifiers(content, root, targetName, newName);
            modifiedContent = renameResult.content;
            changes.push(`Renamed '${targetName}' to '${newName}' (${renameResult.count} occurrences)`);
            break;
          }
        }
      } else if (pattern && replacement !== void 0) {
        const result = patternReplace(content, root, pattern, replacement);
        if (result.error) {
          span.end({ success: false });
          return `Error: AST pattern matching failed: ${result.error}`;
        }
        modifiedContent = result.content;
        changes.push(`Replaced ${result.count} occurrences of pattern`);
      } else if (pattern && replacement === void 0) {
        span.end({ success: false });
        return "Error: replacement is required when pattern is provided";
      } else if (!pattern && replacement !== void 0) {
        span.end({ success: false });
        return "Error: pattern is required when replacement is provided";
      } else {
        span.end({ success: false });
        return "Error: Must provide either transform or pattern/replacement";
      }
      const wasModified = modifiedContent !== content;
      if (wasModified) {
        await filesystem.writeFile(path9, modifiedContent, {
          overwrite: true,
          expectedMtime: context?.__expectedMtime
        });
      }
      if (!wasModified) {
        span.end({ success: true });
        return `No changes made to ${path9} (${changes.join("; ")})`;
      }
      let output = `${path9}: ${changes.join("; ")}`;
      output += await getEditDiagnosticsText(workspace, path9, modifiedContent);
      span.end({ success: true }, { bytesTransferred: Buffer.byteLength(modifiedContent, "utf-8") });
      return output;
    } catch (err) {
      span.error(err);
      throw err;
    }
  }
});
var deleteFileTool = createTool({
  id: WORKSPACE_TOOLS.FILESYSTEM.DELETE,
  description: "Delete a file or directory from the workspace filesystem",
  inputSchema: object({
    path: string().describe("The path to the file or directory to delete"),
    recursive: boolean().optional().default(false).describe("If true, delete directories and their contents recursively. Required for non-empty directories.")
  }),
  execute: async ({ path: path9, recursive }, context) => {
    const { workspace, filesystem } = requireFilesystem(context);
    await emitWorkspaceMetadata(context, WORKSPACE_TOOLS.FILESYSTEM.DELETE);
    const span = startWorkspaceSpan(context, workspace, {
      category: "filesystem",
      operation: "delete",
      input: { path: path9, recursive },
      attributes: { filesystemProvider: filesystem.provider }
    });
    try {
      if (filesystem.readOnly) {
        throw new WorkspaceReadOnlyError("delete");
      }
      const stat4 = await filesystem.stat(path9);
      if (stat4.type === "directory") {
        await filesystem.rmdir(path9, { recursive, force: recursive });
      } else {
        await filesystem.deleteFile(path9);
      }
      span.end({ success: true });
      return `Deleted ${path9}`;
    } catch (err) {
      span.error(err);
      throw err;
    }
  }
});
var editFileTool = createTool({
  id: WORKSPACE_TOOLS.FILESYSTEM.EDIT_FILE,
  description: `Edit a file by replacing specific text. The old_string must match exactly and be unique in the file.

Usage:
- Read the file first to get the exact text to replace.
- By default, read file output includes line number prefixes (e.g., "     1\u2192"). Ensure you preserve the exact indentation as it appears AFTER the arrow. Never include any part of the line number prefix in old_string or new_string.
- Include enough surrounding context (multiple lines) to make old_string unique. If it still isn't unique, include more lines.
- Use replace_all only when intentionally replacing all occurrences.`,
  inputSchema: object({
    path: string().describe("The path to the file to edit"),
    old_string: string().describe("The exact text to find and replace. Must be unique in the file."),
    new_string: string().describe("The text to replace old_string with"),
    replace_all: boolean().optional().default(false).describe("If true, replace all occurrences. If false (default), old_string must be unique.")
  }),
  execute: async ({ path: path9, old_string, new_string, replace_all }, context) => {
    const { workspace, filesystem } = requireFilesystem(context);
    await emitWorkspaceMetadata(context, WORKSPACE_TOOLS.FILESYSTEM.EDIT_FILE);
    const span = startWorkspaceSpan(context, workspace, {
      category: "filesystem",
      operation: "editFile",
      input: { path: path9, replace_all },
      attributes: { filesystemProvider: filesystem.provider }
    });
    try {
      if (filesystem.readOnly) {
        throw new WorkspaceReadOnlyError("edit_file");
      }
      const content = await filesystem.readFile(path9, { encoding: "utf-8" });
      if (typeof content !== "string") {
        span.end({ success: false });
        return `Cannot edit binary files. Use the write file tool instead.`;
      }
      const result = replaceString(content, old_string, new_string, replace_all);
      await filesystem.writeFile(path9, result.content, {
        overwrite: true,
        expectedMtime: context?.__expectedMtime
      });
      let output = `Replaced ${result.replacements} occurrence${result.replacements !== 1 ? "s" : ""} in ${path9}`;
      output += await getEditDiagnosticsText(workspace, path9, result.content);
      span.end({ success: true }, { bytesTransferred: Buffer.byteLength(result.content, "utf-8") });
      return output;
    } catch (error) {
      if (error instanceof StringNotFoundError) {
        span.end({ success: false });
        return error.message;
      }
      if (error instanceof StringNotUniqueError) {
        span.end({ success: false });
        return error.message;
      }
      span.error(error);
      throw error;
    }
  }
});

// src/utils/tiktoken.ts
var GLOBAL_KEY = "__mastraTiktoken";
async function getTiktoken() {
  const cached2 = globalThis[GLOBAL_KEY];
  if (cached2) return cached2;
  const { Tiktoken: TiktokenClass } = await import('./lite.mjs');
  const o200k_base = (await import('./o200k_base.mjs')).default;
  const enc = new TiktokenClass(o200k_base);
  globalThis[GLOBAL_KEY] = enc;
  return enc;
}

// src/workspace/tools/output-helpers.ts
var DEFAULT_TAIL_LINES = 200;
var DEFAULT_MAX_OUTPUT_TOKENS = 2e3;
var ANSI_RE = /(?:\u001B\][\s\S]*?(?:\u0007|\u001B\u005C|\u009C))|(?:[\u001B\u009B][\[\]()#;?]*(?:\d{1,4}(?:[;:]\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~])/g;
function stripAnsi(text) {
  return text.replace(ANSI_RE, "");
}
function sandboxToModelOutput(output) {
  if (typeof output === "string") {
    return { type: "text", value: stripAnsi(output) };
  }
  return output;
}
function applyTail(output, tail) {
  if (!output) return output;
  const n = Math.abs(tail ?? DEFAULT_TAIL_LINES);
  if (n === 0) return output;
  const trailingNewline = output.endsWith("\n");
  const lines = (trailingNewline ? output.slice(0, -1) : output).split("\n");
  if (lines.length <= n) return output;
  const sliced = lines.slice(-n).join("\n");
  const body = trailingNewline ? sliced + "\n" : sliced;
  return `[showing last ${n} of ${lines.length} lines]
${body}`;
}
async function applyTokenLimit(output, limit = DEFAULT_MAX_OUTPUT_TOKENS, from = "start") {
  if (!output) return output;
  const tiktoken = await getTiktoken();
  const allTokens = tiktoken.encode(output, "all");
  if (allTokens.length <= limit) return output;
  const kept = from === "start" ? tiktoken.decode(allTokens.slice(-limit)) : tiktoken.decode(allTokens.slice(0, limit));
  const position = from === "start" ? "last" : "first";
  return from === "start" ? `[output truncated: showing ${position} ~${limit} of ~${allTokens.length} tokens]
${kept}` : `${kept}
[output truncated: showing ${position} ~${limit} of ~${allTokens.length} tokens]`;
}
async function applyTokenLimitSandwich(output, limit = DEFAULT_MAX_OUTPUT_TOKENS, headRatio = 0.1) {
  if (!output) return output;
  const tiktoken = await getTiktoken();
  const allTokens = tiktoken.encode(output, "all");
  if (allTokens.length <= limit) return output;
  const headBudget = Math.floor(limit * headRatio);
  const tailBudget = limit - headBudget;
  const head = headBudget > 0 ? tiktoken.decode(allTokens.slice(0, headBudget)) : "";
  const tail = tailBudget > 0 ? tiktoken.decode(allTokens.slice(-tailBudget)) : "";
  const notice = `[...output truncated \u2014 showing first ~${headBudget} + last ~${tailBudget} of ~${allTokens.length} tokens...]`;
  return [head, notice, tail].filter(Boolean).join("\n");
}
async function truncateOutput(output, tail, tokenLimit, tokenFrom) {
  const tailed = applyTail(output, tail);
  {
    return applyTokenLimitSandwich(tailed, tokenLimit);
  }
}

// src/workspace/tools/execute-command.ts
var executeCommandInputSchema = object({
  command: string().describe('The shell command to execute (e.g., "npm install", "ls -la src/", "cat file.txt | grep error")'),
  timeout: number().nullish().describe("Maximum execution time in seconds. Example: 60 for 1 minute."),
  cwd: string().nullish().describe("Working directory for the command"),
  tail: number().nullish().describe(
    `For foreground commands: limit output to the last N lines, similar to tail -n. Defaults to ${DEFAULT_TAIL_LINES}. Use 0 for no limit.`
  )
});
var executeCommandWithBackgroundSchema = executeCommandInputSchema.extend({
  background: boolean().optional().describe(
    "Run the command in the background. Returns a PID immediately instead of waiting for completion. Use get_process_output to check on it later."
  )
});
function extractTailPipe(command) {
  const match = command.match(/\|\s*tail\s+(?:-n\s+)?(-?\d+)\s*$/);
  if (match) {
    const lines = Math.abs(parseInt(match[1], 10));
    if (lines > 0) {
      return {
        command: command.replace(/\|\s*tail\s+(?:-n\s+)?-?\d+\s*$/, "").trim(),
        tail: lines
      };
    }
  }
  return { command };
}
async function executeCommand(input, context) {
  let { command, cwd, tail } = input;
  const timeout = input.timeout != null ? input.timeout * 1e3 : void 0;
  const background = input.background;
  const { workspace, sandbox } = requireSandbox(context);
  if (!background) {
    const extracted = extractTailPipe(command);
    command = extracted.command;
    if (extracted.tail != null) {
      tail = extracted.tail;
    }
  }
  await emitWorkspaceMetadata(context, WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND);
  const toolCallId = context?.agent?.toolCallId;
  const toolConfig = workspace.getToolsConfig()?.[WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND];
  const tokenLimit = toolConfig?.maxOutputTokens;
  const span = startWorkspaceSpan(context, workspace, {
    category: "sandbox",
    operation: background ? "spawnProcess" : "executeCommand",
    input: { command, cwd, timeout: input.timeout, background },
    attributes: { sandboxProvider: sandbox.provider }
  });
  if (background) {
    if (!sandbox.processes) {
      const err = new SandboxFeatureNotSupportedError("processes");
      span.error(err);
      throw err;
    }
    const bgConfig = toolConfig?.backgroundProcesses;
    const bgAbortSignal = bgConfig?.abortSignal === void 0 ? context?.abortSignal : bgConfig.abortSignal || void 0;
    let handle;
    handle = await sandbox.processes.spawn(command, {
      cwd: cwd ?? void 0,
      timeout: timeout ?? void 0,
      abortSignal: bgAbortSignal,
      onStdout: bgConfig?.onStdout ? (data) => bgConfig.onStdout(data, { pid: handle.pid, toolCallId }) : void 0,
      onStderr: bgConfig?.onStderr ? (data) => bgConfig.onStderr(data, { pid: handle.pid, toolCallId }) : void 0
    });
    if (bgConfig?.onExit) {
      void handle.wait().then((result) => {
        bgConfig.onExit({
          pid: handle.pid,
          exitCode: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr,
          toolCallId
        });
      });
    }
    span.end({ success: true }, { pid: Number(handle.pid) || void 0 });
    return `Started background process (PID: ${handle.pid})`;
  }
  if (!sandbox.executeCommand) {
    const err = new SandboxFeatureNotSupportedError("executeCommand");
    span.error(err);
    throw err;
  }
  const startedAt = Date.now();
  let stdout = "";
  let stderr = "";
  try {
    const result = await sandbox.executeCommand(command, [], {
      timeout: timeout ?? void 0,
      cwd: cwd ?? void 0,
      abortSignal: context?.abortSignal,
      // foreground processes use agent's abort signal
      onStdout: async (data) => {
        stdout += data;
        await context?.writer?.custom({
          type: "data-sandbox-stdout",
          data: { output: data, timestamp: Date.now(), toolCallId },
          transient: true
        });
      },
      onStderr: async (data) => {
        stderr += data;
        await context?.writer?.custom({
          type: "data-sandbox-stderr",
          data: { output: data, timestamp: Date.now(), toolCallId },
          transient: true
        });
      }
    });
    await context?.writer?.custom({
      type: "data-sandbox-exit",
      data: {
        exitCode: result.exitCode,
        success: result.success,
        executionTimeMs: result.executionTimeMs,
        toolCallId
      }
    });
    span.end({ success: result.success }, { exitCode: result.exitCode });
    if (!result.success) {
      const parts = [
        await truncateOutput(result.stdout, tail, tokenLimit),
        await truncateOutput(result.stderr, tail, tokenLimit)
      ].filter(Boolean);
      parts.push(`Exit code: ${result.exitCode}`);
      return parts.join("\n");
    }
    return await truncateOutput(result.stdout, tail, tokenLimit) || "(no output)";
  } catch (error) {
    await context?.writer?.custom({
      type: "data-sandbox-exit",
      data: {
        exitCode: -1,
        success: false,
        executionTimeMs: Date.now() - startedAt,
        toolCallId
      }
    });
    span.end({ success: false }, { exitCode: -1 });
    const parts = [
      await truncateOutput(stdout, tail, tokenLimit),
      await truncateOutput(stderr, tail, tokenLimit)
    ].filter(Boolean);
    const errorMessage = error instanceof Error ? error.message : String(error);
    parts.push(`Error: ${errorMessage}`);
    return parts.join("\n");
  }
}
var baseDescription = `Execute a shell command in the workspace sandbox.

Examples:
  "npm install && npm run build"
  "ls -la src/"
  "cat config.json | jq '.database'"
  "cd /app && python main.py"

Usage:
- Commands run in a shell, so pipes, redirects, and chaining (&&, ||, ;) all work.
- Always quote file paths that contain spaces (e.g., cd "/path/with spaces").
- Use the timeout parameter (in seconds) to limit execution time. Behavior when omitted depends on the sandbox provider.
- Optionally use cwd to override the working directory. Commands run from the sandbox default if omitted.`;
var executeCommandTool = createTool({
  id: WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND,
  description: baseDescription,
  inputSchema: executeCommandInputSchema,
  execute: executeCommand,
  toModelOutput: sandboxToModelOutput
});
var executeCommandWithBackgroundTool = createTool({
  id: WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND,
  description: `${baseDescription}

Set background: true to run long-running commands (dev servers, watchers) without blocking. You'll get a PID to track the process.`,
  inputSchema: executeCommandWithBackgroundSchema,
  execute: executeCommand,
  toModelOutput: sandboxToModelOutput
});
var fileStatTool = createTool({
  id: WORKSPACE_TOOLS.FILESYSTEM.FILE_STAT,
  description: "Get file or directory metadata from the workspace. Returns existence, type, size, and modification time.",
  inputSchema: object({
    path: string().describe("The path to check")
  }),
  execute: async ({ path: path9 }, context) => {
    const { workspace, filesystem } = requireFilesystem(context);
    await emitWorkspaceMetadata(context, WORKSPACE_TOOLS.FILESYSTEM.FILE_STAT);
    const span = startWorkspaceSpan(context, workspace, {
      category: "filesystem",
      operation: "stat",
      input: { path: path9 },
      attributes: { filesystemProvider: filesystem.provider }
    });
    try {
      const stat4 = await filesystem.stat(path9);
      const modifiedAt = stat4.modifiedAt.toISOString();
      const parts = [`${path9}`, `Type: ${stat4.type}`];
      if (stat4.size !== void 0) parts.push(`Size: ${stat4.size} bytes`);
      parts.push(`Modified: ${modifiedAt}`);
      span.end({ success: true }, { bytesTransferred: stat4.size });
      return parts.join(" ");
    } catch (error) {
      if (error instanceof FileNotFoundError) {
        span.end({ success: false });
        return `${path9}: not found`;
      }
      span.error(error);
      throw error;
    }
  }
});
var getProcessOutputTool = createTool({
  id: WORKSPACE_TOOLS.SANDBOX.GET_PROCESS_OUTPUT,
  description: `Get the current output (stdout, stderr) and status of a background process by its PID.

Use this after starting a background command with execute_command (background: true) to check if the process is still running and read its output.`,
  toModelOutput: sandboxToModelOutput,
  inputSchema: object({
    pid: string().describe("The process ID returned when the background command was started"),
    tail: number().optional().describe(
      `Number of lines to return, similar to tail -n. Positive or negative returns last N lines from end. Defaults to ${DEFAULT_TAIL_LINES}. Use 0 for no limit.`
    ),
    wait: boolean().optional().describe(
      "If true, block until the process exits and return the final output. Useful for short-lived background commands where you want to wait for the result."
    )
  }),
  execute: async ({ pid, tail, wait: shouldWait }, context) => {
    const { workspace, sandbox } = requireSandbox(context);
    await emitWorkspaceMetadata(context, WORKSPACE_TOOLS.SANDBOX.GET_PROCESS_OUTPUT);
    const span = startWorkspaceSpan(context, workspace, {
      category: "sandbox",
      operation: "getProcessOutput",
      input: { pid, tail, wait: shouldWait },
      attributes: { sandboxProvider: sandbox.provider }
    });
    const toolCallId = context?.agent?.toolCallId;
    try {
      if (!sandbox.processes) {
        throw new SandboxFeatureNotSupportedError("processes");
      }
      const handle = await sandbox.processes.get(pid);
      if (!handle) {
        span.end({ success: false });
        return `No background process found with PID ${pid}.`;
      }
      if (handle.command) {
        await context?.writer?.custom({
          type: "data-sandbox-command",
          data: { command: handle.command, pid, toolCallId }
        });
      }
      if (shouldWait && handle.exitCode === void 0) {
        const result = await handle.wait({
          onStdout: context?.writer ? async (data) => {
            await context.writer.custom({
              type: "data-sandbox-stdout",
              data: { output: data, timestamp: Date.now(), toolCallId },
              transient: true
            });
          } : void 0,
          onStderr: context?.writer ? async (data) => {
            await context.writer.custom({
              type: "data-sandbox-stderr",
              data: { output: data, timestamp: Date.now(), toolCallId },
              transient: true
            });
          } : void 0
        });
        await context?.writer?.custom({
          type: "data-sandbox-exit",
          data: {
            exitCode: result.exitCode,
            success: result.success,
            executionTimeMs: result.executionTimeMs,
            toolCallId
          }
        });
      }
      const running = handle.exitCode === void 0;
      const tokenLimit = workspace.getToolsConfig()?.[WORKSPACE_TOOLS.SANDBOX.GET_PROCESS_OUTPUT]?.maxOutputTokens;
      const stdout = await truncateOutput(handle.stdout, tail, tokenLimit);
      const stderr = await truncateOutput(handle.stderr, tail, tokenLimit);
      if (!stdout && !stderr) {
        span.end({ success: true }, { exitCode: handle.exitCode });
        return "(no output yet)";
      }
      const parts = [];
      if (stdout && stderr) {
        parts.push("stdout:", stdout, "", "stderr:", stderr);
      } else if (stdout) {
        parts.push(stdout);
      } else {
        parts.push("stderr:", stderr);
      }
      if (!running) {
        parts.push("", `Exit code: ${handle.exitCode}`);
      }
      span.end({ success: true }, { exitCode: handle.exitCode });
      return parts.join("\n");
    } catch (err) {
      span.error(err);
      throw err;
    }
  }
});
async function loadGitignore(filesystem) {
  let content;
  try {
    const raw = await filesystem.readFile(".gitignore", { encoding: "utf-8" });
    if (typeof raw !== "string" || !raw.trim()) return void 0;
    content = raw;
  } catch {
    return void 0;
  }
  const ig = ignore().add(content);
  return (relativePath) => {
    const normalized = relativePath.replace(/^\.\//, "").replace(/^\//, "");
    if (!normalized) return false;
    return ig.ignores(normalized);
  };
}

// src/workspace/tools/grep.ts
var grepTool = createTool({
  id: WORKSPACE_TOOLS.FILESYSTEM.GREP,
  description: `Search file contents using a regex pattern. Walks the filesystem and returns matching lines with file paths and line numbers.

Usage:
- Basic search: { pattern: "TODO" }
- Regex: { pattern: "function\\s+\\w+\\(" }
- Multiple terms: { pattern: "TODO|FIXME|HACK" }
- Case-insensitive: { pattern: "error", caseSensitive: false }
- Search in directory: { pattern: "import", path: "./src" }
- Filter by glob: { pattern: "import", path: "**/*.ts" }
- Combined path + glob: { pattern: "import", path: "src/**/*.ts" }
- Multiple file types: { pattern: "import", path: "**/*.{ts,tsx,js}" }
- Multiple directories: { pattern: "TODO", path: "{src,lib}/**/*.ts" }
- With context: { pattern: "function", contextLines: 2 }`,
  inputSchema: object({
    pattern: string().describe("Regex pattern to search for"),
    path: string().optional().default(".").describe(
      'File, directory, or glob pattern to search within (default: "."). A plain path searches that file or directory. A glob pattern (e.g., "**/*.ts", "src/**/*.test.ts") filters which files to search.'
    ),
    contextLines: number().optional().default(0).describe("Number of lines of context to include before and after each match (default: 0)"),
    maxCount: number().optional().describe(
      "Maximum matches per file. Moves on to the next file after this many matches. Similar to grep -m flag."
    ),
    caseSensitive: boolean().optional().default(true).describe("Whether the search is case-sensitive (default: true)"),
    includeHidden: boolean().optional().default(false).describe('Include hidden files and directories (names starting with ".") in the search (default: false)')
  }),
  execute: async ({ pattern, path: inputPath = ".", contextLines = 0, maxCount, caseSensitive = true, includeHidden = false }, context) => {
    const { workspace, filesystem } = requireFilesystem(context);
    await emitWorkspaceMetadata(context, WORKSPACE_TOOLS.FILESYSTEM.GREP);
    const span = startWorkspaceSpan(context, workspace, {
      category: "filesystem",
      operation: "grep",
      input: { pattern, path: inputPath, contextLines, maxCount },
      attributes: { filesystemProvider: filesystem.provider }
    });
    try {
      const MAX_PATTERN_LENGTH = 1e3;
      if (pattern.length > MAX_PATTERN_LENGTH) {
        span.end({ success: false });
        return `Error: Pattern too long (${pattern.length} chars, max ${MAX_PATTERN_LENGTH}). Use a shorter pattern.`;
      }
      let regex;
      try {
        regex = new RegExp(pattern, caseSensitive ? "g" : "gi");
      } catch (e) {
        span.end({ success: false });
        return `Error: Invalid regex pattern: ${e.message}`;
      }
      let searchPath;
      let globMatcher;
      if (isGlobPattern(inputPath)) {
        searchPath = extractGlobBase(inputPath);
        globMatcher = createGlobMatcher(inputPath, { dot: includeHidden });
      } else {
        searchPath = inputPath;
      }
      const rawIgnoreFilter = await loadGitignore(filesystem);
      const searchPathNormalized = searchPath.replace(/^\.\//, "").replace(/\/$/, "");
      const targetIsIgnored = rawIgnoreFilter && searchPathNormalized && rawIgnoreFilter(searchPathNormalized + "/");
      const ignoreFilter = targetIsIgnored ? void 0 : rawIgnoreFilter;
      let filePaths;
      try {
        const stat4 = await filesystem.stat(searchPath);
        if (stat4.type === "file") {
          filePaths = isTextFile(searchPath) ? [searchPath] : [];
        } else {
          const collectFiles = async (dir) => {
            const files = [];
            let entries;
            try {
              entries = await filesystem.readdir(dir);
            } catch {
              return files;
            }
            for (const entry of entries) {
              if (!includeHidden && entry.name.startsWith(".")) continue;
              const fullPath = dir.endsWith("/") ? `${dir}${entry.name}` : `${dir}/${entry.name}`;
              if (ignoreFilter) {
                const relativePath = fullPath.replace(/^\.\//, "");
                const checkPath = entry.type === "directory" ? `${relativePath}/` : relativePath;
                if (ignoreFilter(checkPath)) continue;
              }
              if (entry.type === "file") {
                if (!isTextFile(entry.name)) continue;
                if (globMatcher && !globMatcher(fullPath)) continue;
                files.push(fullPath);
              } else if (entry.type === "directory" && !entry.isSymlink) {
                files.push(...await collectFiles(fullPath));
              }
            }
            return files;
          };
          filePaths = await collectFiles(searchPath);
        }
      } catch {
        filePaths = [];
      }
      const outputLines = [];
      const filesWithMatches = /* @__PURE__ */ new Set();
      let totalMatchCount = 0;
      let truncated = false;
      const MAX_LINE_LENGTH = 500;
      const GLOBAL_CAP = 1e3;
      for (const filePath of filePaths) {
        if (truncated) break;
        let content;
        try {
          const raw = await filesystem.readFile(filePath, { encoding: "utf-8" });
          if (typeof raw !== "string") continue;
          content = raw;
        } catch {
          continue;
        }
        const lines = content.split("\n");
        let fileMatchCount = 0;
        for (let i = 0; i < lines.length; i++) {
          const currentLine = lines[i];
          regex.lastIndex = 0;
          const lineMatch = regex.exec(currentLine);
          if (!lineMatch) continue;
          filesWithMatches.add(filePath);
          let lineContent = currentLine;
          if (lineContent.length > MAX_LINE_LENGTH) {
            lineContent = lineContent.slice(0, MAX_LINE_LENGTH) + "...";
          }
          if (contextLines > 0) {
            const beforeStart = Math.max(0, i - contextLines);
            for (let b = beforeStart; b < i; b++) {
              outputLines.push(`${filePath}:${b + 1}- ${lines[b]}`);
            }
          }
          outputLines.push(`${filePath}:${i + 1}:${lineMatch.index + 1}: ${lineContent}`);
          if (contextLines > 0) {
            const afterEnd = Math.min(lines.length - 1, i + contextLines);
            for (let a = i + 1; a <= afterEnd; a++) {
              outputLines.push(`${filePath}:${a + 1}- ${lines[a]}`);
            }
            outputLines.push("--");
          }
          totalMatchCount++;
          fileMatchCount++;
          if (maxCount !== void 0 && fileMatchCount >= maxCount) break;
          if (totalMatchCount >= GLOBAL_CAP) {
            truncated = true;
            break;
          }
        }
      }
      const summaryParts = [`${totalMatchCount} match${totalMatchCount !== 1 ? "es" : ""}`];
      summaryParts.push(`across ${filesWithMatches.size} file${filesWithMatches.size !== 1 ? "s" : ""}`);
      if (truncated) {
        summaryParts.push(`(truncated at ${GLOBAL_CAP})`);
      }
      const summary = summaryParts.join(" ");
      outputLines.unshift(summary, "---");
      const output = await applyTokenLimit(
        outputLines.join("\n"),
        workspace.getToolsConfig()?.[WORKSPACE_TOOLS.FILESYSTEM.GREP]?.maxOutputTokens,
        "end"
      );
      span.end({ success: true }, { resultCount: totalMatchCount });
      return output;
    } catch (err) {
      span.error(err);
      throw err;
    }
  }
});
var indexContentTool = createTool({
  id: WORKSPACE_TOOLS.SEARCH.INDEX,
  description: "Index content for search. The path becomes the document ID in search results.",
  inputSchema: object({
    path: string().describe("The document ID/path for search results"),
    content: string().describe("The text content to index"),
    metadata: record(string(), unknown()).optional().describe("Optional metadata to store with the document")
  }),
  execute: async ({ path: path9, content, metadata }, context) => {
    const workspace = requireWorkspace(context);
    await emitWorkspaceMetadata(context, WORKSPACE_TOOLS.SEARCH.INDEX);
    const span = startWorkspaceSpan(context, workspace, {
      category: "search",
      operation: "index",
      input: { path: path9, contentLength: content.length },
      attributes: {}
    });
    try {
      await workspace.index(path9, content, { metadata });
      span.end({ success: true }, { bytesTransferred: Buffer.byteLength(content, "utf-8") });
      return `Indexed ${path9}`;
    } catch (err) {
      span.error(err);
      throw err;
    }
  }
});
var KILL_TAIL_LINES = 50;
var killProcessTool = createTool({
  id: WORKSPACE_TOOLS.SANDBOX.KILL_PROCESS,
  description: `Kill a background process by its PID.

Use this to stop a long-running background process that was started with execute_command (background: true). Returns the last ${KILL_TAIL_LINES} lines of output.`,
  toModelOutput: sandboxToModelOutput,
  inputSchema: object({
    pid: string().describe("The process ID of the background process to kill")
  }),
  execute: async ({ pid }, context) => {
    const { workspace, sandbox } = requireSandbox(context);
    await emitWorkspaceMetadata(context, WORKSPACE_TOOLS.SANDBOX.KILL_PROCESS);
    const span = startWorkspaceSpan(context, workspace, {
      category: "sandbox",
      operation: "killProcess",
      input: { pid },
      attributes: { sandboxProvider: sandbox.provider }
    });
    const toolCallId = context?.agent?.toolCallId;
    try {
      if (!sandbox.processes) {
        throw new SandboxFeatureNotSupportedError("processes");
      }
      const handle = await sandbox.processes.get(pid);
      if (handle?.command) {
        await context?.writer?.custom({
          type: "data-sandbox-command",
          data: { command: handle.command, pid, toolCallId }
        });
      }
      const killed = await sandbox.processes.kill(pid);
      if (!killed) {
        await context?.writer?.custom({
          type: "data-sandbox-exit",
          data: { exitCode: handle?.exitCode ?? -1, success: false, killed: false, toolCallId }
        });
        span.end({ success: false });
        return `Process ${pid} was not found or had already exited.`;
      }
      await context?.writer?.custom({
        type: "data-sandbox-exit",
        data: { exitCode: handle?.exitCode ?? 137, success: false, killed: true, toolCallId }
      });
      const parts = [`Process ${pid} has been killed.`];
      if (handle) {
        const tokenLimit = workspace.getToolsConfig()?.[WORKSPACE_TOOLS.SANDBOX.KILL_PROCESS]?.maxOutputTokens;
        const stdout = handle.stdout ? await truncateOutput(handle.stdout, KILL_TAIL_LINES, tokenLimit) : "";
        const stderr = handle.stderr ? await truncateOutput(handle.stderr, KILL_TAIL_LINES, tokenLimit) : "";
        if (stdout) {
          parts.push("", "--- stdout (last output) ---", stdout);
        }
        if (stderr) {
          parts.push("", "--- stderr (last output) ---", stderr);
        }
      }
      span.end({ success: true }, { exitCode: handle?.exitCode ?? 137 });
      return parts.join("\n");
    } catch (err) {
      span.error(err);
      throw err;
    }
  }
});

// src/workspace/tools/tree-formatter.ts
async function formatAsTree(fs6, path9, options) {
  const maxDepth = options?.maxDepth ?? Infinity;
  const showHidden = options?.showHidden ?? false;
  const dirsOnly = options?.dirsOnly ?? false;
  const exclude = options?.exclude;
  const extension = options?.extension;
  const pattern = options?.pattern;
  const respectGitignore = options?.respectGitignore ?? true;
  let ignoreFilter = options?.ignoreFilter;
  if (!ignoreFilter && respectGitignore) {
    const rawFilter = await loadGitignore(fs6);
    if (rawFilter) {
      const normalizedPath = path9.replace(/^\.\//, "").replace(/^\//, "").replace(/\/$/, "");
      const targetIsIgnored = normalizedPath && rawFilter(normalizedPath + "/");
      ignoreFilter = targetIsIgnored ? void 0 : rawFilter;
    }
  }
  let globMatcher;
  if (pattern) {
    const patterns = Array.isArray(pattern) ? pattern : [pattern];
    globMatcher = createGlobMatcher(patterns, { dot: showHidden });
  }
  const lines = ["."];
  const paths = [];
  let dirCount = 0;
  let fileCount = 0;
  let truncated = false;
  async function buildTree(currentPath, depth) {
    if (depth >= maxDepth) {
      truncated = true;
      return;
    }
    let entries;
    try {
      entries = await fs6.readdir(currentPath);
    } catch (error) {
      if (depth === 0) {
        throw error;
      }
      return;
    }
    let filtered = entries;
    if (!showHidden) {
      filtered = filtered.filter((e) => !e.name.startsWith("."));
    }
    if (exclude) {
      const patterns = Array.isArray(exclude) ? exclude : [exclude];
      filtered = filtered.filter((e) => {
        return !patterns.some((pattern2) => e.name.includes(pattern2));
      });
    }
    if (ignoreFilter) {
      filtered = filtered.filter((e) => {
        const relativePath = getRelativePath("", currentPath, e.name);
        const checkPath = e.type === "directory" ? `${relativePath}/` : relativePath;
        return !ignoreFilter(checkPath);
      });
    }
    if (dirsOnly) {
      filtered = filtered.filter((e) => e.type === "directory");
    }
    if (extension && !dirsOnly) {
      const extensions = Array.isArray(extension) ? extension : [extension];
      filtered = filtered.filter((e) => {
        if (e.type === "directory") return true;
        return extensions.some((ext) => {
          const normalizedExt = ext.startsWith(".") ? ext : `.${ext}`;
          return e.name.endsWith(normalizedExt);
        });
      });
    }
    if (globMatcher && !dirsOnly) {
      filtered = filtered.filter((e) => {
        if (e.type === "directory") return true;
        const relativePath = getRelativePath(path9, currentPath, e.name);
        return globMatcher(relativePath);
      });
    }
    filtered.sort((a, b) => {
      if (a.type === "directory" && b.type !== "directory") return -1;
      if (a.type !== "directory" && b.type === "directory") return 1;
      return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
    });
    const indent = "	".repeat(depth);
    for (let i = 0; i < filtered.length; i++) {
      const entry = filtered[i];
      const displayName = entry.isSymlink && entry.symlinkTarget ? `${entry.name} -> ${entry.symlinkTarget}` : entry.name;
      lines.push(`${indent}${displayName}`);
      paths.push(getRelativePath(path9, currentPath, entry.name));
      if (entry.type === "directory") {
        dirCount++;
        if (!entry.isSymlink) {
          const childPath = joinPath2(currentPath, entry.name);
          await buildTree(childPath, depth + 1);
        }
      } else {
        fileCount++;
      }
    }
  }
  await buildTree(path9, 0);
  const dirPart = dirCount === 1 ? "1 directory" : `${dirCount} directories`;
  const filePart = fileCount === 1 ? "1 file" : `${fileCount} files`;
  let summary = `${dirPart}, ${filePart}`;
  if (truncated) {
    summary += ` (truncated at depth ${maxDepth})`;
  }
  return {
    tree: lines.join("\n"),
    summary,
    dirCount,
    fileCount,
    truncated,
    paths
  };
}
function getRelativePath(rootPath, currentPath, entryName) {
  const isRootEquivalent = (p) => p === "/" || p === "" || p === ".";
  const entryPath = currentPath === rootPath || isRootEquivalent(currentPath) && isRootEquivalent(rootPath) ? entryName : `${currentPath === "/" ? "" : currentPath}/${entryName}`;
  if (isRootEquivalent(rootPath)) {
    const cleaned = entryPath.replace(/^\.\//, "");
    return cleaned.startsWith("/") ? cleaned.slice(1) : cleaned;
  }
  const relativePath = entryPath.startsWith(rootPath + "/") ? entryPath.slice(rootPath.length + 1) : entryPath;
  return relativePath || entryPath;
}
function joinPath2(base, name) {
  if (base === "" || base === "./" || base === ".") {
    return name;
  }
  if (base === "/") {
    return `/${name}`;
  }
  return `${base}/${name}`;
}

// src/workspace/tools/list-files.ts
var listFilesTool = createTool({
  id: WORKSPACE_TOOLS.FILESYSTEM.LIST_FILES,
  description: `List files and directories in the workspace filesystem.
Returns a compact tab-indented listing for efficient token usage.
Options mirror common tree command flags for familiarity.

Examples:
- List workspace root: { path: "." }
- Deep listing: { path: "src", maxDepth: 5 }
- Directories only: { path: ".", dirsOnly: true }
- Exclude node_modules: { path: ".", exclude: "node_modules" }
- Find TypeScript files: { path: "src", pattern: "**/*.ts" }
- Find config files: { path: ".", pattern: "*.config.{js,ts}" }
- Multiple patterns: { path: ".", pattern: ["**/*.ts", "**/*.tsx"] }

To list ALL files, omit the pattern parameter \u2014 do NOT pass pattern: "*".`,
  inputSchema: object({
    path: string().default(".").describe("Directory path to list"),
    maxDepth: number().optional().default(2).describe("Maximum depth to descend (default: 2). Similar to tree -L flag."),
    showHidden: boolean().optional().default(false).describe('Show hidden files starting with "." (default: false). Similar to tree -a flag.'),
    dirsOnly: boolean().optional().default(false).describe("List directories only, no files (default: false). Similar to tree -d flag."),
    exclude: string().optional().describe('Pattern to exclude (e.g., "node_modules"). Similar to tree -I flag.'),
    extension: string().optional().describe('Filter by file extension (e.g., ".ts"). Similar to tree -P flag.'),
    pattern: union([string(), array(string())]).optional().describe(
      'Glob pattern(s) to filter files. Omit this parameter to list all files (do NOT pass "*"). Use "**/*.ext" to match files recursively across directories. "*" only matches within a single directory level (standard glob). Glob patterns only filter files \u2014 directories are always shown to preserve tree structure. Examples: "**/*.ts", "src/**/*.test.ts", "*.config.{js,ts}".'
    ),
    respectGitignore: boolean().optional().default(true).describe("Respect .gitignore in the listed directory (default: true).")
  }),
  execute: async ({ path: path9 = ".", maxDepth = 2, showHidden, dirsOnly, exclude, extension, pattern, respectGitignore }, context) => {
    const { workspace, filesystem } = requireFilesystem(context);
    await emitWorkspaceMetadata(context, WORKSPACE_TOOLS.FILESYSTEM.LIST_FILES);
    const normalizedPattern = (() => {
      if (pattern === void 0) return void 0;
      if (Array.isArray(pattern)) {
        const cleaned = pattern.filter((p) => typeof p === "string" && p.trim().length > 0);
        return cleaned.length > 0 ? cleaned : void 0;
      }
      return pattern.trim().length > 0 ? pattern : void 0;
    })();
    const span = startWorkspaceSpan(context, workspace, {
      category: "filesystem",
      operation: "listFiles",
      input: { path: path9, maxDepth, pattern: normalizedPattern },
      attributes: { filesystemProvider: filesystem.provider }
    });
    try {
      const result = await formatAsTree(filesystem, path9, {
        maxDepth,
        showHidden,
        dirsOnly,
        exclude: exclude || void 0,
        extension: extension || void 0,
        pattern: normalizedPattern,
        respectGitignore
      });
      const output = await applyTokenLimit(
        `${result.tree}

${result.summary}`,
        workspace.getToolsConfig()?.[WORKSPACE_TOOLS.FILESYSTEM.LIST_FILES]?.maxOutputTokens ?? 1e3,
        "end"
      );
      span.end({ success: true }, { resultCount: result.fileCount });
      return output;
    } catch (err) {
      span.error(err);
      throw err;
    }
  }
});
var CURSOR_MARKER = "<<<";
async function getLinePreview(filePath, lineNumber) {
  try {
    const content = await fs2__default.readFile(filePath, "utf-8");
    const lines = content.split("\n");
    const line = lines[lineNumber - 1];
    return line?.trim() ?? null;
  } catch {
    return null;
  }
}
function getAbsolutePath(workspacePath, lspRoot, resolveAbsolutePath) {
  const resolvedPath = resolveAbsolutePath?.(workspacePath);
  if (resolvedPath) {
    return resolvedPath;
  }
  if (nodePath__default.isAbsolute(workspacePath)) {
    return workspacePath;
  }
  return nodePath__default.resolve(lspRoot, workspacePath);
}
function locationUriToPath(uri) {
  if (!uri.startsWith("file://")) {
    return null;
  }
  try {
    return fileURLToPath(uri);
  } catch {
    return null;
  }
}
function locationKey(location) {
  return `${location.path}:L${location.line}`;
}
function compressPath(filePath) {
  const cwd = process.cwd();
  if (filePath.startsWith(cwd)) {
    return "$cwd" + filePath.slice(cwd.length);
  }
  return filePath;
}
var lspInspectTool = createTool({
  id: WORKSPACE_TOOLS.LSP.LSP_INSPECT,
  description: "Inspect code at a specific symbol position using the Language Server Protocol. Provide an absolute file path, a 1-indexed line number, and the exact line content with <<< marking the cursor position. Exactly one <<< marker is required. Returns hover information, any diagnostics reported on that line, plus definition and implementation locations when available. Use this for type information, symbol navigation, and go-to-definition; use view to read the surrounding implementation.",
  inputSchema: object({
    path: string().describe("Absolute path to the file"),
    line: number().int().positive().describe("Line number (1-indexed)"),
    match: string().describe(
      'Line content with <<< marking the cursor position. Exactly one <<< marker is required. Example: "const foo = <<<bar()" means cursor is at bar'
    )
  }),
  execute: async ({ path: filePath, line, match }, context) => {
    const workspace = requireWorkspace(context);
    await emitWorkspaceMetadata(context, WORKSPACE_TOOLS.LSP.LSP_INSPECT);
    const span = startWorkspaceSpan(context, workspace, {
      category: "filesystem",
      operation: "lspInspect",
      input: { path: filePath, line },
      attributes: {}
    });
    const cursorPositions = [];
    let searchStart = 0;
    while (true) {
      const pos = match.indexOf(CURSOR_MARKER, searchStart);
      if (pos === -1) break;
      cursorPositions.push(pos);
      searchStart = pos + CURSOR_MARKER.length;
    }
    if (cursorPositions.length === 0) {
      span.end({ success: false });
      return {
        error: `No <<< cursor marker found in match`
      };
    }
    if (cursorPositions.length > 1) {
      span.end({ success: false });
      return {
        error: `Multiple <<< markers found (found ${cursorPositions.length}, expected 1)`
      };
    }
    const character = cursorPositions[0] + 1;
    const lspManager = workspace.lsp;
    if (!lspManager) {
      span.end({ success: false });
      return {
        error: "LSP is not configured for this workspace. Enable LSP in workspace config to use this tool."
      };
    }
    const absolutePath = getAbsolutePath(
      filePath,
      lspManager.root,
      workspace.filesystem?.resolveAbsolutePath?.bind(workspace.filesystem)
    );
    let fileContent = "";
    try {
      fileContent = await fs2__default.readFile(absolutePath, "utf-8");
    } catch {
      fileContent = "";
    }
    let queryResult;
    try {
      queryResult = await lspManager.prepareQuery(absolutePath);
    } catch (err) {
      span.end({ success: false });
      return {
        error: `Failed to initialize LSP client: ${err instanceof Error ? err.message : String(err)}`
      };
    }
    if (!queryResult) {
      span.end({ success: false });
      return {
        error: `No language server available for files of this type: ${filePath}`
      };
    }
    const { client, uri } = queryResult;
    const position = { line: line - 1, character: character - 1 };
    const result = {};
    try {
      const hoverResult = await client.queryHover(uri, position).catch(() => null);
      if (hoverResult) {
        const contents = hoverResult.contents;
        if (contents) {
          if (typeof contents === "string") {
            result.hover = { value: contents, kind: "plaintext" };
          } else if (Array.isArray(contents)) {
            const first = contents[0];
            if (typeof first === "string") {
              result.hover = { value: first, kind: "plaintext" };
            } else if (first?.value) {
              result.hover = { value: first.value, kind: first.kind ?? "markdown" };
            }
          } else if (contents.value) {
            result.hover = { value: contents.value, kind: contents.kind ?? "markdown" };
          }
        }
      }
      const diagnosticsPromise = fileContent ? Promise.resolve().then(() => {
        client.notifyChange(absolutePath, fileContent, 1);
        return client.waitForDiagnostics(absolutePath, 5e3, true);
      }).catch(() => []) : Promise.resolve([]);
      const [diagnosticsResult, definitionResult, implResult] = await Promise.all([
        diagnosticsPromise,
        client.queryDefinition(uri, position).catch(() => []),
        client.queryImplementation(uri, position).catch(() => [])
      ]);
      if (diagnosticsResult && diagnosticsResult.length > 0) {
        const lineDiagnostics = diagnosticsResult.map((diagnostic) => ({
          line: typeof diagnostic.line === "number" ? diagnostic.line : (diagnostic.range?.start?.line ?? -1) + 1,
          severity: typeof diagnostic.severity === "number" ? diagnostic.severity === 1 ? "error" : diagnostic.severity === 2 ? "warning" : diagnostic.severity === 3 ? "info" : "hint" : diagnostic.severity,
          message: diagnostic.message,
          source: diagnostic.source ?? null
        })).filter((diagnostic) => diagnostic.line === line).map(({ severity, message, source }) => ({ severity, message, source }));
        if (lineDiagnostics.length > 0) {
          result.diagnostics = lineDiagnostics;
        }
      }
      const definitionLocations = definitionResult.map((loc) => ({
        uri: loc.uri ?? loc.targetUri,
        range: loc.range ?? loc.targetRange
      })).map((loc) => {
        const resolvedPath = loc.uri ? locationUriToPath(String(loc.uri)) : null;
        return resolvedPath ? {
          path: resolvedPath,
          line: (loc.range?.start?.line ?? 0) + 1,
          character: (loc.range?.start?.character ?? 0) + 1
        } : null;
      }).filter((loc) => Boolean(loc)).filter((loc) => !(loc.path === absolutePath && loc.line === line));
      if (definitionLocations.length > 0) {
        const previews = await Promise.all(definitionLocations.map((loc) => getLinePreview(loc.path, loc.line)));
        result.definition = definitionLocations.map((loc, i) => ({
          location: `${compressPath(loc.path)}:L${loc.line}:C${loc.character}`,
          preview: previews[i]
        }));
      }
      const definitionKeys = new Set(definitionLocations.map(locationKey));
      const implementationLocations = implResult.map((loc) => ({
        uri: loc.uri ?? loc.targetUri,
        range: loc.range ?? loc.targetRange
      })).map((loc) => {
        const resolvedPath = loc.uri ? locationUriToPath(String(loc.uri)) : null;
        return resolvedPath ? {
          path: resolvedPath,
          line: (loc.range?.start?.line ?? 0) + 1,
          character: (loc.range?.start?.character ?? 0) + 1
        } : null;
      }).filter((loc) => Boolean(loc)).filter((loc) => !definitionKeys.has(locationKey(loc)) && !(loc.path === absolutePath && loc.line === line));
      if (implementationLocations.length > 0) {
        result.implementation = implementationLocations.map(
          (loc) => `${compressPath(loc.path)}:L${loc.line}:C${loc.character}`
        );
      }
    } catch (err) {
      result.error = `LSP query failed: ${err instanceof Error ? err.message : String(err)}`;
    } finally {
      client.notifyClose(absolutePath);
    }
    span.end({ success: !result.error });
    return result;
  }
});
var mkdirTool = createTool({
  id: WORKSPACE_TOOLS.FILESYSTEM.MKDIR,
  description: "Create a directory in the workspace filesystem",
  inputSchema: object({
    path: string().describe("The path of the directory to create"),
    recursive: boolean().optional().default(true).describe("Whether to create parent directories if they do not exist")
  }),
  execute: async ({ path: path9, recursive }, context) => {
    const { workspace, filesystem } = requireFilesystem(context);
    await emitWorkspaceMetadata(context, WORKSPACE_TOOLS.FILESYSTEM.MKDIR);
    const span = startWorkspaceSpan(context, workspace, {
      category: "filesystem",
      operation: "mkdir",
      input: { path: path9, recursive },
      attributes: { filesystemProvider: filesystem.provider }
    });
    try {
      if (filesystem.readOnly) {
        throw new WorkspaceReadOnlyError("mkdir");
      }
      await filesystem.mkdir(path9, { recursive });
      span.end({ success: true });
      return `Created directory ${path9}`;
    } catch (err) {
      span.error(err);
      throw err;
    }
  }
});
var readFileTool = createTool({
  id: WORKSPACE_TOOLS.FILESYSTEM.READ_FILE,
  description: "Read the contents of a file from the workspace filesystem. Use offset/limit parameters to read specific line ranges for large files.",
  inputSchema: object({
    path: string().describe('The path to the file to read (e.g., "/data/config.json")'),
    encoding: _enum(["utf-8", "utf8", "base64", "hex", "binary"]).optional().describe("The encoding to use when reading the file. Defaults to utf-8 for text files."),
    offset: number().optional().describe("Line number to start reading from (1-indexed). If omitted, starts from line 1."),
    limit: number().optional().describe("Maximum number of lines to read. If omitted, reads to the end of the file."),
    showLineNumbers: boolean().optional().default(true).describe("Whether to prefix each line with its line number (default: true)")
  }),
  execute: async ({ path: path9, encoding, offset, limit, showLineNumbers }, context) => {
    const { workspace, filesystem } = requireFilesystem(context);
    await emitWorkspaceMetadata(context, WORKSPACE_TOOLS.FILESYSTEM.READ_FILE);
    const span = startWorkspaceSpan(context, workspace, {
      category: "filesystem",
      operation: "readFile",
      input: { path: path9, encoding, offset, limit },
      attributes: { filesystemProvider: filesystem.provider }
    });
    try {
      const effectiveEncoding = encoding ?? "utf-8";
      const fullContent = await filesystem.readFile(path9, { encoding: effectiveEncoding });
      const stat4 = await filesystem.stat(path9);
      const isTextEncoding = !encoding || encoding === "utf-8" || encoding === "utf8";
      const tokenLimit = workspace.getToolsConfig()?.[WORKSPACE_TOOLS.FILESYSTEM.READ_FILE]?.maxOutputTokens;
      if (!isTextEncoding) {
        const output2 = await applyTokenLimit(
          `${stat4.path} (${stat4.size} bytes, ${effectiveEncoding})
${fullContent}`,
          tokenLimit,
          "end"
        );
        span.end({ success: true }, { bytesTransferred: stat4.size });
        return output2;
      }
      if (typeof fullContent !== "string") {
        const output2 = await applyTokenLimit(
          `${stat4.path} (${stat4.size} bytes, base64)
${fullContent.toString("base64")}`,
          tokenLimit,
          "end"
        );
        span.end({ success: true }, { bytesTransferred: stat4.size });
        return output2;
      }
      const hasLineRange = offset !== void 0 || limit !== void 0;
      const result = extractLinesWithLimit(fullContent, offset, limit);
      const shouldShowLineNumbers = showLineNumbers !== false;
      const formattedContent = shouldShowLineNumbers ? formatWithLineNumbers(result.content, result.lines.start) : result.content;
      let header;
      if (hasLineRange) {
        header = `${stat4.path} (lines ${result.lines.start}-${result.lines.end} of ${result.totalLines}, ${stat4.size} bytes)`;
      } else {
        header = `${stat4.path} (${stat4.size} bytes)`;
      }
      const output = await applyTokenLimit(`${header}
${formattedContent}`, tokenLimit, "end");
      span.end({ success: true }, { bytesTransferred: stat4.size });
      return output;
    } catch (err) {
      span.error(err);
      throw err;
    }
  }
});
var searchTool = createTool({
  id: WORKSPACE_TOOLS.SEARCH.SEARCH,
  description: "Search indexed content in the workspace. Supports keyword (BM25), semantic (vector), and hybrid search modes.",
  inputSchema: object({
    query: string().describe("The search query string"),
    topK: number().optional().default(5).describe("Maximum number of results to return"),
    mode: _enum(["bm25", "vector", "hybrid"]).optional().describe("Search mode: bm25 for keyword search, vector for semantic search, hybrid for both combined"),
    minScore: number().optional().describe("Minimum score threshold (0-1 for normalized scores)")
  }),
  execute: async ({ query, topK, mode, minScore }, context) => {
    const workspace = requireWorkspace(context);
    await emitWorkspaceMetadata(context, WORKSPACE_TOOLS.SEARCH.SEARCH);
    const span = startWorkspaceSpan(context, workspace, {
      category: "search",
      operation: "search",
      input: { query, topK, mode, minScore },
      attributes: {}
    });
    try {
      const results = await workspace.search(query, {
        topK,
        mode,
        minScore
      });
      const effectiveMode = mode ?? (workspace.canHybrid ? "hybrid" : workspace.canVector ? "vector" : "bm25");
      const lines = results.map((r) => {
        const lineInfo = r.lineRange ? `:${r.lineRange.start}-${r.lineRange.end}` : "";
        return `${r.id}${lineInfo}: ${r.content}`;
      });
      lines.push("---");
      lines.push(`${results.length} result${results.length !== 1 ? "s" : ""} (${effectiveMode} search)`);
      span.end({ success: true }, { resultCount: results.length });
      return lines.join("\n");
    } catch (err) {
      span.error(err);
      throw err;
    }
  }
});
var writeFileTool = createTool({
  id: WORKSPACE_TOOLS.FILESYSTEM.WRITE_FILE,
  description: "Write content to a file in the workspace filesystem. Creates parent directories if needed.",
  inputSchema: object({
    path: string().describe('The path where to write the file (e.g., "/data/output.txt")'),
    content: string().describe("The content to write to the file"),
    overwrite: boolean().optional().default(true).describe("Whether to overwrite the file if it already exists")
  }),
  execute: async ({ path: path9, content, overwrite }, context) => {
    const { workspace, filesystem } = requireFilesystem(context);
    await emitWorkspaceMetadata(context, WORKSPACE_TOOLS.FILESYSTEM.WRITE_FILE);
    const span = startWorkspaceSpan(context, workspace, {
      category: "filesystem",
      operation: "writeFile",
      input: { path: path9, overwrite, contentLength: content.length },
      attributes: { filesystemProvider: filesystem.provider }
    });
    try {
      if (filesystem.readOnly) {
        throw new WorkspaceReadOnlyError("write_file");
      }
      await filesystem.writeFile(path9, content, {
        overwrite,
        expectedMtime: context?.__expectedMtime
      });
      const size = Buffer.byteLength(content, "utf-8");
      let output = `Wrote ${size} bytes to ${path9}`;
      output += await getEditDiagnosticsText(workspace, path9, content);
      span.end({ success: true }, { bytesTransferred: size });
      return output;
    } catch (err) {
      span.error(err);
      throw err;
    }
  }
});

// src/workspace/tools/tools.ts
async function resolveDynamicValue(value, context, safeDefault) {
  if (value === void 0) return safeDefault;
  if (typeof value === "boolean") return value;
  if (!context) return safeDefault;
  try {
    return await value(context);
  } catch (error) {
    console.warn("[Workspace Tools] Dynamic config function threw, using safe default:", error);
    return safeDefault;
  }
}
function toPlainRequestContext(requestContext) {
  if (!requestContext) return {};
  if (typeof requestContext.entries === "function") {
    return Object.fromEntries(requestContext.entries());
  }
  return requestContext;
}
async function resolveToolConfig(toolsConfig, toolName, context) {
  let enabled = true;
  let requireApproval = false;
  let requireReadBeforeWrite;
  let maxOutputTokens;
  let name;
  if (toolsConfig) {
    if (toolsConfig.enabled !== void 0) {
      enabled = toolsConfig.enabled;
    }
    if (toolsConfig.requireApproval !== void 0) {
      requireApproval = toolsConfig.requireApproval;
    }
    const perToolConfig = toolsConfig[toolName];
    if (perToolConfig) {
      if (perToolConfig.enabled !== void 0) {
        enabled = perToolConfig.enabled;
      }
      if (perToolConfig.requireApproval !== void 0) {
        requireApproval = perToolConfig.requireApproval;
      }
      if (perToolConfig.requireReadBeforeWrite !== void 0) {
        requireReadBeforeWrite = perToolConfig.requireReadBeforeWrite;
      }
      if (perToolConfig.maxOutputTokens !== void 0) {
        maxOutputTokens = perToolConfig.maxOutputTokens;
      }
      if (perToolConfig.name !== void 0) {
        name = perToolConfig.name;
      }
    }
  }
  const resolvedEnabled = await resolveDynamicValue(enabled, context, false);
  return { enabled: resolvedEnabled, requireApproval, requireReadBeforeWrite, maxOutputTokens, name };
}
function wrapWithReadTracker(tool, workspace, readTracker, config, mode) {
  return {
    ...tool,
    execute: async (input, context = {}) => {
      if (mode === "write") {
        const record = readTracker.getReadRecord(input.path);
        if (record) {
          context = { ...context, __expectedMtime: record.modifiedAtRead };
        }
        try {
          const stat4 = await workspace.filesystem.stat(input.path);
          if (config.requireReadBeforeWrite !== void 0) {
            const shouldRequireRead = await resolveDynamicValue(
              config.requireReadBeforeWrite,
              { args: input, requestContext: context.requestContext ?? {}, workspace },
              true
            );
            if (shouldRequireRead) {
              const check = readTracker.needsReRead(input.path, stat4.modifiedAt);
              if (check.needsReRead) {
                throw new FileReadRequiredError(input.path, check.reason);
              }
            }
          }
        } catch (error) {
          if (!(error instanceof FileNotFoundError)) {
            throw error;
          }
        }
      }
      const result = await tool.execute(input, context);
      if (mode === "read") {
        try {
          const stat4 = await workspace.filesystem.stat(input.path);
          readTracker.recordRead(input.path, stat4.modifiedAt);
        } catch {
        }
      } else if (mode === "write") {
        readTracker.clearReadRecord(input.path);
      }
      return result;
    }
  };
}
function wrapWithWriteLock(tool, writeLock) {
  return {
    ...tool,
    execute: async (input, context = {}) => {
      if (!input.path) {
        throw new Error("wrapWithWriteLock: input.path is required");
      }
      return writeLock.withLock(input.path, () => tool.execute(input, context));
    }
  };
}
async function createWorkspaceTools(workspace, configContext) {
  const effectiveConfigContext = configContext ? { ...configContext, requestContext: toPlainRequestContext(configContext.requestContext) } : { requestContext: {}, workspace };
  const tools = {};
  const toolsConfig = workspace.getToolsConfig();
  const isReadOnly = workspace.filesystem?.readOnly ?? false;
  const writeLock = new InMemoryFileWriteLock();
  const readTracker = new InMemoryFileReadTracker();
  const addTool = async (name, tool, opts) => {
    const config = await resolveToolConfig(toolsConfig, name, effectiveConfigContext);
    if (!config.enabled) return;
    if (opts?.requireWrite && isReadOnly) return;
    let wrapped;
    if (typeof config.requireApproval === "function") {
      const approvalFn = config.requireApproval;
      wrapped = {
        ...tool,
        requireApproval: true,
        needsApprovalFn: async (args, ctx) => resolveDynamicValue(
          approvalFn,
          {
            args,
            requestContext: toPlainRequestContext(ctx?.requestContext),
            workspace: ctx?.workspace ?? workspace
          },
          true
        )
      };
    } else {
      wrapped = { ...tool, requireApproval: config.requireApproval };
    }
    if (opts?.readTrackerMode) {
      wrapped = wrapWithReadTracker(wrapped, workspace, readTracker, config, opts.readTrackerMode);
    }
    if (opts?.useWriteLock) {
      wrapped = wrapWithWriteLock(wrapped, writeLock);
    }
    const exposedName = config.name ?? name;
    if (tools[exposedName]) {
      throw new Error(
        `Duplicate workspace tool name "${exposedName}": tool "${name}" conflicts with an already-registered tool. Check your tools config for duplicate "name" values.`
      );
    }
    if (exposedName !== name && "id" in wrapped) {
      wrapped = { ...wrapped, id: exposedName };
    }
    tools[exposedName] = wrapped;
  };
  if (workspace.filesystem) {
    await addTool(WORKSPACE_TOOLS.FILESYSTEM.READ_FILE, readFileTool, { readTrackerMode: "read" });
    await addTool(WORKSPACE_TOOLS.FILESYSTEM.WRITE_FILE, writeFileTool, {
      requireWrite: true,
      readTrackerMode: "write",
      useWriteLock: true
    });
    await addTool(WORKSPACE_TOOLS.FILESYSTEM.EDIT_FILE, editFileTool, {
      requireWrite: true,
      readTrackerMode: "write",
      useWriteLock: true
    });
    await addTool(WORKSPACE_TOOLS.FILESYSTEM.LIST_FILES, listFilesTool);
    await addTool(WORKSPACE_TOOLS.FILESYSTEM.DELETE, deleteFileTool, { requireWrite: true, useWriteLock: true });
    await addTool(WORKSPACE_TOOLS.FILESYSTEM.FILE_STAT, fileStatTool);
    await addTool(WORKSPACE_TOOLS.FILESYSTEM.MKDIR, mkdirTool, { requireWrite: true });
    await addTool(WORKSPACE_TOOLS.FILESYSTEM.GREP, grepTool);
    if (isAstGrepAvailable()) {
      await addTool(WORKSPACE_TOOLS.FILESYSTEM.AST_EDIT, astEditTool, {
        requireWrite: true,
        readTrackerMode: "write",
        useWriteLock: true
      });
    }
  }
  if (workspace.canBM25 || workspace.canVector) {
    await addTool(WORKSPACE_TOOLS.SEARCH.SEARCH, searchTool);
    await addTool(WORKSPACE_TOOLS.SEARCH.INDEX, indexContentTool, { requireWrite: true });
  }
  if (workspace.sandbox) {
    if (workspace.sandbox.executeCommand) {
      const baseTool = workspace.sandbox.processes ? executeCommandWithBackgroundTool : executeCommandTool;
      await addTool(WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND, baseTool);
    }
    if (workspace.sandbox.processes) {
      await addTool(WORKSPACE_TOOLS.SANDBOX.GET_PROCESS_OUTPUT, getProcessOutputTool);
      await addTool(WORKSPACE_TOOLS.SANDBOX.KILL_PROCESS, killProcessTool);
    }
  }
  await addTool(WORKSPACE_TOOLS.LSP.LSP_INSPECT, lspInspectTool);
  return tools;
}

export { LocalSkillSource as L, createSkillTools as a, createWorkspaceTools as c };
//# sourceMappingURL=chunk-DNLZ6XAZ.mjs.map
