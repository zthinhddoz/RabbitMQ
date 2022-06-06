/**
 * Error Class
 * Throw errors by using
 * throw new BadRequestError('Sample error message');
 * throw new BadRequestError({ errorCode: 505 });
 */

export class BadRequestError extends Error {
  
  constructor(rawError) {
    const error = rawError && typeof rawError === "object" ? JSON.stringify( rawError ) : rawError;
    super(error);

    this.data = { error };
    this.statusCode = 400;
  }
}
