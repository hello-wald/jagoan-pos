// The broker could not be reached, or the channel died.
export class BrokerUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'BrokerUnavailableError';
  }
}
