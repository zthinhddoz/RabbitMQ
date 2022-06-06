import gql from 'graphql-tag';

const typeDefs = gql`
  type User {
    id: Int!
    username: String!
    email: String!
  }

  type Query {
    profile: User
  }

  type Mutation {
    signup(username: String!, email: String!, password: String!): String
    login(email: String!, password: String!): String
  }
`;
export default typeDefs;
