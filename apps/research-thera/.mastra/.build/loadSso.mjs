import { x as resolveAwsSdkSigV4Config, y as getSmithyContext, z as EndpointCache, A as resolveEndpoint, B as awsEndpointFunctions, C as customEndpointFunctions, D as ServiceException, T as TypeRegistry, t as toUtf8, F as NoOpLogger, G as AwsSdkSigV4Signer, o as toBase64, j as fromBase64, I as emitWarningIfUnsupportedVersion, J as resolveDefaultsModeConfig, K as emitWarningIfUnsupportedVersion$1, M as streamCollector, O as calculateBodyLength, Q as NODE_APP_ID_CONFIG_OPTIONS, R as NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS, V as NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS, W as Hash, X as NODE_RETRY_MODE_CONFIG_OPTIONS, Y as DEFAULT_RETRY_MODE, Z as NodeHttpHandler, _ as NODE_REGION_CONFIG_FILE_OPTIONS, $ as NODE_REGION_CONFIG_OPTIONS, a0 as NODE_MAX_ATTEMPT_CONFIG_OPTIONS, a1 as createDefaultUserAgentProvider, a2 as NODE_AUTH_SCHEME_PREFERENCE_OPTIONS, a3 as loadConfigsForDefaultMode, a4 as getAwsRegionExtensionConfiguration, a5 as getDefaultExtensionConfiguration, a6 as getHttpHandlerExtensionConfiguration, a7 as resolveAwsRegionExtensionConfiguration, a8 as resolveDefaultRuntimeConfig, a9 as resolveHttpHandlerRuntimeConfig, aa as Client, ab as resolveUserAgentConfig, ac as resolveRetryConfig, ad as resolveRegionConfig, ae as resolveEndpointConfig, af as getSchemaSerdePlugin, ag as getUserAgentPlugin, ah as getRetryPlugin, ai as getContentLengthPlugin, aj as getHostHeaderPlugin, ak as getLoggerPlugin, al as getRecursionDetectionPlugin, am as getHttpAuthSchemeEndpointRuleSetPlugin, an as DefaultIdentityProviderConfig, ao as getHttpSigningPlugin, ap as resolveHostHeaderConfig, aq as Command, ar as getEndpointPlugin } from './client-s3.mjs';
import { n as normalizeProvider, a as fromUtf8, p as parseUrl, h as loadConfig } from './SignatureV4MultiRegion.mjs';
import { N as NoAuthSigner, p as packageInfo } from './package.mjs';
import { A as AwsRestJsonProtocol } from './AwsRestJsonProtocol.mjs';

const defaultSSOHttpAuthSchemeParametersProvider = async (config, context, input) => {
    return {
        operation: getSmithyContext(context).operation,
        region: (await normalizeProvider(config.region)()) ||
            (() => {
                throw new Error("expected `region` to be configured for `aws.auth#sigv4`");
            })(),
    };
};
function createAwsAuthSigv4HttpAuthOption(authParameters) {
    return {
        schemeId: "aws.auth#sigv4",
        signingProperties: {
            name: "awsssoportal",
            region: authParameters.region,
        },
        propertiesExtractor: (config, context) => ({
            signingProperties: {
                config,
                context,
            },
        }),
    };
}
function createSmithyApiNoAuthHttpAuthOption(authParameters) {
    return {
        schemeId: "smithy.api#noAuth",
    };
}
const defaultSSOHttpAuthSchemeProvider = (authParameters) => {
    const options = [];
    switch (authParameters.operation) {
        case "GetRoleCredentials": {
            options.push(createSmithyApiNoAuthHttpAuthOption());
            break;
        }
        default: {
            options.push(createAwsAuthSigv4HttpAuthOption(authParameters));
        }
    }
    return options;
};
const resolveHttpAuthSchemeConfig = (config) => {
    const config_0 = resolveAwsSdkSigV4Config(config);
    return Object.assign(config_0, {
        authSchemePreference: normalizeProvider(config.authSchemePreference ?? []),
    });
};

const resolveClientEndpointParameters = (options) => {
    return Object.assign(options, {
        useDualstackEndpoint: options.useDualstackEndpoint ?? false,
        useFipsEndpoint: options.useFipsEndpoint ?? false,
        defaultSigningName: "awsssoportal",
    });
};
const commonParams = {
    UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
    Endpoint: { type: "builtInParams", name: "endpoint" },
    Region: { type: "builtInParams", name: "region" },
    UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" },
};

