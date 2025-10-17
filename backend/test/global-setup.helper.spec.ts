import { isRecoverablePrismaConnectionError } from "./global-setup";

describe('isRecoverablePrismaConnectionError', () => {
  it('returns true when Prisma provides error code P1001', () => {
    expect(
      isRecoverablePrismaConnectionError({
        errorCode: 'P1001',
        message: 'Unable to reach database',
      }),
    ).toBe(true);
  });

  it('returns true when error message indicates a connection refusal', () => {
    const error = new Error('connect ECONNREFUSED 127.0.0.1:5432');
    expect(isRecoverablePrismaConnectionError(error)).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    const error = new Error('Unhandled application error');
    expect(isRecoverablePrismaConnectionError(error)).toBe(false);
  });
});