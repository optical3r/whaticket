const WEAK_SECRETS = [
  "mysecret",
  "myanothersecret",
  "3123123213123",
  "75756756756",
  "change-me",
  "change-me-too"
];

const MIN_SECRET_LENGTH = 32;

const getSecret = (name: string, testFallback: string): string => {
  const value = process.env[name];

  if (process.env.NODE_ENV === "test") {
    return value || testFallback;
  }

  if (!value || WEAK_SECRETS.includes(value)) {
    throw new Error(
      `${name} is missing or uses a known default value. Set a random secret (e.g. "openssl rand -hex 32") in the backend environment.`
    );
  }

  if (value.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `${name} must be at least ${MIN_SECRET_LENGTH} characters long.`
    );
  }

  return value;
};

export default {
  secret: getSecret("JWT_SECRET", "test-secret"),
  expiresIn: "15m",
  refreshSecret: getSecret("JWT_REFRESH_SECRET", "test-refresh-secret"),
  refreshExpiresIn: "7d"
};
