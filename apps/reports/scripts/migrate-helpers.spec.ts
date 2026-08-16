import { brokerPlaceholders, redact, statementsIn, substitute } from './migrate-helpers';

describe('brokerPlaceholders', () => {
  it('splits a CloudAMQP url into the parts the RabbitMQ engine wants', () => {
    expect(brokerPlaceholders('amqps://myuser:s3cr3t@puffin.rmq2.cloudamqp.com/myuser')).toEqual({
      RABBITMQ_HOST_PORT: 'puffin.rmq2.cloudamqp.com:5671',
      RABBITMQ_SECURE: '1',
      RABBITMQ_VHOST: 'myuser',
      RABBITMQ_USERNAME: 'myuser',
      RABBITMQ_PASSWORD: 's3cr3t',
    });
  });

  it('defaults the port by scheme, since CloudAMQP urls omit it', () => {
    expect(brokerPlaceholders('amqps://u:p@host/v').RABBITMQ_HOST_PORT).toBe('host:5671');
    expect(brokerPlaceholders('amqp://u:p@host/v').RABBITMQ_HOST_PORT).toBe('host:5672');
    expect(brokerPlaceholders('amqps://u:p@host:1234/v').RABBITMQ_HOST_PORT).toBe('host:1234');
  });

  it('marks only amqps as secure', () => {
    expect(brokerPlaceholders('amqps://u:p@h/v').RABBITMQ_SECURE).toBe('1');
    expect(brokerPlaceholders('amqp://u:p@h/v').RABBITMQ_SECURE).toBe('0');
  });

  it('falls back to the default vhost when the path is empty', () => {
    expect(brokerPlaceholders('amqps://u:p@host').RABBITMQ_VHOST).toBe('/');
    expect(brokerPlaceholders('amqps://u:p@host/').RABBITMQ_VHOST).toBe('/');
  });

  it('percent-decodes credentials and vhost', () => {
    const parts = brokerPlaceholders('amqps://u%2Fs:p%40ss@host/my%2Fvhost');
    expect(parts.RABBITMQ_USERNAME).toBe('u/s');
    expect(parts.RABBITMQ_PASSWORD).toBe('p@ss');
    expect(parts.RABBITMQ_VHOST).toBe('my/vhost');
  });
});

describe('redact', () => {
  it('scrubs every occurrence of each secret', () => {
    const text = "Code: 62. Syntax error near rabbitmq_password = 'hunter2', hunter2";
    expect(redact(text, ['hunter2'])).toBe(
      "Code: 62. Syntax error near rabbitmq_password = '«redacted»', «redacted»",
    );
  });

  it('ignores empty secrets rather than corrupting the message', () => {
    // A blank password is legal; splitting on '' would shred the text.
    expect(redact('nothing secret here', ['', 'hunter2'])).toBe('nothing secret here');
  });

  it('leaves text untouched when no secret appears', () => {
    expect(redact('connection refused', ['hunter2'])).toBe('connection refused');
  });
});

describe('substitute', () => {
  it('replaces placeholders with their values', () => {
    expect(substitute("host = '{{H}}', secure = {{S}}", { H: 'broker:5671', S: '1' })).toBe(
      "host = 'broker:5671', secure = 1",
    );
  });

  it('escapes quotes and backslashes so a password cannot break out of its literal', () => {
    expect(substitute("password = '{{P}}'", { P: "it's\\odd" })).toBe("password = 'it\\'s\\\\odd'");
  });

  it('throws on an unknown placeholder instead of emitting it literally', () => {
    expect(() => substitute('{{NOPE}}', {})).toThrow('{{NOPE}}');
  });
});

describe('statementsIn', () => {
  it('splits on a semicolon that ends a line', () => {
    expect(statementsIn('CREATE TABLE a (x Int);\nCREATE TABLE b (y Int);\n')).toEqual([
      'CREATE TABLE a (x Int)',
      'CREATE TABLE b (y Int)',
    ]);
  });

  it('accepts a final statement with no trailing semicolon', () => {
    expect(statementsIn('SELECT 1')).toEqual(['SELECT 1']);
  });

  it('drops comment-only chunks so a trailing licence block is not executed', () => {
    expect(statementsIn('-- a comment\n-- another\n')).toEqual([]);
  });

  it('keeps leading comments attached to their statement', () => {
    const [statement] = statementsIn('-- why\nCREATE TABLE a (x Int);\n');
    expect(statement).toBe('-- why\nCREATE TABLE a (x Int)');
  });

  // Documents the known limit.
  it('splits inside a string literal containing a line-ending semicolon', () => {
    expect(statementsIn("SELECT 'a;\nb'").length).toBe(2);
  });
});
