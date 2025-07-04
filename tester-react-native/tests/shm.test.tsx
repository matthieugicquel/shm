import axios from "axios";
import { mockServer } from "./mockServer";

test("with fetch", async () => {
  mockServer.get("/test", {
    message: "Hello, world!",
  });
  const response = await fetch("https://test.com/test");
  expect(response.status).toBe(200);
  expect(response.json()).resolves.toEqual({ message: "Hello, world!" });
});

test("with axios", async () => {
  mockServer.get("/test", {
    message: "Hello, world!",
  });

  const response = await axios.get("https://test.com/test");

  expect(response.status).toBe(200);
  expect(response.data).toEqual({ message: "Hello, world!" });
});