const u = "required", v = "fn", w = "argv", x = "ref";
const a = true, b = "isSet", c = "booleanEquals", d = "error", e = "endpoint", f = "tree", g = "PartitionResult", h = "getAttr", i = { [u]: false, type: "string" }, j = { [u]: true, default: false, type: "boolean" }, k = { [x]: "Endpoint" }, l = { [v]: c, [w]: [{ [x]: "UseFIPS" }, true] }, m = { [v]: c, [w]: [{ [x]: "UseDualStack" }, true] }, n = {}, o = { [v]: h, [w]: [{ [x]: g }, "supportsFIPS"] }, p = { [x]: g }, q = { [v]: c, [w]: [true, { [v]: h, [w]: [p, "supportsDualStack"] }] }, r = [l], s = [m], t = [{ [x]: "Region" }];
const _data = {
    parameters: { Region: i, UseDualStack: j, UseFIPS: j, Endpoint: i },
    rules: [
        {
            conditions: [{ [v]: b, [w]: [k] }],
            rules: [
                { conditions: r, error: "Invalid Configuration: FIPS and custom endpoint are not supported", type: d },
                { conditions: s, error: "Invalid Configuration: Dualstack and custom endpoint are not supported", type: d },
                { endpoint: { url: k, properties: n, headers: n }, type: e },
            ],
            type: f,
        },
        {
            conditions: [{ [v]: b, [w]: t }],
            rules: [
                {
                    conditions: [{ [v]: "aws.partition", [w]: t, assign: g }],
                    rules: [
                        {
                            conditions: [l, m],
                            rules: [
                                {
                                    conditions: [{ [v]: c, [w]: [a, o] }, q],
                                    rules: [
                                        {
                                            endpoint: {
                                                url: "https://portal.sso-fips.{Region}.{PartitionResult#dualStackDnsSuffix}",
                                                properties: n,
                                                headers: n,
                                            },
                                            type: e,
                                        },
                                    ],
                                    type: f,
                                },
                                { error: "FIPS and DualStack are enabled, but this partition does not support one or both", type: d },
                            ],
                            type: f,
                        },
                        {
                            conditions: r,
                            rules: [
                                {
                                    conditions: [{ [v]: c, [w]: [o, a] }],
                                    rules: [
                                        {
                                            conditions: [{ [v]: "stringEquals", [w]: [{ [v]: h, [w]: [p, "name"] }, "aws-us-gov"] }],
                                            endpoint: { url: "https://portal.sso.{Region}.amazonaws.com", properties: n, headers: n },
                                            type: e,
                                        },
                                        {
                                            endpoint: {
                                                url: "https://portal.sso-fips.{Region}.{PartitionResult#dnsSuffix}",
                                                properties: n,
                                                headers: n,
                                            },
                                            type: e,
                                        },
                                    ],
                                    type: f,
                                },
                                { error: "FIPS is enabled but this partition does not support FIPS", type: d },
                            ],
                            type: f,
                        },
                        {
                            conditions: s,
                            rules: [
                                {
                                    conditions: [q],
                                    rules: [
                                        {
                                            endpoint: {
                                                url: "https://portal.sso.{Region}.{PartitionResult#dualStackDnsSuffix}",
                                                properties: n,
                                                headers: n,
                                            },
                                            type: e,
                                        },
                                    ],
                                    type: f,
                                },
                                { error: "DualStack is enabled but this partition does not support DualStack", type: d },
                            ],
                            type: f,
                        },
                        {
                            endpoint: { url: "https://portal.sso.{Region}.{PartitionResult#dnsSuffix}", properties: n, headers: n },
                            type: e,
                        },
                    ],
                    type: f,
                },
            ],
            type: f,
        },
        { error: "Invalid Configuration: Missing Region", type: d },
    ],
};
const ruleSet = _data;

const cache = new EndpointCache({
    size: 50,
    params: ["Endpoint", "Region", "UseDualStack", "UseFIPS"],
});
const defaultEndpointResolver = (endpointParams, context = {}) => {
    return cache.get(endpointParams, () => resolveEndpoint(ruleSet, {
        endpointParams: endpointParams,
        logger: context.logger,
    }));
};
customEndpointFunctions.aws = awsEndpointFunctions;

