const GraphQL = require("graphql");
const auth = require("../../config/auth");
const { ObjectID } = require("mongodb");

const {
  GraphQLList,
  GraphQLID,
  GraphQLString,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLBoolean
} = GraphQL;

// import the Chat type we created
const ChatType = require("../types/Chat");
const MessageType = require("../types/Message");
const { friendItemType } = require("../types/Generic");

// import the Chat resolver we created
const ChatResolver = require("../resolvers/Chat");

module.exports = {
  chat: {
    type: ChatType,
    args: {
      id: {
        type: new GraphQLNonNull(GraphQLID)
      }
    },
    async resolve(parentValue, { id }, req) {
      if (await auth.isAuthenticated(req)) {
        if (!ObjectID.isValid(id)) {
          throw new Error("Client: ID Invalid.");
        }
        return ChatResolver.getByID({ id, req });
      }
    }
  },
  getMessages: {
    type: ChatType,
    args: {
      chatID: {
        type: GraphQLNonNull(GraphQLID)
      },
      cursor: {
        type: GraphQLString
      },
      limit: {
        type: GraphQLNonNull(GraphQLInt)
      }
    },
    async resolve(parentValue, { chatID, cursor, limit }, req) {
      if (await auth.isAuthenticated(req)) {
        if (!ObjectID.isValid(chatID)) {
          throw new Error("Client: ID Invalid.");
        }
        return ChatResolver.getMessages({
          chatID: chatID.toString(),
          cursor,
          limit,
          req
        });
      }
    }
  },

  getInbox: {
    type: new GraphQLList(MessageType),
    args: {
      skip: {
        type: GraphQLNonNull(GraphQLInt)
      },
      limit: {
        type: GraphQLNonNull(GraphQLInt)
      }
    },
    async resolve(parentValue, { skip, limit }, req) {
      if (await auth.isAuthenticated(req)) {
        return ChatResolver.getInbox({ skip, limit, req });
      }
    }
  },

  getFriends: {
    type: new GraphQLList(friendItemType),
    args: {
      skip: {
        type: GraphQLInt
      },
      limit: {
        type: GraphQLNonNull(GraphQLInt)
      },
      chatID: {
        type: GraphQLID
      },
      isEvent: {
        type: GraphQLBoolean
      }
    },
    async resolve(parentValue, { skip, limit, chatID, isEvent }, req) {
      if (await auth.isAuthenticated(req)) {
        if (!ObjectID.isValid(chatID)) {
          throw new Error("Client: ID Invalid.");
        }
        return ChatResolver.getFriends({ skip, limit, req, chatID, isEvent });
      }
    }
  }
};
