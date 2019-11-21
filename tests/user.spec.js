import axios from "axios";
import { XMLHttpRequest } from "xmlhttprequest";
if (process.env.NODE_ENV === "development") {
  require("dotenv").config();
}
global.XMLHttpRequest = XMLHttpRequest;
jest.setTimeout(30000);
let user1token, user1ID, user1loginToken;

describe("user resolvers", () => {
  test("create and login user", async () => {
    const response = await axios.post(
      "http://localhost:" + process.env.PORT + "/graphql",
      {
        query: `
      mutation{
        createUser(email:"user1@test.com",username:"Chris",phone:"1234562345",
      gender:"M",interestedIn:"F",dob:"10/10/2000",
     ){
        token
          }
            }
      `
      }
    );
    const { data } = response.data;
    user1token = data.createUser[0].token;

    const response3 = await axios.post(
      "http://localhost:" + process.env.PORT + "/graphql",
      {
        query: `
          query{
              currentuser {
                userID
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
        currentuser: { userID: userID1 }
      }
    } = response3.data;
    user1ID = userID1;

    expect(response3.data).toMatchObject({
      data: {
        currentuser: {
          userID: user1ID
        }
      }
    });
  });

  // test("read and update settings", async () => {
  //   let response = await axios.post(
  //     "http://localhost:" + process.env.PORT + "/graphql",
  //     {
  //       query: `
  //       query {
  //         getSettings {
  //           distance
  //           distanceMetric
  //           ageRange
  //           lang
  //           interestedIn
  //           city
  //           visible
  //           newMsgNotify
  //           emailNotify
  //           showOnline
  //           likedOnly
  //           vibrateNotify
  //           profilePic
  //           profilePicUrl
  //           couplePartner
  //           includeMsgs
  //           lastActive
  //           users {
  //             username
  //             verifications {
  //               photoVer {
  //                 active
  //               }
  //               stdVer {
  //                 active
  //               }
  //             }
  //           }
  //           photos {
  //             url
  //             private
  //             key
  //             id
  //           }
  //           about
  //           desires
  //         }
  //       }
  //   `
  //     },
  //     {
  //       headers: {
  //         Authorization: "Bearer " + user1token
  //       }
  //     }
  //   );
  //   let settings2 = response.data.data.getSettings;

  //   await axios.post(
  //     "http://localhost:" + process.env.PORT + "/graphql",
  //     {
  //       query: `
  //       mutation {
  //         updateSettings(
  //           long:117.00
  //           lat:34.00
  //           distance: 50
  //           distanceMetric: "ki"
  //           ageRange: [20,40]
  //           lang: "fr"
  //           about: "OK I like rocks"
  //         )
  //       }
  //   `
  //     },
  //     {
  //       headers: {
  //         Authorization: "Bearer " + user1token
  //       }
  //     }
  //   );

  //   const updatedSettings = await axios.post(
  //     "http://localhost:" + process.env.PORT + "/graphql",
  //     {
  //       query: `
  //       query {
  //         getSettings {
  //           distance
  //           distanceMetric
  //           ageRange
  //           lang
  //           interestedIn
  //           city
  //           visible
  //           newMsgNotify
  //           emailNotify
  //           showOnline
  //           likedOnly
  //           vibrateNotify
  //           profilePic
  //           profilePicUrl
  //           couplePartner
  //           includeMsgs
  //           lastActive
  //           users {
  //             username
  //             verifications {
  //               photoVer {
  //                 active
  //               }
  //               stdVer {
  //                 active
  //               }
  //             }
  //           }
  //           photos {
  //             url
  //             private
  //             key
  //             id
  //           }
  //           about
  //           desires
  //         }
  //       }
  //   `
  //     },
  //     {
  //       headers: {
  //         Authorization: "Bearer " + user1token
  //       }
  //     }
  //   );

  //   settings2 = {
  //     long: 117.0,
  //     lat: 34.0,
  //     distance: 50,
  //     distanceMetric: "ki",
  //     ageRange: [20, 40],
  //     lang: "fr",
  //     about: "OK I like rocks",
  //     ...settings2
  //   };

  //   expect(settings2).toMatchObject(updatedSettings.data.data.getSettings);
  // });

  test("submit profileReview", async () => {
    const response = await axios.post(
      "http://localhost:" + process.env.PORT + "/graphql",
      {
        query: `
      mutation{
        submitPhoto(type:"std" image:"myphoto.jpg")
      }
    `
      },
      {
        headers: {
          Authorization: "Bearer " + user1token
        }
      }
    );

    const { submitPhoto } = response.data.data;
    expect(submitPhoto).toBeTruthy();
  });

  test("remove user", async () => {
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

    expect(response.data).toMatchObject({
      data: {
        deleteUser: true
      }
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
  });
});
