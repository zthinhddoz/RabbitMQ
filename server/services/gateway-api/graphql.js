import { ApolloServer } from 'apollo-server-express';
import { mergeTypes, mergeResolvers } from 'merge-graphql-schemas';
import { PubSub } from 'graphql-subscriptions';

import __example__ from '~/__example__/service-ex1/graphql';
import authentication from '~/authentication/graphql';

const typeDefs = mergeTypes([__example__.typeDefs, authentication.typeDefs], {
  all: true,
});

const resolvers = mergeResolvers([__example__.resolvers, authentication.resolvers]);

const context = ({ req }) => {
  console.log(req.user);
  // if (!req.user) throw new Error('You must be logged in to query this schema');

  return {
    user: req.user,
  };
};

export const pubsub = new PubSub();

export default new ApolloServer({
  typeDefs,
  resolvers,
  context,
});
