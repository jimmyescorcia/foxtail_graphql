const GraphQL = require("graphql");
const { ObjectID } = require("mongodb");
const auth = require("../../config/auth");

const {
  GraphQLList,
  GraphQLFloat,
  GraphQLString,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLID
} = GraphQL;

// import the Event type we created
const { EventType } = require("../types/Event");
// import the Chat type we created
const ChatType = require("../types/Chat");

// import the Event resolver we created
const EventResolver = require("../resolvers/Event");

module.exports = {
  event: {
    type: EventType,
    args: {
      id: {
        type: new GraphQLNonNull(GraphQLID)
      }
    },
    resolve(parentValue, { id }, req) {
      if (auth.isAuthenticated(req)) {
        if (!ObjectID.isValid(id)) {
          throw new Error("Client: ID Invalid.");
        }
        return EventResolver.getByID({ id, req });
      }
    }
  },

  getMyEvents: {
    type: new GraphQLList(EventType),
    resolve(parentValue, {}, req) {
      if (auth.isAuthenticated(req)) {
        return EventResolver.getMyEvents({ req });
      }
    }
  },

  getComments: {
    type: ChatType,
    args: {
      chatID: {
        type: new GraphQLNonNull(GraphQLID)
      },
      cursor: {
        type: GraphQLString
      },
      limit: {
        type: new GraphQLNonNull(GraphQLInt)
      }
    },
    resolve(parentValue, { chatID, cursor, limit }, req) {
      if (auth.isAuthenticated(req)) {
        if (!ObjectID.isValid(chatID)) {
          throw new Error("Client: ID Invalid.");
        }
        return EventResolver.getComments({
          chatID: chatID.toString(),
          cursor,
          limit,
          req
        });
      }
    }
  },

  searchEvents: {
    type: new GraphQLList(EventType),
    args: {
      long: { type: new GraphQLNonNull(GraphQLFloat) },
      lat: { type: new GraphQLNonNull(GraphQLFloat) },
      maxDistance: { type: new GraphQLNonNull(GraphQLInt) },
      desires: { type: new GraphQLList(GraphQLString) },
      limit: { type: new GraphQLNonNull(GraphQLInt) },
      skip: { type: new GraphQLNonNull(GraphQLInt) }
    },
    resolve(
      parentValue,
      { long, lat, maxDistance = 50, desires, limit, skip },
      req
    ) {
      if (auth.isAuthenticated(req)) {
        return EventResolver.searchEvents({
          long,
          lat,
          maxDistance,
          desires,
          req,
          limit,
          skip
        });
      }
    }
  }
};
