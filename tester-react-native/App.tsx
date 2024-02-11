import { StyleSheet, Text, View } from "react-native";
import { installInterceptor, createMockServer } from "..";
import { useEffect, useState } from "react";
import axios from "axios";

installInterceptor();

const mockServer = createMockServer("https://test.com", {
  // options specified here will apply to all handlers
  delayMs: 100, // view your loading states
  persistent: true, // allow handlers to respond to multiple matching requests
});

mockServer.get("/", "mocked response");

export default function App() {
  return (
    <View style={styles.container}>
      <Fetch />
      <Axios />
    </View>
  );
}

const Fetch = () => {
  const [data, setData] = useState("fetching");
  useEffect(() => {
    // Reminder: you shouldn't do fetch like that in a real app
    (async () => {
      const response = await fetch("https://test.com");
      const text = await response.text();
      setData(text);
    })();
  }, []);

  return <Text>{"fetch: " + data}</Text>;
};

const Axios = () => {
  const [data, setData] = useState("fetching");
  useEffect(() => {
    // Reminder: you shouldn't do fetch like that in a real app
    (async () => {
      const response = await axios.get("https://test.com");
      setData(response.data);
    })();
  }, []);

  return <Text>{"axios: " + data}</Text>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
});