class SSOServiceException extends ServiceException {
    constructor(options) {
        super(options);
        Object.setPrototypeOf(this, SSOServiceException.prototype);
    }
}

class InvalidRequestException extends SSOServiceException {
    name = "InvalidRequestException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "InvalidRequestException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, InvalidRequestException.prototype);
    }
}
class ResourceNotFoundException extends SSOServiceException {
    name = "ResourceNotFoundException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "ResourceNotFoundException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ResourceNotFoundException.prototype);
    }
}
class TooManyRequestsException extends SSOServiceException {
    name = "TooManyRequestsException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "TooManyRequestsException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, TooManyRequestsException.prototype);
    }
}
class UnauthorizedException extends SSOServiceException {
    name = "UnauthorizedException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "UnauthorizedException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, UnauthorizedException.prototype);
    }
}

const _ATT = "AccessTokenType";
const _GRC = "GetRoleCredentials";
const _GRCR = "GetRoleCredentialsRequest";
const _GRCRe = "GetRoleCredentialsResponse";
const _IRE = "InvalidRequestException";
const _RC = "RoleCredentials";
const _RNFE = "ResourceNotFoundException";
const _SAKT = "SecretAccessKeyType";
const _STT = "SessionTokenType";
const _TMRE = "TooManyRequestsException";
const _UE = "UnauthorizedException";
const _aI = "accountId";
const _aKI = "accessKeyId";
const _aT = "accessToken";
const _ai = "account_id";
const _c = "client";
const _e = "error";
const _ex = "expiration";
const _h = "http";
const _hE = "httpError";
const _hH = "httpHeader";
const _hQ = "httpQuery";
const _m = "message";
const _rC = "roleCredentials";
const _rN = "roleName";
const _rn = "role_name";
const _s = "smithy.ts.sdk.synthetic.com.amazonaws.sso";
const _sAK = "secretAccessKey";
const _sT = "sessionToken";
const _xasbt = "x-amz-sso_bearer_token";
const n0 = "com.amazonaws.sso";
const _s_registry = TypeRegistry.for(_s);
var SSOServiceException$ = [-3, _s, "SSOServiceException", 0, [], []];
_s_registry.registerError(SSOServiceException$, SSOServiceException);
const n0_registry = TypeRegistry.for(n0);
var InvalidRequestException$ = [-3, n0, _IRE, { [_e]: _c, [_hE]: 400 }, [_m], [0]];
n0_registry.registerError(InvalidRequestException$, InvalidRequestException);
var ResourceNotFoundException$ = [-3, n0, _RNFE, { [_e]: _c, [_hE]: 404 }, [_m], [0]];
n0_registry.registerError(ResourceNotFoundException$, ResourceNotFoundException);
var TooManyRequestsException$ = [-3, n0, _TMRE, { [_e]: _c, [_hE]: 429 }, [_m], [0]];
n0_registry.registerError(TooManyRequestsException$, TooManyRequestsException);
var UnauthorizedException$ = [-3, n0, _UE, { [_e]: _c, [_hE]: 401 }, [_m], [0]];
n0_registry.registerError(UnauthorizedException$, UnauthorizedException);
const errorTypeRegistries = [_s_registry, n0_registry];
var AccessTokenType = [0, n0, _ATT, 8, 0];
var SecretAccessKeyType = [0, n0, _SAKT, 8, 0];
var SessionTokenType = [0, n0, _STT, 8, 0];
var GetRoleCredentialsRequest$ = [
    3,
    n0,
    _GRCR,
    0,
    [_rN, _aI, _aT],
    [
        [0, { [_hQ]: _rn }],
        [0, { [_hQ]: _ai }],
        [() => AccessTokenType, { [_hH]: _xasbt }],
    ],
    3,
];
var GetRoleCredentialsResponse$ = [
    3,
    n0,
    _GRCRe,
    0,
    [_rC],
    [[() => RoleCredentials$, 0]],
];
var RoleCredentials$ = [
    3,
    n0,
    _RC,
    0,
    [_aKI, _sAK, _sT, _ex],
    [0, [() => SecretAccessKeyType, 0], [() => SessionTokenType, 0], 1],
];
var GetRoleCredentials$ = [
    9,
    n0,
    _GRC,
    { [_h]: ["GET", "/federation/credentials", 200] },
    () => GetRoleCredentialsRequest$,
    () => GetRoleCredentialsResponse$,
];

