const { execSync } = require('child_process');

const shouldForceLinuxSharp =
  process.env.FORCE_LINUX_SHARP === '1' ||
  Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
      process.env.RAILWAY_PROJECT_ID ||
      process.env.RAILWAY_SERVICE_NAME,
  );

if (!shouldForceLinuxSharp) {
  process.exit(0);
}

const env = {
  ...process.env,
  npm_config_platform: 'linux',
  npm_config_arch: 'x64',
};

try {
  execSync('npm install sharp@0.34.4 --omit=dev --force', {
    stdio: 'inherit',
    env,
  });
  execSync('npm rebuild sharp --force', {
    stdio: 'inherit',
    env,
  });
  console.log('sharp rebuilt for linux-x64');
} catch (error) {
  console.error('sharp linux-x64 rebuild failed');
  throw error;
}
