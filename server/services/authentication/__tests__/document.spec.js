import { User } from '../schema';

describe('authentication', () => {
  it('test', async () => {
    const list = await new User({
      username: 'test',
      password: '123789',
      email: 'test@gmail.com',
    });

    expect(list).toBeTruthy();
  });
});
