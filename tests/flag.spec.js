import axios from "axios";
//import seed from './seed';
import { XMLHttpRequest } from "xmlhttprequest";
if (process.env.NODE_ENV === "development") {
  require("dotenv").config();
}
let user1token,
  user2token,
  user1ID,
  user2ID,
  user1ProfileID,
  user2ProfileID,
  user1LinkCode,
  flagID;

global.XMLHttpRequest = XMLHttpRequest;
jest.setTimeout(30000);
beforeAll(async () => {
  const response = await axios.post(
    "http://localhost:" + process.env.PORT + "/graphql",
    {
      query: `
    mutation{
      createUser(email:"flag1@test.com",username:"Chris",phone:"83312999683",
    gender:"M",interestedIn:"F",dob:"10/10/2000",
   ){
      token
        }
          }
    `
    }
  );
  user1token = response.data.data.createUser[0].token;

  const response2 = await axios.post(
    "http://localhost:" + process.env.PORT + "/graphql",
    {
      query: `
      query{
        getMyProfile{
             id
           }
           currentuser{userID}
       }
    `
    },
    {
      headers: {
        Authorization: "Bearer " + user1token
      }
    }
  );

  user1ProfileID = response2.data.data.getMyProfile.id;
  user1ID = response2.data.data.currentuser.userID;

  const response3 = await axios.post(
    "http://localhost:" + process.env.PORT + "/graphql",
    {
      query: `
    mutation{
      createUser(email:"flag2@test.com",username:"Chassy",phone:"1234567890",
    gender:"M",interestedIn:"F",dob:"10/10/2000",
   ){
      token
        }
          }
    `
    }
  );
  user2token = response3.data.data.createUser[0].token;

  const response4 = await axios.post(
    "http://localhost:" + process.env.PORT + "/graphql",
    {
      query: `
      query{
        getMyProfile{
             id
           }
           currentuser{userID}
       }
    `
    },
    {
      headers: {
        Authorization: "Bearer " + user2token
      }
    }
  );

  user2ProfileID = response4.data.data.getMyProfile.id;
  user2ID = response4.data.data.currentuser.userID;
});

describe("flag resolvers", () => {
  let eventID;
  test("createEvent", async () => {
    const response = await axios.post(
      "http://localhost:" + process.env.PORT + "/graphql",
      {
        query: `
      mutation{
        createEvent(
          address: "8392 Ash Dr. Seew,Carolinddssda"
    startTime: "2019-10-22T05:00:00.000Z"
    endTime: "2019-10-23T05:00:00.000Z"
    description: "I love socks"
    desires: ["cuddling"]
    eventname: "Pool weseerwewrwe"
    lat: 45
    long: 45
    type: "private"

        ){id}
        }
    `
      },
      {
        headers: {
          Authorization: "Bearer " + user1token
        }
      }
    );

    eventID = response.data.data.createEvent.id;

    expect(response.data).toMatchObject({
      data: {
        createEvent: {
          id: eventID
        }
      }
    });
  });

  test("flag event", async () => {
    const response = await axios.post(
      "http://localhost:" + process.env.PORT + "/graphql",
      {
        query:
          `
      mutation{
        flagItem(type:"Event", reason:"Bad",targetID:"` +
          eventID +
          `")
        }
    `
      },
      {
        headers: {
          Authorization: "Bearer " + user2token
        }
      }
    );

    expect(response.data).toMatchObject({
      data: {
        flagItem: true
      }
    });

    const response2 = await axios.post(
      "http://localhost:" + process.env.PORT + "/graphql",
      {
        query:
          `
      query{
        event(id:"` +
          eventID +
          `") {
          flags {
            targetID
            userID
            type
            reason
          }
        }
        }
    `
      },
      {
        headers: {
          Authorization: "Bearer " + user2token
        }
      }
    );

    expect(response2.data).toMatchObject({
      data: {
        event: {
          flags: [
            {
              targetID: eventID,
              userID: user2ID,
              type: "Event",
              reason: "Bad"
            }
          ]
        }
      }
    });
  });

  test("soft delete event", async () => {
    const response = await axios.post(
      "http://localhost:" + process.env.PORT + "/graphql",
      {
        query:
          `
      mutation{
        deleteEvent(eventID:"` +
          eventID +
          `")
        }
    `
      },
      {
        headers: {
          Authorization: "Bearer " + user1token
        }
      }
    );

    expect(response.data).toMatchObject({
      data: {
        deleteEvent: eventID
      }
    });
  });

  test("check inactive event", async () => {
    const response = await axios.post(
      "http://localhost:" + process.env.PORT + "/graphql",
      {
        query:
          `
      query{
        event(id:"` +
          eventID +
          `")
        {
          active
        }
        }
    `
      },
      {
        headers: {
          Authorization: "Bearer " + user1token
        }
      }
    );

    expect(response.data).toMatchObject({
      data: {
        event: {
          active: false
        }
      }
    });
  });
});

afterAll(async () => {
  const response = await axios.post(
    "http://localhost:" + process.env.PORT + "/graphql",
    {
      query: `
      mutation{
        deleteUser
      }
    `
    },
    {
      headers: {
        Authorization: "Bearer " + user1token
      }
    }
  );

  const response2 = await axios.post(
    "http://localhost:" + process.env.PORT + "/graphql",
    {
      query: `
      mutation{
        deleteUser
      }
    `
    },
    {
      headers: {
        Authorization: "Bearer " + user2token
      }
    }
  );
});
