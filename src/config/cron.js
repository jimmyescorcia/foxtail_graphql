const CronJob = require("cron").CronJob;
const ProfileResolver = require("../graphql/resolvers/Profile");
const EventResolver = require("../graphql/resolvers/Event");
const FlagResolver = require("../graphql/resolvers/Flag");
const UserResolver = require("../graphql/resolvers/User");
const SystemResolver = require("../graphql/resolvers/System");

function getDate() {
  var d = new Date();
  return d.toString();
}
/**
 * Every minutes
 */
new CronJob(
  "55 11-23/2 * * *",
  async function() {
    console.log("Cron job: sendEventReminders ran @ " + getDate());
    await EventResolver.sendEventReminders();
  },
  null,
  true,
  "America/Los_Angeles"
);

new CronJob(
  "15 11-23/2 * * *",
  async function() {
    console.log("Cron job: sendDailyUpdates ran @ " + getDate());
    await ProfileResolver.sendDailyUpdates();
  },
  null,
  true,
  "America/Los_Angeles"
);

new CronJob(
  "0 */12 * * *",
  async function() {
    console.log("Cron job: cleanOldFlags ran @ " + getDate());
    await FlagResolver.cleanOldFlags();
  },
  null,
  true,
  "America/Los_Angeles"
);

new CronJob(
  "0 */6 * * *",
  async function() {
    console.log("Cron job: canceledMemberships ran @ " + getDate());
    await UserResolver.canceledMemberships();
  },
  null,
  true,
  "America/Los_Angeles"
);

new CronJob(
  "0 */12 * * *",
  async function() {
    console.log("Cron job: removeOldAccounts ran @ " + getDate());
    await UserResolver.removeOldAccounts();
  },
  null,
  true,
  "America/Los_Angeles"
);

new CronJob(
  "0 */6 * * *",
  async function() {
    console.log("Cron job: updateDemoCounts ran @ " + getDate());
    await SystemResolver.updateDemoCounts();
  },
  null,
  true,
  "America/Los_Angeles"
);
