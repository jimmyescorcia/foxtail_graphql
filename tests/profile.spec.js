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
  user1LinkCode;

global.XMLHttpRequest = XMLHttpRequest;

beforeAll(async () => {
  const response = await axios.post(
    "http://localhost:" + process.env.PORT + "/graphql",
    {
      query: `
    mutation{
      createUser(email:"pro1@test.com",username:"Chris",phone:"1234567899",
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
        generateCode
        getMyProfile{
             id
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

  user1ProfileID = response2.data.data.getMyProfile.id;
  user1LinkCode = response2.data.data.generateCode;

  const response3 = await axios.post(
    "http://localhost:" + process.env.PORT + "/graphql",
    {
      query: `
    mutation{
      createUser(email:"pro2@test.com",username:"Chassy",phone:"1234567897",
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
        generateCode
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

describe("profile resolvers", () => {
  // test("search profiles", async () => {
  //   const response = await axios.post(
  //     "http://localhost:" + process.env.PORT + "/graphql",
  //     {
  //       query: `
  //       query{
  //         searchProfiles(long:-174.00,lat:89.00, skip:0,limit:2,distance:100,ageRange:[18,80],interestedIn:["M","F"]){
  //           profiles{id}
  //          }
  //         }
  //   `
  //     },
  //     {
  //       headers: {
  //         Authorization: "Bearer " + user1token
  //       }
  //     }
  //   );
  //   expect(response.data).toMatchObject({
  //     data: {
  //       searchProfiles: {
  //         profiles: []
  //       }
  //     }
  //   });

  //   const response2 = await axios.post(
  //     "http://localhost:" + process.env.PORT + "/graphql",
  //     {
  //       query: `
  //       query{
  //         searchProfiles(long:-174.00,lat:89.00, skip:0,limit:2,distance:100,ageRange:[18,80],interestedIn:["M","F"]){
  //           profiles{id}
  //          }
  //         }
  //   `
  //     },
  //     {
  //       headers: {
  //         Authorization: "Bearer " + user2token
  //       }
  //     }
  //   );
  //   expect(response2.data).toMatchObject({
  //     data: {
  //       searchProfiles: {
  //         profiles: [
  //           {
  //             id: user1ProfileID
  //           }
  //         ]
  //       }
  //     }
  //   });

  //   //TODO: finish out of bounds
  //   // const response3 = await axios.post(
  //   //   'http://localhost:'+process.env.PORT+'/graphql',
  //   //   {
  //   //     query: `
  //   //     mutation{
  //   //       searchProfiles(long:-10.00,lat:10.00) {
  //   //         id
  //   //       }
  //   //       }
  //   //   `,
  //   //   },
  //   //   {
  //   //     headers: {
  //   //       'Authorization': 'Bearer '+ user1token,
  //   //     },
  //   //   },
  //   // );
  //   // expect(response3.data).toMatchObject({
  //   //   data: {
  //   //     "searchProfiles": [],
  //   //   },
  // });

  test("like profile", async () => {
    const response = await axios.post(
      "http://localhost:" + process.env.PORT + "/graphql",
      {
        query:
          `
      mutation{
        likeProfile(toProfileID:"` +
          user2ProfileID +
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
        likeProfile: "like"
      }
    });
  });
  test("link profile", async () => {
    const response = await axios.post(
      "http://localhost:" + process.env.PORT + "/graphql",
      {
        query:
          `
      mutation{
        linkProfile(code:"` +
          user1LinkCode +
          `") {
            partnerName
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
        linkProfile: {
          partnerName: "Chris"
        }
      }
    });
  });
  test("reject profile", async () => {
    const response = await axios.post(
      "http://localhost:" + process.env.PORT + "/graphql",
      {
        query:
          `
        mutation{
          rejectProfile(rejectedProfileID:"` +
          user1ProfileID +
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
        rejectProfile: true
      }
    });
  });

  test("block profile", async () => {
    const response = await axios.post(
      "http://localhost:" + process.env.PORT + "/graphql",
      {
        query:
          `
        mutation{
          blockProfile(blockedProfileID:"` +
          user1ProfileID +
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
        blockProfile: true
      }
    });
  });

  test("toggle online", async () => {
    const response = await axios.post(
      "http://localhost:" + process.env.PORT + "/graphql",
      {
        query: `
        mutation{toggleOnline(online:false)}

    `
      },
      {
        headers: {
          Authorization: "Bearer " + user2token
        }
      }
    );
    expect(response.data.data.toggleOnline).toBeTruthy();

    const response2 = await axios.post(
      "http://localhost:" + process.env.PORT + "/graphql",
      {
        query: `
        query{
          getMyProfile{online}
        }
    `
      },
      {
        headers: {
          Authorization: "Bearer " + user2token
        }
      }
    );
    expect(response2.data.data.getMyProfile.online).toBeFalsy();
  });
});
afterAll(async () => {
  await axios.post(
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

  await axios.post(
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
