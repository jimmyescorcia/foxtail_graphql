import axios from "axios";
//import seed from './seed';
import { XMLHttpRequest } from "xmlhttprequest";
if (process.env.NODE_ENV === "development") {
  require("dotenv").config();
}
let user1token, user2token;

global.XMLHttpRequest = XMLHttpRequest;
jest.setTimeout(30000);
beforeAll(async () => {
  const response = await axios.post(
    "http://localhost:" + process.env.PORT + "/graphql",
    {
      query: `
    mutation{
      createUser(email:"event1@test.com",username:"Chris",phone:"067979956",
    gender:"M",interestedIn:"F",dob:"10/10/2000",
   ){
      token
        }
          }
    `
    }
  );
  user1token = response.data.data.createUser[0].token;

  const response3 = await axios.post(
    "http://localhost:" + process.env.PORT + "/graphql",
    {
      query: `
    mutation{
      createUser(email:"event2@test.com",username:"Chassy",phone:"9045865865",
    gender:"M",interestedIn:"F",dob:"10/10/2000",
   ){
      token
        }
          }
    `
    }
  );
  user2token = response3.data.data.createUser[0].token;
});

describe("event resolvers", () => {
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

        ) {
          id
          eventname
          type
          description
          desires
          address
          startTime
          endTime
          distance
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

    const {
      data: {
        createEvent: { id }
      }
    } = response.data;
    eventID = id;

    expect(response.data).toMatchObject({
      data: {
        createEvent: {
          id: eventID
        }
      }
    });
  });

  test("wrong person delete", async () => {
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
          Authorization: "Bearer " + user2token
        }
      }
    );

    expect(response.data).toMatchObject({
      data: {
        deleteEvent: null
      }
    });
  });

  test("right person delete", async () => {
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
