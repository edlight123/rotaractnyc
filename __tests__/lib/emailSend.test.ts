const mockEmailsSend = jest.fn();
const mockBatchSend = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: (...args: any[]) => mockEmailsSend(...args) },
    batch: { send: (...args: any[]) => mockBatchSend(...args) },
  })),
}));

const rateLimited = { data: null, error: { name: 'rate_limit_exceeded', message: 'Too many requests' } };

describe('email sending', () => {
  let sendEmail: typeof import('@/lib/email/send').sendEmail;
  let sendBulkEmail: typeof import('@/lib/email/send').sendBulkEmail;

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    process.env.RESEND_API_KEY = 're_test';
    delete process.env.EMAILS_PAUSED;
    mockEmailsSend.mockReset().mockResolvedValue({ data: { id: 'e1' }, error: null });
    mockBatchSend.mockReset().mockResolvedValue({ data: { data: [] }, error: null });
    ({ sendEmail, sendBulkEmail } = require('@/lib/email/send'));
  });

  afterEach(() => jest.useRealTimers());

  it('sends a member list in one batch request', async () => {
    const recipients = Array.from({ length: 39 }, (_, i) => `m${i}@club.org`);
    const result = await sendBulkEmail(recipients, 'Hi', '<p>Hi</p>', 'Hi');

    expect(mockBatchSend).toHaveBeenCalledTimes(1);
    expect(mockBatchSend.mock.calls[0][0]).toHaveLength(39);
    expect(mockBatchSend.mock.calls[0][0][0]).toMatchObject({ to: ['m0@club.org'], subject: 'Hi', text: 'Hi' });
    expect(mockEmailsSend).not.toHaveBeenCalled();
    expect(result).toEqual({ sent: 39, failed: 0, total: 39, failedRecipients: [] });
  });

  it('splits lists over 100 into several batches', async () => {
    const recipients = Array.from({ length: 150 }, (_, i) => `m${i}@club.org`);
    const pending = sendBulkEmail(recipients, 'Hi', '<p>Hi</p>');
    await jest.runAllTimersAsync();
    await pending;

    expect(mockBatchSend.mock.calls.map((c) => c[0].length)).toEqual([100, 50]);
  });

  it('retries a rate-limited batch instead of dropping it', async () => {
    mockBatchSend.mockResolvedValueOnce(rateLimited);
    const pending = sendBulkEmail(['a@club.org', 'b@club.org'], 'Hi', '<p>Hi</p>');
    await jest.runAllTimersAsync();

    expect(await pending).toMatchObject({ sent: 2, failed: 0 });
    expect(mockBatchSend).toHaveBeenCalledTimes(2);
  });

  it('reports who did not get the email when a batch keeps failing', async () => {
    mockBatchSend.mockResolvedValue({ data: null, error: { name: 'validation_error', message: 'bad' } });
    const result = await sendBulkEmail(['a@club.org', 'b@club.org'], 'Hi', '<p>Hi</p>');

    expect(result).toEqual({ sent: 0, failed: 2, total: 2, failedRecipients: ['a@club.org', 'b@club.org'] });
    expect(mockBatchSend).toHaveBeenCalledTimes(1);
  });

  it('sends one at a time when there are attachments', async () => {
    const result = await sendBulkEmail(['a@club.org', 'b@club.org'], 'Hi', '<p>Hi</p>', undefined, [
      { filename: 'f.txt', content: 'aGk=' },
    ]);

    expect(mockBatchSend).not.toHaveBeenCalled();
    expect(mockEmailsSend).toHaveBeenCalledTimes(2);
    expect(result.sent).toBe(2);
  });

  it('retries a single rate-limited email', async () => {
    mockEmailsSend.mockResolvedValueOnce(rateLimited);
    const pending = sendEmail({ to: 'a@club.org', subject: 'Hi', html: '<p>Hi</p>' });
    await jest.runAllTimersAsync();

    expect(await pending).toEqual({ success: true, id: 'e1' });
    expect(mockEmailsSend).toHaveBeenCalledTimes(2);
  });

  it('gives up after repeated rate limits', async () => {
    mockEmailsSend.mockResolvedValue(rateLimited);
    const pending = sendEmail({ to: 'a@club.org', subject: 'Hi', html: '<p>Hi</p>' });
    await jest.runAllTimersAsync();

    expect(await pending).toMatchObject({ success: false });
    expect(mockEmailsSend).toHaveBeenCalledTimes(5);
  });
});
