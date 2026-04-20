// src/auth/ee/interfaces/permissions.generated.ts

// src/auth/ee/license.ts
var cachedLicense = null;
var cacheTimestamp = 0;
var CACHE_TTL = 60 * 1e3;
function validateLicense(licenseKey) {
  const key = process.env["MASTRA_EE_LICENSE"];
  if (!key) {
    return { valid: false };
  }
  if (key.length < 32) {
    return { valid: false };
  }
  return {
    valid: true,
    features: ["user", "session", "sso", "rbac", "acl"],
    tier: "enterprise"
  };
}
function isLicenseValid() {
  const now = Date.now();
  if (cachedLicense && now - cacheTimestamp < CACHE_TTL) {
    return cachedLicense.valid;
  }
  cachedLicense = validateLicense();
  cacheTimestamp = now;
  if (!cachedLicense.valid && process.env["MASTRA_EE_LICENSE"]) {
    console.warn("[mastra/auth-ee] Invalid or expired EE license. EE features are disabled.");
  }
  return cachedLicense.valid;
}
function isDevEnvironment() {
  return process.env["MASTRA_DEV"] === "true" || process.env["MASTRA_DEV"] === "1" || process.env["NODE_ENV"] !== "production" && process.env["NODE_ENV"] !== "prod";
}
function isEEEnabled() {
  if (isDevEnvironment()) {
    return true;
  }
  return isLicenseValid();
}
function implementsInterface(auth, method) {
  return auth !== null && typeof auth === "object" && method in auth;
}
function isMastraCloudAuth(auth) {
  if (!auth || typeof auth !== "object") return false;
  return "isMastraCloudAuth" in auth && auth.isMastraCloudAuth === true;
}
function isSimpleAuth(auth) {
  if (!auth || typeof auth !== "object") return false;
  return "isSimpleAuth" in auth && auth.isSimpleAuth === true;
}
async function buildCapabilities(auth, request, options) {
  if (!auth) {
    return { enabled: false, login: null };
  }
  const hasLicense = isLicenseValid();
  const isCloud = isMastraCloudAuth(auth);
  const isSimple = isSimpleAuth(auth);
  const isDev = isDevEnvironment();
  const isLicensedOrCloud = hasLicense || isCloud || isSimple || isDev;
  let login = null;
  const hasSSO = implementsInterface(auth, "getLoginUrl") && isLicensedOrCloud;
  const hasCredentials = implementsInterface(auth, "signIn") && isLicensedOrCloud;
  const raw = (options?.apiPrefix || "/api").trim();
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  const prefix = withSlash.endsWith("/") ? withSlash.slice(0, -1) : withSlash;
  const ssoLoginUrl = `${prefix}/auth/sso/login`;
  let signUpEnabled = true;
  if (implementsInterface(auth, "signIn")) {
    const credentialsProvider = auth;
    if (typeof credentialsProvider.isSignUpEnabled === "function") {
      signUpEnabled = credentialsProvider.isSignUpEnabled();
    }
  }
  if (hasSSO && hasCredentials) {
    const ssoConfig = auth.getLoginButtonConfig();
    login = {
      type: "both",
      signUpEnabled,
      sso: {
        ...ssoConfig,
        url: ssoLoginUrl
      }
    };
  } else if (hasSSO) {
    const ssoConfig = auth.getLoginButtonConfig();
    login = {
      type: "sso",
      sso: {
        ...ssoConfig,
        url: ssoLoginUrl
      }
    };
  } else if (hasCredentials) {
    login = {
      type: "credentials",
      signUpEnabled
    };
  }
  let user = null;
  if (implementsInterface(auth, "getCurrentUser") && isLicensedOrCloud) {
    try {
      user = await auth.getCurrentUser(request);
    } catch {
      user = null;
    }
  }
  if (!user) {
    return { enabled: true, login };
  }
  const rbacProvider = options?.rbac;
  const hasRBAC = !!rbacProvider && isLicensedOrCloud;
  const capabilities = {
    user: implementsInterface(auth, "getCurrentUser") && isLicensedOrCloud,
    session: implementsInterface(auth, "createSession") && isLicensedOrCloud,
    sso: implementsInterface(auth, "getLoginUrl") && isLicensedOrCloud,
    rbac: hasRBAC,
    acl: implementsInterface(auth, "canAccess") && isLicensedOrCloud
  };
  let access = null;
  if (hasRBAC && rbacProvider) {
    try {
      const roles = await rbacProvider.getRoles(user);
      const permissions = await rbacProvider.getPermissions(user);
      access = { roles, permissions };
    } catch {
      access = null;
    }
  }
  return {
    enabled: true,
    login,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl
    },
    capabilities,
    access
  };
}
function matchesPermission(userPermission, requiredPermission) {
  if (userPermission === "*") {
    return true;
  }
  const grantedParts = userPermission.split(":");
  const requiredParts = requiredPermission.split(":");
  if (grantedParts.length < 2 || requiredParts.length < 2) {
    return userPermission === requiredPermission;
  }
  const [grantedResource, grantedAction, grantedId] = grantedParts;
  const [requiredResource, requiredAction, requiredId] = requiredParts;
  if (grantedResource === "*") {
    if (grantedAction === "*") {
      if (grantedId === void 0) {
        return true;
      }
      return grantedId === requiredId;
    }
    if (grantedAction !== requiredAction) {
      return false;
    }
    if (grantedId === void 0) {
      return true;
    }
    return grantedId === requiredId;
  }
  if (grantedResource !== requiredResource) {
    return false;
  }
  if (grantedAction === "*") {
    if (grantedId === void 0) {
      return true;
    }
    return grantedId === requiredId;
  }
  if (grantedAction !== requiredAction) {
    return false;
  }
  if (grantedId === void 0) {
    return true;
  }
  return grantedId === requiredId;
}
function hasPermission(userPermissions, requiredPermission) {
  return userPermissions.some((p) => matchesPermission(p, requiredPermission));
}

export { buildCapabilities, hasPermission, isDevEnvironment, isEEEnabled, isLicenseValid, matchesPermission, validateLicense };
