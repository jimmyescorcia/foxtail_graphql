const GraphQL = require("graphql");
const { GraphQLObjectType, GraphQLSchema } = GraphQL;

// import the user query file we created
const UserQuery = require("./queries/User");
const ChatQuery = require("./queries/Chat");
const AdminQuery = require("./queries/Admin");
const EventQuery = require("./queries/Event");
const FlagQuery = require("./queries/Flag");
const FilterQuery = require("./queries/Filter");
const ProfileQuery = require("./queries/Profile");
const SystemQuery = require("./queries/System");

// import the user mutation file we created
const AdminMutation = require("./mutations/Admin");
const UserMutation = require("./mutations/User");
const ChatMutation = require("./mutations/Chat");
const EventMutation = require("./mutations/Event");
const FlagMutation = require("./mutations/Flag");
const ProfileMutation = require("./mutations/Profile");

// import subscriptions
const NewMsgSubscription = require("./subscriptions/NewMessage");
const NewNoticeSubscription = require("./subscriptions/NewNotification");
const NewInboxMsgSubscription = require("./subscriptions/NewInboxMsg");

// lets define our root query
const RootQuery = new GraphQLObjectType({
  name: "RootQueryType",
  description: "This is the default root query provided by the backend",
  fields: {
    //Admin
    memberCounts: AdminQuery.memberCounts,
    currentAdmin: AdminQuery.currentAdmin,
    getFlagsByType: AdminQuery.getFlagsByType,
    getPayments: AdminQuery.getPayments,
    //User
    user: UserQuery.user,
    currentuser: UserQuery.currentuser,
    getSettings: UserQuery.getSettings,
    getCounts: UserQuery.getCounts,
    getNotifications: UserQuery.getNotifications,
    confirmEmail: UserQuery.confirmEmail,
    //Chat
    getMessages: ChatQuery.getMessages,
    getInbox: ChatQuery.getInbox,
    getFriends: ChatQuery.getFriends,
    chat: ChatQuery.chat,
    //Event
    event: EventQuery.event,
    searchEvents: EventQuery.searchEvents,
    getMyEvents: EventQuery.getMyEvents,
    getComments: EventQuery.getComments,

    //Flag
    flag: FlagQuery.flag,
    //Filter
    filter: FilterQuery.filter,
    getFilterByUserID: FilterQuery.getFilterByUserID,
    //Profile
    profile: ProfileQuery.profile,
    getMyProfile: ProfileQuery.getMyProfile,
    searchProfiles: ProfileQuery.searchProfiles,
    generateCode: ProfileQuery.generateCode,
    testCall: ProfileQuery.testCall,
    //System
    version: SystemQuery.version,
    getFullLink: SystemQuery.getFullLink,
    getDemoCounts: SystemQuery.getDemoCounts,
    setFullLink: SystemQuery.setFullLink,
    hiccup: SystemQuery.hiccup
  }
});

// lets define our root mutation
const RootMutation = new GraphQLObjectType({
  name: "Mutation",
  description: "Default mutation provided by the backend APIs",
  fields: {
    //Admin
    adminLogin: AdminMutation.adminLogin,
    adminCreate: AdminMutation.adminCreate,
    setVerification: AdminMutation.setVerification,
    toggleAlertFlag: AdminMutation.toggleAlertFlag,
    resolveFlag: AdminMutation.resolveFlag,
    toggleActive: AdminMutation.toggleActive,
    toggleBlkActive: AdminMutation.toggleBlkActive,
    addPayment: AdminMutation.addPayment,
    admin_deleteEvent: AdminMutation.admin_deleteEvent,
    // User
    createUser: UserMutation.create,
    updateSettings: UserMutation.updateSettings,
    submitPhoto: UserMutation.submitPhoto,
    login: UserMutation.login,
    deleteUser: UserMutation.deleteUser,
    resetPassword: UserMutation.resetPassword,
    fbResetPhone: UserMutation.fbResetPhone,
    fbResolve: UserMutation.fbResolve,
    createSubcription: UserMutation.createSubcription,
    cancelSubcription: UserMutation.cancelSubcription,
    updateNotifications: UserMutation.updateNotifications,
    seenTour: UserMutation.seenTour,
    sendPasswordResetEmail: UserMutation.sendPasswordResetEmail,
    sendPhoneResetEmail: UserMutation.sendPhoneResetEmail,
    testload: UserMutation.testload,
    //canceledMemberships: UserMutation.canceledMemberships,
    //removeOldAccounts: UserMutation.removeOldAccounts,
    updateLocation: UserMutation.updateLocation,
    resendVerEMail: UserMutation.resendVerEMail,
    messageAdmin: UserMutation.messageAdmin,
    // Flag
    flagItem: FlagMutation.flagItem,
    admin_deleteflag: FlagMutation.admin_deleteflag,
    //cleanOldFlags: FlagMutation.cleanOldFlags,
    // Profile
    linkProfile: ProfileMutation.linkProfile,
    likeProfile: ProfileMutation.likeProfile,
    rejectProfile: ProfileMutation.rejectProfile,
    blockProfile: ProfileMutation.blockProfile,
    signS3: ProfileMutation.signS3,
    unlinkProfile: ProfileMutation.unlinkProfile,
    //sendDailyUpdates: ProfileMutation.sendDailyUpdates,
    toggleOnline: ProfileMutation.toggleOnline,
    // Event
    createEvent: EventMutation.createEvent,
    deleteEvent: EventMutation.deleteEvent,
    inviteProfileEvent: EventMutation.inviteProfile,
    removeProfileEvent: EventMutation.removeProfile,
    toggleAttendEvent: EventMutation.toggleAttend,
    postComment: EventMutation.postComment,
    removeSelfEvent: EventMutation.removeSelf,
    // Chat
    sendMessage: ChatMutation.sendMessage,
    removeSelf: ChatMutation.removeSelf,
    inviteProfile: ChatMutation.inviteProfile,
    removeProfilesChat: ChatMutation.removeProfiles,
    readChat: ChatMutation.readChat
  }
});

const RootSubscription = new GraphQLObjectType({
  name: "RootSubscription",
  description: "Root Subscription",
  fields: {
    newNoticeSubscribe: NewNoticeSubscription,
    newMessageSubscribe: NewMsgSubscription,
    newInboxMsgSubscribe: NewInboxMsgSubscription
  }
});

// export the schema
module.exports = new GraphQLSchema({
  query: RootQuery,
  mutation: RootMutation,
  subscription: RootSubscription
});
