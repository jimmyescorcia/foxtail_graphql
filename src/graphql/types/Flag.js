const { GraphQLDateTime } = require("graphql-iso-date");
const graphql = require("graphql");

const { GraphQLObjectType, GraphQLString, GraphQLID, GraphQLBoolean } = graphql;
const { ObjectId } = require("mongoose").Types;
ObjectId.prototype.valueOf = function() {
  return this.toString();
};

const FlagType = new GraphQLObjectType({
  name: "FlagType",
  fields: () => ({
    id: {
      type: GraphQLID
    },
    targetID: {
      type: GraphQLID
    },
    userID: {
      type: GraphQLID
    },
    type: {
      type: GraphQLString
    },
    reviewed: {
      type: GraphQLBoolean
    },
    reason: {
      type: GraphQLString
    },
    createdAt: {
      type: GraphQLDateTime
    }
  })
});

module.exports = FlagType;
