// Colors follow the Cerqueira Labs design system tokens. The token name is
// noted next to each value; change the tokens, not the hex values.
const shared = {
  success: { main: "#28C98B" }, // status-success
  warning: { main: "#F2B84B" }, // status-warning
  error: { main: "#F06464", contrastText: "#070B12" }, // status-error / on-bright
  appBar: { background: "#070B12" }, // Midnight Graphite
  queue: { fallback: "#768498" },
  focusRing: "#17889A",
  chart: ["#3478F6", "#35C2D6", "#7158E8", "#D6B98C", "#96A3B5"],
};

const palette = {
  light: {
    ...shared,
    primary: {
      main: "#2A68DE", // action-primary
      dark: "#2158C7", // action-primary-hover
      contrastText: "#FFFFFF", // on-action
    },
    secondary: {
      main: "#526176", // text-secondary
      dark: "#253044",
    },
    text: {
      primary: "#111827",
      secondary: "#526176",
      link: "#2158C7",
    },
    divider: "#E8ECF2", // border-subtle
    border: { strong: "#768498" },
    background: {
      default: "#F3F6FA", // bg-primary
      paper: "#FFFFFF", // bg-surface
      chat: "#F3F6FA",
    },
    action: { selected: "#E8ECF2", hover: "rgba(42, 104, 222, 0.06)" },
    cards: { background: "#FFFFFF" },
    scrollbar: { thumb: "rgba(17, 24, 39, .16)" },
    userMessage: { main: "#DCE9FF" },
    contactMessage: { main: "#FFFFFF" },
    timestamp: { background: "#E8ECF2" },
  },
  dark: {
    ...shared,
    focusRing: "#35C2D6",
    primary: {
      main: "#2A68DE",
      dark: "#2158C7",
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#96A3B5",
      dark: "#9BA8BA",
    },
    text: {
      primary: "#F3F6FA",
      secondary: "#96A3B5",
      link: "#8FB4FF",
    },
    divider: "#253044",
    border: { strong: "#9BA8BA" },
    background: {
      default: "#070B12",
      paper: "#111827",
      chat: "#070B12",
    },
    action: { selected: "#253044", hover: "rgba(143, 180, 255, 0.08)" },
    cards: { background: "#111827" },
    scrollbar: { thumb: "hsla(0, 0%, 100%, .16)" },
    userMessage: { main: "#12306F" },
    contactMessage: { main: "#253044" },
    timestamp: { background: "#253044" },
  },
};

export default palette;
