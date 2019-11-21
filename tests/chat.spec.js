import axios from "axios";
import { XMLHttpRequest } from "xmlhttprequest";
if (process.env.NODE_ENV === "development") {
  require("dotenv").config();
}
let user1token, user2token, user2ProfileID;

global.XMLHttpRequest = XMLHttpRequest;
jest.setTimeout(30000);
beforeAll(async () => {
  const response = await axios.post(
    "http://localhost:" + process.env.PORT + "/graphql",
    {
      query: `
    mutation{
      createUser(email:"chat1@test.com",username:"Chris",phone:"3434455456",
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
      createUser(email:"chat2@test.com",username:"Chassy",phone:"54569009569",
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
});
describe("chat resolvers", () => {
  let chatID;
  test("sendMessage", async () => {
    const response = await axios.post(
      "http://localhost:" + process.env.PORT + "/graphql",
      {
        query:
          `
      mutation{
        sendMessage(invitedProfile:"` +
          user2ProfileID +
          `",text:"Hi")
        }
    `
      },
      {
        headers: {
          Authorization: "Bearer " + user1token
        }
      }
    );
    expect(response.data.data.sendMessage).toBeTruthy();
  });

  test("getInbox", async () => {
    const response = await axios.post(
      "http://localhost:" + process.env.PORT + "/graphql",
      {
        query: `
      query{
        getInbox(limit: 1, skip: 0){chatID}
        }
    `
      },
      {
        headers: {
          Authorization: "Bearer " + user2token
        }
      }
    );

    expect(response.data.data.getInbox[0].chatID).toBeTruthy();
    chatID = response.data.data.getInbox[0].chatID;
  });

  test("double send", async () => {
    const response = await axios.post(
      "http://localhost:" + process.env.PORT + "/graphql",
      {
        query:
          `
      mutation{
        sendMessage(invitedProfile:"` +
          user2ProfileID +
          `",text:"Hi")
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
        sendMessage: null
      }
    });
  });

  test("open chat", async () => {
    const response = await axios.post(
      "http://localhost:" + process.env.PORT + "/graphql",
      {
        query:
          `
      query{
        getMessages(chatID:"` +
          chatID +
          `", limit:1) {
          id
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

    expect(response.data).toMatchObject({
      data: {
        getMessages: {
          id: chatID
        }
      }
    });
  });

  test("respond to message", async () => {
    const response = await axios.post(
      "http://localhost:" + process.env.PORT + "/graphql",
      {
        query:
          `
      mutation{
        sendMessage(chatID:"` +
          chatID +
          `",text:"Hello")
        }
    `
      },
      {
        headers: {
          Authorization: "Bearer " + user2token
        }
      }
    );

    expect(response.data.data.sendMessage).toBeTruthy();
  });

  test("remove self user 1", async () => {
    const response = await axios.post(
      "http://localhost:" + process.env.PORT + "/graphql",
      {
        query:
          `
      mutation{
        removeSelf(chatID:"` +
          chatID +
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
    expect(response.data.data.removeSelf).toBeTruthy();
  });

  test("remove self user 2", async () => {
    const response = await axios.post(
      "http://localhost:" + process.env.PORT + "/graphql",
      {
        query:
          `
      mutation{
        removeSelf(chatID:"` +
          chatID +
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

    expect(response.data.data.removeSelf).toBeTruthy();
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
