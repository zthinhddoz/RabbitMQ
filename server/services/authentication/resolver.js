import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import { SECRET } from '~/env';

import model from '~/shared/models';

const resolvers = {
  Query: {
    async profile(_, args, { user }) {
      if (!user) {
        throw new Error('You are not authenticated!');
      }

      const data = await model.User.findById(user.id);

      return data;
    },
  },
  Mutation: {
    async signup(_, { username, email, password }) {
      const user = await model.User.create({
        username,
        email,
        password: await bcrypt.hash(password, 10),
      });

      return jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '1y' });
    },
    async login(_, { email, password }) {
      const user = await model.User.findOne({ email });

      if (!user) {
        throw new Error('No user with that email');
      }

      const valid = await bcrypt.compare(password, user.password);

      if (!valid) {
        throw new Error('Incorrect password');
      }

      return jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '1d' });
    },
  },
};

export default resolvers;
