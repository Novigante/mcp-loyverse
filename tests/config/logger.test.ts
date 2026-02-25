import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger } from '../../src/config/logger.js';

describe('Logger', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
  });

  it('writes messages to stderr', () => {
    const logger = createLogger('info');
    logger.info('hello world');

    expect(stderrSpy).toHaveBeenCalledTimes(1);
    const output = stderrSpy.mock.calls[0][0] as string;
    expect(output).toContain('[INFO]');
    expect(output).toContain('hello world');
  });

  it('includes timestamp in ISO format', () => {
    const logger = createLogger('info');
    logger.info('test');

    const output = stderrSpy.mock.calls[0][0] as string;
    // Match ISO 8601 pattern
    expect(output).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('includes structured data when provided', () => {
    const logger = createLogger('info');
    logger.info('request done', { statusCode: 200, path: '/items' });

    const output = stderrSpy.mock.calls[0][0] as string;
    expect(output).toContain('200');
    expect(output).toContain('/items');
  });

  it('respects log level — debug suppressed at info level', () => {
    const logger = createLogger('info');
    logger.debug('should not appear');
    logger.info('should appear');

    expect(stderrSpy).toHaveBeenCalledTimes(1);
    const output = stderrSpy.mock.calls[0][0] as string;
    expect(output).toContain('should appear');
  });

  it('respects log level — info suppressed at warn level', () => {
    const logger = createLogger('warn');
    logger.debug('no');
    logger.info('no');
    logger.warn('yes');
    logger.error('yes');

    expect(stderrSpy).toHaveBeenCalledTimes(2);
  });

  it('debug level shows all messages', () => {
    const logger = createLogger('debug');
    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');

    expect(stderrSpy).toHaveBeenCalledTimes(4);
  });

  it('error level only shows errors', () => {
    const logger = createLogger('error');
    logger.debug('no');
    logger.info('no');
    logger.warn('no');
    logger.error('yes');

    expect(stderrSpy).toHaveBeenCalledTimes(1);
  });

  it('never outputs secret values in structured data', () => {
    const logger = createLogger('info');
    logger.info('config loaded', { loyverse_api_token: 'sk-secret-key-12345' });

    const output = stderrSpy.mock.calls[0][0] as string;
    expect(output).not.toContain('sk-secret-key-12345');
    expect(output).toContain('sk-s****');
  });

  it('handles non-secret keys normally', () => {
    const logger = createLogger('info');
    logger.info('config', { baseUrl: 'https://api.loyverse.com' });

    const output = stderrSpy.mock.calls[0][0] as string;
    expect(output).toContain('https://api.loyverse.com');
  });
});
