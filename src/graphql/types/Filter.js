const graphql = require("graphql");

const { GraphQLObjectType, GraphQLString, GraphQLList, GraphQLInt } = graphql;
const { ObjectId } = require("mongoose").Types;
ObjectId.prototype.valueOf = function() {
  return this.toString();
};
const FilterOptionsType = new GraphQLObjectType({
  name: "FilterOptionsType",
  fields: {
    distance: {
      type: GraphQLInt
    },
    distanceMetric: {
      type: GraphQLString
    },
    ageRange: {
      type: new GraphQLList(GraphQLInt)
    },
    interestedIn: {
      type: new GraphQLList(GraphQLString)
    }
  }
});

const RejectedUserType = new GraphQLObjectType({
  name: "RejectedUserType",
  fields: {
    userID: {
      type: GraphQLString
    },
    rejectDate: {
      type: GraphQLString
    }
  }
});

const FilterType = new GraphQLObjectType({
  name: "FilterType",
  fields: () => {
    const UserType = require("./User");
    return {
      userID: {
        type: GraphQLString
      },
      searchParams: {
        type: FilterOptionsType
      },
      rejected: {
        type: new GraphQLList(RejectedUserType)
      },
      blocked: {
        type: new GraphQLList(UserType)
      }
    };
  }
});

module.exports = FilterType;
