const runtimeServerUrl =
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : "http://localhost:8000";

export const ServerUrl = import.meta.env.VITE_SERVER_URL || runtimeServerUrl;
