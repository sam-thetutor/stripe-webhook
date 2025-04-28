import { Actor, HttpAgent } from "@dfinity/agent";
import { Ed25519KeyIdentity } from "@dfinity/identity";
import dotenv from "dotenv";
dotenv.config();

//create identity from private key

const createIdentity = () => {
  let privateKey = process.env.INTERNET_COMPUTER_PRIVATE_KEY;
  console.log(privateKey);
  //clear the key
  const privateKeyDer = privateKey
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\\n/g, "")
    .trim();
  const privateKeyBuffer = Buffer.from(privateKeyDer, "base64").slice(16, 48);

  //create identity
  let _identity = Ed25519KeyIdentity.fromSecretKey(privateKeyBuffer);
  console.log("identity:", _identity.getPrincipal()?.toString());
  //create agent
  let _agent = new HttpAgent({
    identity: _identity,
    host: "https://icp0.io",
  });
  return _agent;
};

export const createActor = (canisterId, idlFactory) => {
  let agent = createIdentity();
  return Actor.createActor(idlFactory, {
    agent,
    canisterId,
  });
};
