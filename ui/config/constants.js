import SentimentNeutralOutlinedIcon from "@mui/icons-material/SentimentNeutralOutlined";
import SentimentSatisfiedOutlinedIcon from "@mui/icons-material/SentimentSatisfiedOutlined";
import SentimentVerySatisfiedOutlinedIcon from "@mui/icons-material/SentimentVerySatisfiedOutlined";

export const SALT = "SALT_0x1234567890ABCDEF";

export const API_URL = "https://api.colorfulnotion.com/intents";

export const IS_TEST = true;

export const DeadlineData = [
  {
    index: 0,
    label: "Auto",
    time: "< 5 min",
    icon: <SentimentSatisfiedOutlinedIcon />,
    gas: "estimated gas",
    timestamp: 300,
    fee: 0.03,
  },

  {
    index: 1,
    label: "Blazing Fast",
    time: "< 1 min",
    icon: <SentimentVerySatisfiedOutlinedIcon />,
    gas: "estimated gas",
    timestamp: 60,
    fee: 0.05,
  },

  {
    index: 2,
    label: "Economy",
    time: "5-10 min",
    icon: <SentimentNeutralOutlinedIcon />,
    gas: "estimated gas",
    timestamp: 600,
    fee: 0.01,
  },
];
