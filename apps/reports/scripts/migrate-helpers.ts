// Split from the runner so they are testable — importing the runner migrates.

/** ClickHouse wants the broker split into parts, not a URL. */
export function brokerPlaceholders(rabbitmqUrl: string): Record<string, string> {
  const url = new URL(rabbitmqUrl);
  const secure = url.protocol === 'amqps:';
  const port = url.port || (secure ? '5671' : '5672');
  // CloudAMQP puts the vhost in the path; an empty path means the default '/'.
  const vhost = decodeURIComponent(url.pathname.replace(/^\//, '')) || '/';

  return {
    RABBITMQ_HOST_PORT: `${url.hostname}:${port}`,
    RABBITMQ_SECURE: secure ? '1' : '0',
    RABBITMQ_VHOST: vhost,
    RABBITMQ_USERNAME: decodeURIComponent(url.username),
    RABBITMQ_PASSWORD: decodeURIComponent(url.password),
  };
}

// ClickHouse echoes the failing query back, and that query holds the broker
// password — without this a failed migration prints it to the console and CI.
export function redact(text: string, secrets: string[]): string {
  return secrets
    .filter((secret) => secret.length > 0)
    .reduce((scrubbed, secret) => scrubbed.split(secret).join('«redacted»'), text);
}

export function substitute(sql: string, values: Record<string, string>): string {
  return sql.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = values[key];
    if (value === undefined) throw new Error(`No value for placeholder {{${key}}}`);
    // These land inside single-quoted SQL literals.
    return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  });
}

// Splits on a line-ending semicolon; keep semicolons out of string literals.
export function statementsIn(sql: string): string[] {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0 && !/^(--[^\n]*\s*)+$/.test(statement));
}
