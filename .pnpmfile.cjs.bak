function readPackage(pkg) {
  // unrs-resolver postinstall requires `napi-postinstall` which is not
  // available in Vercel's build environment. The script is only needed
  // for native binary verification and is safe to skip.
  if (pkg.name === 'unrs-resolver' && pkg.scripts?.postinstall) {
    delete pkg.scripts.postinstall;
  }
  return pkg;
}

module.exports = { hooks: { readPackage } };