const getRuntimeConfig$1 = (config) => {
    return {
        apiVersion: "2019-06-10",
        base64Decoder: config?.base64Decoder ?? fromBase64,
        base64Encoder: config?.base64Encoder ?? toBase64,
        disableHostPrefix: config?.disableHostPrefix ?? false,
        endpointProvider: config?.endpointProvider ?? defaultEndpointResolver,
        extensions: config?.extensions ?? [],
        httpAuthSchemeProvider: config?.httpAuthSchemeProvider ?? defaultSSOHttpAuthSchemeProvider,
        httpAuthSchemes: config?.httpAuthSchemes ?? [
            {
                schemeId: "aws.auth#sigv4",
                identityProvider: (ipc) => ipc.getIdentityProvider("aws.auth#sigv4"),
                signer: new AwsSdkSigV4Signer(),
            },
            {
                schemeId: "smithy.api#noAuth",
                identityProvider: (ipc) => ipc.getIdentityProvider("smithy.api#noAuth") || (async () => ({})),
                signer: new NoAuthSigner(),
            },
        ],
        logger: config?.logger ?? new NoOpLogger(),
        protocol: config?.protocol ?? AwsRestJsonProtocol,
        protocolSettings: config?.protocolSettings ?? {
            defaultNamespace: "com.amazonaws.sso",
            errorTypeRegistries,
            version: "2019-06-10",
            serviceTarget: "SWBPortalService",
        },
        serviceId: config?.serviceId ?? "SSO",
        urlParser: config?.urlParser ?? parseUrl,
        utf8Decoder: config?.utf8Decoder ?? fromUtf8,
        utf8Encoder: config?.utf8Encoder ?? toUtf8,
    };
};

const getRuntimeConfig = (config) => {
    emitWarningIfUnsupportedVersion(process.version);
    const defaultsMode = resolveDefaultsModeConfig(config);
    const defaultConfigProvider = () => defaultsMode().then(loadConfigsForDefaultMode);
    const clientSharedValues = getRuntimeConfig$1(config);
    emitWarningIfUnsupportedVersion$1(process.version);
    const loaderConfig = {
        profile: config?.profile,
        logger: clientSharedValues.logger,
    };
    return {
        ...clientSharedValues,
        ...config,
        runtime: "node",
        defaultsMode,
        authSchemePreference: config?.authSchemePreference ?? loadConfig(NODE_AUTH_SCHEME_PREFERENCE_OPTIONS, loaderConfig),
        bodyLengthChecker: config?.bodyLengthChecker ?? calculateBodyLength,
        defaultUserAgentProvider: config?.defaultUserAgentProvider ??
            createDefaultUserAgentProvider({ serviceId: clientSharedValues.serviceId, clientVersion: packageInfo.version }),
        maxAttempts: config?.maxAttempts ?? loadConfig(NODE_MAX_ATTEMPT_CONFIG_OPTIONS, config),
        region: config?.region ??
            loadConfig(NODE_REGION_CONFIG_OPTIONS, { ...NODE_REGION_CONFIG_FILE_OPTIONS, ...loaderConfig }),
        requestHandler: NodeHttpHandler.create(config?.requestHandler ?? defaultConfigProvider),
        retryMode: config?.retryMode ??
            loadConfig({
                ...NODE_RETRY_MODE_CONFIG_OPTIONS,
                default: async () => (await defaultConfigProvider()).retryMode || DEFAULT_RETRY_MODE,
            }, config),
        sha256: config?.sha256 ?? Hash.bind(null, "sha256"),
        streamCollector: config?.streamCollector ?? streamCollector,
        useDualstackEndpoint: config?.useDualstackEndpoint ?? loadConfig(NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS, loaderConfig),
        useFipsEndpoint: config?.useFipsEndpoint ?? loadConfig(NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS, loaderConfig),
        userAgentAppId: config?.userAgentAppId ?? loadConfig(NODE_APP_ID_CONFIG_OPTIONS, loaderConfig),
    };
};

const getHttpAuthExtensionConfiguration = (runtimeConfig) => {
    const _httpAuthSchemes = runtimeConfig.httpAuthSchemes;
    let _httpAuthSchemeProvider = runtimeConfig.httpAuthSchemeProvider;
    let _credentials = runtimeConfig.credentials;
    return {
        setHttpAuthScheme(httpAuthScheme) {
            const index = _httpAuthSchemes.findIndex((scheme) => scheme.schemeId === httpAuthScheme.schemeId);
            if (index === -1) {
                _httpAuthSchemes.push(httpAuthScheme);
            }
            else {
                _httpAuthSchemes.splice(index, 1, httpAuthScheme);
            }
        },
        httpAuthSchemes() {
            return _httpAuthSchemes;
        },
        setHttpAuthSchemeProvider(httpAuthSchemeProvider) {
            _httpAuthSchemeProvider = httpAuthSchemeProvider;
        },
        httpAuthSchemeProvider() {
            return _httpAuthSchemeProvider;
        },
        setCredentials(credentials) {
            _credentials = credentials;
        },
        credentials() {
            return _credentials;
        },
    };
};
const resolveHttpAuthRuntimeConfig = (config) => {
    return {
        httpAuthSchemes: config.httpAuthSchemes(),
        httpAuthSchemeProvider: config.httpAuthSchemeProvider(),
        credentials: config.credentials(),
    };
};

const resolveRuntimeExtensions = (runtimeConfig, extensions) => {
    const extensionConfiguration = Object.assign(getAwsRegionExtensionConfiguration(runtimeConfig), getDefaultExtensionConfiguration(runtimeConfig), getHttpHandlerExtensionConfiguration(runtimeConfig), getHttpAuthExtensionConfiguration(runtimeConfig));
    extensions.forEach((extension) => extension.configure(extensionConfiguration));
    return Object.assign(runtimeConfig, resolveAwsRegionExtensionConfiguration(extensionConfiguration), resolveDefaultRuntimeConfig(extensionConfiguration), resolveHttpHandlerRuntimeConfig(extensionConfiguration), resolveHttpAuthRuntimeConfig(extensionConfiguration));
};

class SSOClient extends Client {
    config;
    constructor(...[configuration]) {
        const _config_0 = getRuntimeConfig(configuration || {});
        super(_config_0);
        this.initConfig = _config_0;
        const _config_1 = resolveClientEndpointParameters(_config_0);
        const _config_2 = resolveUserAgentConfig(_config_1);
        const _config_3 = resolveRetryConfig(_config_2);
        const _config_4 = resolveRegionConfig(_config_3);
        const _config_5 = resolveHostHeaderConfig(_config_4);
        const _config_6 = resolveEndpointConfig(_config_5);
        const _config_7 = resolveHttpAuthSchemeConfig(_config_6);
        const _config_8 = resolveRuntimeExtensions(_config_7, configuration?.extensions || []);
        this.config = _config_8;
        this.middlewareStack.use(getSchemaSerdePlugin(this.config));
        this.middlewareStack.use(getUserAgentPlugin(this.config));
        this.middlewareStack.use(getRetryPlugin(this.config));
        this.middlewareStack.use(getContentLengthPlugin(this.config));
        this.middlewareStack.use(getHostHeaderPlugin(this.config));
        this.middlewareStack.use(getLoggerPlugin(this.config));
        this.middlewareStack.use(getRecursionDetectionPlugin(this.config));
        this.middlewareStack.use(getHttpAuthSchemeEndpointRuleSetPlugin(this.config, {
            httpAuthSchemeParametersProvider: defaultSSOHttpAuthSchemeParametersProvider,
            identityProviderConfigProvider: async (config) => new DefaultIdentityProviderConfig({
                "aws.auth#sigv4": config.credentials,
            }),
        }));
        this.middlewareStack.use(getHttpSigningPlugin(this.config));
    }
    destroy() {
        super.destroy();
    }
}

class GetRoleCredentialsCommand extends Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SWBPortalService", "GetRoleCredentials", {})
    .n("SSOClient", "GetRoleCredentialsCommand")
    .sc(GetRoleCredentials$)
    .build() {
}

export { GetRoleCredentialsCommand, SSOClient };
//# sourceMappingURL=loadSso.mjs.map
